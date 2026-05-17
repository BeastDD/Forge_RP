use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use std::process::Stdio;
use std::path::PathBuf;
use serde::Serialize;
use serde_json::{json, Value};
use std::fs;

#[derive(Debug, Serialize, Clone)]
pub struct ComfyStatus {
    pub running: bool,
    pub port: u16,
    pub pid: Option<u32>,
}

pub struct ComfyManager {
    child: Arc<Mutex<Option<Child>>>,
    port: u16,
    comfy_path: Arc<Mutex<PathBuf>>,
    python_path: Arc<Mutex<PathBuf>>,
}

impl ComfyManager {
    pub fn new() -> Self {
        let default_comfy = PathBuf::from("../comfyui");
        let comfy_path = if let Ok(saved) = fs::read_to_string(".comfyui_path") {
            let p = PathBuf::from(saved.trim());
            if p.join("main.py").exists() { p } else { default_comfy }
        } else { default_comfy };

        let default_python = PathBuf::from(if cfg!(windows) { "python.exe" } else { "python3" });
        let python_path = if let Ok(saved) = fs::read_to_string(".python_path") {
            PathBuf::from(saved.trim())
        } else { default_python };

        Self {
            child: Arc::new(Mutex::new(None)),
            port: 8188,
            comfy_path: Arc::new(Mutex::new(comfy_path)),
            python_path: Arc::new(Mutex::new(python_path)),
        }
    }

    pub async fn get_comfy_path(&self) -> PathBuf { self.comfy_path.lock().await.clone() }
    pub async fn set_comfy_path(&self, new_path: String) -> Result<String, String> {
        let path = PathBuf::from(new_path.trim());
        if !path.join("main.py").exists() { return Err(format!("Invalid ComfyUI path: {}", path.display())); }
        *self.comfy_path.lock().await = path.clone();
        let _ = fs::write(".comfyui_path", path.to_string_lossy().as_ref());
        Ok(format!("ComfyUI path set to: {}", path.display()))
    }

    pub async fn get_python_path(&self) -> PathBuf { self.python_path.lock().await.clone() }
    pub async fn set_python_path(&self, new_path: String) -> Result<String, String> {
        let path = PathBuf::from(new_path.trim());
        if !path.exists() { return Err(format!("Python not found: {}", path.display())); }
        *self.python_path.lock().await = path.clone();
        let _ = fs::write(".python_path", path.to_string_lossy().as_ref());
        Ok(format!("Python set to: {}", path.display()))
    }

    // List checkpoints by auto-detecting from ComfyUI path
    pub async fn list_checkpoints(&self) -> Result<Vec<String>, String> {
        let comfy_path = self.get_comfy_path().await;
        let checkpoints_dir = comfy_path.join("models").join("checkpoints");

        if !checkpoints_dir.exists() {
            return Err(format!("Checkpoints folder not found at: {}", checkpoints_dir.display()));
        }

        let mut models = Vec::new();
        if let Ok(entries) = fs::read_dir(&checkpoints_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(ext) = path.extension() {
                        if ext == "safetensors" || ext == "ckpt" || ext == "pt" {
                            if let Some(name) = path.file_name() {
                                models.push(name.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
        models.sort();
        Ok(models)
    }

    pub async fn generate_image(
        &self,
        prompt: String,
        negative_prompt: String,
        checkpoint: String,
        steps: u32,
        cfg: f32,
        seed: i64,
    ) -> Result<Value, String> {
        if !self.test_connection().await.unwrap_or(false) {
            return Err("ComfyUI is not running".to_string());
        }

        let port = self.port;

        let workflow = json!({
            "1": {
                "inputs": { "ckpt_name": checkpoint },
                "class_type": "CheckpointLoaderSimple"
            },
            "2": {
                "inputs": { "text": prompt, "clip": ["1", 1] },
                "class_type": "CLIPTextEncode"
            },
            "3": {
                "inputs": { "text": negative_prompt, "clip": ["1", 1] },
                "class_type": "CLIPTextEncode"
            },
            "4": {
                "inputs": { "width": 512, "height": 768, "batch_size": 1 },
                "class_type": "EmptyLatentImage"
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
                "class_type": "KSampler"
            },
            "6": {
                "inputs": { "samples": ["5", 0], "vae": ["1", 2] },
                "class_type": "VAEDecode"
            },
            "7": {
                "inputs": { "filename_prefix": "mandingoforge", "images": ["6", 0] },
                "class_type": "SaveImage"
            }
        });

        let client = reqwest::Client::new();
        let payload = json!({ "prompt": workflow });
        let url = format!("http://127.0.0.1:{}/prompt", port);

        let response = client.post(&url).json(&payload).send().await
            .map_err(|e| format!("Failed to send to ComfyUI: {}", e))?;

        if response.status().is_success() {
            response.json::<Value>().await.map_err(|e| e.to_string())
        } else {
            Err(format!("ComfyUI error: {}", response.status()))
        }
    }

    pub async fn start(&self) -> Result<String, String> { /* ... existing start code ... */ 
        let mut child_guard = self.child.lock().await;
        if child_guard.is_some() { return Ok("ComfyUI already running".to_string()); }

        let comfy_path = self.get_comfy_path().await;
        let python_path = self.get_python_path().await;

        if !comfy_path.join("main.py").exists() {
            return Err("ComfyUI main.py not found".to_string());
        }

        let py = if python_path.exists() { python_path.to_string_lossy().to_string() } else { "python".to_string() };

        let mut cmd = Command::new(&py);
        cmd.arg("main.py")
            .arg("--listen").arg("127.0.0.1").arg("--port").arg(self.port.to_string())
            .arg("--disable-auto-launch")
            .current_dir(&comfy_path)
            .stdout(Stdio::piped()).stderr(Stdio::piped());

        match cmd.spawn() {
            Ok(child) => { *child_guard = Some(child); Ok(format!("ComfyUI started using: {}", py)) }
            Err(e) => Err(format!("Failed to start: {}", e)),
        }
    }

    pub async fn stop(&self) -> Result<String, String> { /* existing */ 
        let mut child_guard = self.child.lock().await;
        if let Some(mut child) = child_guard.take() {
            let _ = child.kill().await;
            Ok("Stopped".to_string())
        } else { Ok("Not running".to_string()) }
    }

    pub async fn get_status(&self) -> ComfyStatus {
        ComfyStatus { running: self.child.lock().await.is_some(), port: self.port, pid: None }
    }

    pub async fn test_connection(&self) -> Result<bool, String> {
        match reqwest::get(format!("http://127.0.0.1:{}/system_stats", self.port)).await {
            Ok(r) => Ok(r.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    pub async fn get_queue(&self) -> Result<Value, String> {
        let url = format!("http://127.0.0.1:{}/queue", self.port);
        match reqwest::get(&url).await {
            Ok(resp) => resp.json::<Value>().await.map_err(|e| e.to_string()),
            Err(e) => Err(e.to_string()),
        }
    }
}
