use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use std::process::Stdio;
use std::path::PathBuf;
use serde::Serialize;
use serde_json::{json, Value};

#[derive(Debug, Serialize, Clone)]
pub struct ComfyStatus {
    pub running: bool,
    pub port: u16,
    pub pid: Option<u32>,
}

pub struct ComfyManager {
    child: Arc<Mutex<Option<Child>>>,
    port: u16,
}

impl ComfyManager {
    pub fn new() -> Self {
        Self {
            child: Arc::new(Mutex::new(None)),
            port: 8188,
        }
    }

    pub async fn start(&self) -> Result<String, String> {
        let mut child_guard = self.child.lock().await;
        
        if child_guard.is_some() {
            return Ok("ComfyUI is already running".to_string());
        }

        // Check if comfyui folder exists with main.py
        let comfy_path = PathBuf::from("../comfyui");
        let main_py = comfy_path.join("main.py");
        
        if !main_py.exists() {
            return Err(
                "ComfyUI not found. Please run: git clone https://github.com/comfyanonymous/ComfyUI.git ../comfyui && cd ../comfyui && pip install -r requirements.txt".to_string()
            );
        }

        // Spawn ComfyUI (headless, no auto browser launch)
        let mut cmd = Command::new("python");
        cmd.arg("main.py")
            .arg("--listen")
            .arg("127.0.0.1")
            .arg("--port")
            .arg(self.port.to_string())
            .arg("--disable-auto-launch")
            .current_dir(&comfy_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        match cmd.spawn() {
            Ok(child) => {
                let pid = child.id();
                *child_guard = Some(child);
                Ok(format!("ComfyUI ignited on port {} (PID: {:?})", self.port, pid))
            }
            Err(e) => Err(format!("Failed to start ComfyUI: {}. Make sure Python is in PATH and ComfyUI deps are installed.", e)),
        }
    }

    pub async fn stop(&self) -> Result<String, String> {
        let mut child_guard = self.child.lock().await;
        
        if let Some(mut child) = child_guard.take() {
            match child.kill().await {
                Ok(_) => {
                    // Give it a moment to die
                    let _ = child.wait().await;
                    Ok("ComfyUI engine shut down cleanly.".to_string())
                }
                Err(e) => Err(format!("Failed to stop ComfyUI: {}", e)),
            }
        } else {
            Ok("ComfyUI was not running.".to_string())
        }
    }

    pub async fn get_status(&self) -> ComfyStatus {
        let child_guard = self.child.lock().await;
        let running = child_guard.is_some();
        let pid = if running {
            child_guard.as_ref().and_then(|c| c.id())
        } else {
            None
        };

        ComfyStatus {
            running,
            port: self.port,
            pid,
        }
    }

    pub async fn test_connection(&self) -> Result<bool, String> {
        let url = format!("http://127.0.0.1:{}/system_stats", self.port);
        
        // Simple health check - ComfyUI has /system_stats or we can use root
        match reqwest::get(&url).await {
            Ok(resp) => {
                if resp.status().is_success() {
                    Ok(true)
                } else {
                    // Try root as fallback
                    let root_url = format!("http://127.0.0.1:{}/", self.port);
                    match reqwest::get(&root_url).await {
                        Ok(r) => Ok(r.status().is_success()),
                        Err(_) => Ok(false),
                    }
                }
            }
            Err(_) => Ok(false),
        }
    }

    /// Sprint 1: Queue a txt2img generation to ComfyUI
    /// Builds a minimal dynamic workflow and sends it via /prompt API
    pub async fn generate_image(
        &self,
        prompt: String,
        negative_prompt: String,
        checkpoint: String,
        steps: u32,
        cfg: f32,
        seed: i64,
    ) -> Result<Value, String> {
        // Ensure engine is reachable
        if !self.test_connection().await.unwrap_or(false) {
            return Err("ComfyUI engine is not running. Click IGNITE THE FORGE first, Boss.".to_string());
        }

        let port = self.port;

        // Build a clean, minimal txt2img workflow (SD1.5 / SDXL compatible)
        // This is the foundation — later sprints will load from workflows/ JSON templates + custom nodes
        let workflow = json!({
            "1": {
                "inputs": {
                    "ckpt_name": checkpoint
                },
                "class_type": "CheckpointLoaderSimple",
                "_meta": {
                    "title": "Load Checkpoint"
                }
            },
            "2": {
                "inputs": {
                    "text": prompt,
                    "clip": ["1", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "Positive Prompt"
                }
            },
            "3": {
                "inputs": {
                    "text": negative_prompt,
                    "clip": ["1", 1]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "Negative Prompt"
                }
            },
            "4": {
                "inputs": {
                    "width": 512,
                    "height": 768,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage",
                "_meta": {
                    "title": "Empty Latent Image"
                }
            },
            "5": {
                "inputs": {
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1.0,
                    "model": ["1", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["4", 0]
                },
                "class_type": "KSampler",
                "_meta": {
                    "title": "KSampler"
                }
            },
            "6": {
                "inputs": {
                    "samples": ["5", 0],
                    "vae": ["1", 2]
                },
                "class_type": "VAEDecode",
                "_meta": {
                    "title": "VAE Decode"
                }
            },
            "7": {
                "inputs": {
                    "filename_prefix": "mandingoforge_output",
                    "images": ["6", 0]
                },
                "class_type": "SaveImage",
                "_meta": {
                    "title": "Save Image to Output"
                }
            }
        });

        let client = reqwest::Client::new();
        let payload = json!({ "prompt": workflow });
        let url = format!("http://127.0.0.1:{}/prompt", port);

        let response = client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Network error sending to ComfyUI: {}", e))?;

        if response.status().is_success() {
            let result: Value = response
                .json()
                .await
                .map_err(|e| format!("Failed to parse ComfyUI response: {}", e))?;
            Ok(result)
        } else {
            let status = response.status();
            let text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            Err(format!("ComfyUI rejected the prompt ({}): {}", status, text))
        }
    }

    /// Simple queue status check (for future progress polling)
    pub async fn get_queue(&self) -> Result<Value, String> {
        let url = format!("http://127.0.0.1:{}/queue", self.port);
        match reqwest::get(&url).await {
            Ok(resp) => {
                if resp.status().is_success() {
                    resp.json::<Value>().await.map_err(|e| e.to_string())
                } else {
                    Err(format!("Queue check failed: {}", resp.status()))
                }
            }
            Err(e) => Err(e.to_string()),
        }
    }
}
