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
    python_path: Arc<Mutex<PathBuf>>,   // NEW: Custom Python executable
}

impl ComfyManager {
    pub fn new() -> Self {
        let default_comfy = PathBuf::from("../comfyui");
        let comfy_path = if let Ok(saved) = fs::read_to_string(".comfyui_path") {
            let p = PathBuf::from(saved.trim());
            if p.join("main.py").exists() { p } else { default_comfy }
        } else {
            default_comfy
        };

        // Load custom python path if saved
        let default_python = PathBuf::from(if cfg!(windows) { "python.exe" } else { "python3" });
        let python_path = if let Ok(saved) = fs::read_to_string(".python_path") {
            PathBuf::from(saved.trim())
        } else {
            default_python
        };

        Self {
            child: Arc::new(Mutex::new(None)),
            port: 8188,
            comfy_path: Arc::new(Mutex::new(comfy_path)),
            python_path: Arc::new(Mutex::new(python_path)),
        }
    }

    // === ComfyUI Path ===
    pub async fn get_comfy_path(&self) -> PathBuf {
        self.comfy_path.lock().await.clone()
    }

    pub async fn set_comfy_path(&self, new_path: String) -> Result<String, String> {
        let path = PathBuf::from(new_path.trim());
        if !path.join("main.py").exists() {
            return Err(format!("Invalid ComfyUI path. Could not find main.py at: {}", path.display()));
        }
        *self.comfy_path.lock().await = path.clone();
        let _ = fs::write(".comfyui_path", path.to_string_lossy().as_ref());
        Ok(format!("ComfyUI path set to: {}", path.display()))
    }

    // === Python Path ===
    pub async fn get_python_path(&self) -> PathBuf {
        self.python_path.lock().await.clone()
    }

    pub async fn set_python_path(&self, new_path: String) -> Result<String, String> {
        let path = PathBuf::from(new_path.trim());
        // Basic validation - check if file exists and is executable-ish
        if !path.exists() {
            return Err(format!("Python executable not found at: {}", path.display()));
        }
        *self.python_path.lock().await = path.clone();
        let _ = fs::write(".python_path", path.to_string_lossy().as_ref());
        Ok(format!("Python executable set to: {}", path.display()))
    }

    // === Create Virtual Environment (NEW - stress free setup) ===
    pub async fn create_virtual_environment(&self, target_dir: String) -> Result<String, String> {
        let target = PathBuf::from(target_dir.trim());

        if target.exists() {
            return Err("Target folder already exists. Please choose an empty folder or delete it first.".to_string());
        }

        // Use system python to create venv
        let python_cmd = if cfg!(windows) { "python" } else { "python3" };

        let output = Command::new(python_cmd)
            .arg("-m")
            .arg("venv")
            .arg(&target)
            .output()
            .await
            .map_err(|e| format!("Failed to create virtual environment: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to create venv:\n{}", stderr));
        }

        // Determine python executable inside the new venv
        let venv_python = if cfg!(windows) {
            target.join("Scripts").join("python.exe")
        } else {
            target.join("bin").join("python")
        };

        if !venv_python.exists() {
            return Err("Virtual environment created but python executable not found inside it.".to_string());
        }

        // Save it as the active python path
        *self.python_path.lock().await = venv_python.clone();
        let _ = fs::write(".python_path", venv_python.to_string_lossy().as_ref());

        Ok(format!(
            "Virtual environment created successfully at: {}\nPython set to: {}",
            target.display(),
            venv_python.display()
        ))
    }

    // === Start ComfyUI with custom Python ===
    pub async fn start(&self) -> Result<String, String> {
        let mut child_guard = self.child.lock().await;
        if child_guard.is_some() {
            return Ok("ComfyUI is already running".to_string());
        }

        let comfy_path = self.get_comfy_path().await;
        let python_path = self.get_python_path().await;
        let main_py = comfy_path.join("main.py");

        if !main_py.exists() {
            return Err(format!("ComfyUI not found at: {}. Set correct path in Settings.", comfy_path.display()));
        }

        // Use custom python if set, otherwise fall back
        let python_cmd = if python_path.exists() {
            python_path.to_string_lossy().to_string()
        } else {
            if cfg!(windows) { "python.exe".to_string() } else { "python3".to_string() }
        };

        let mut cmd = Command::new(&python_cmd);
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
                Ok(format!(
                    "ComfyUI ignited on port {} (PID: {:?})\nUsing Python: {}",
                    self.port, pid, python_cmd
                ))
            }
            Err(e) => Err(format!("Failed to start ComfyUI: {}. Check your Python path in Settings.", e)),
        }
    }

    pub async fn stop(&self) -> Result<String, String> { /* unchanged */ 
        let mut child_guard = self.child.lock().await;
        if let Some(mut child) = child_guard.take() {
            let _ = child.kill().await;
            let _ = child.wait().await;
            Ok("ComfyUI engine shut down cleanly.".to_string())
        } else {
            Ok("ComfyUI was not running.".to_string())
        }
    }

    pub async fn get_status(&self) -> ComfyStatus {
        let child_guard = self.child.lock().await;
        let running = child_guard.is_some();
        ComfyStatus {
            running,
            port: self.port,
            pid: if running { child_guard.as_ref().and_then(|c| c.id()) } else { None },
        }
    }

    pub async fn test_connection(&self) -> Result<bool, String> { /* unchanged */ 
        let url = format!("http://127.0.0.1:{}/system_stats", self.port);
        match reqwest::get(&url).await {
            Ok(resp) => Ok(resp.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    // generate_image and get_queue remain the same...
    pub async fn generate_image(&self, prompt: String, negative_prompt: String, checkpoint: String, steps: u32, cfg: f32, seed: i64) -> Result<Value, String> {
        if !self.test_connection().await.unwrap_or(false) {
            return Err("ComfyUI engine is not running. Click IGNITE THE FORGE first.".to_string());
        }
        let port = self.port;
        let workflow = json!({
            "1": { "inputs": { "ckpt_name": checkpoint }, "class_type": "CheckpointLoaderSimple" },
            "2": { "inputs": { "text": prompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
            "3": { "inputs": { "text": negative_prompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
            "4": { "inputs": { "width": 512, "height": 768, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
            "5": { "inputs": { "seed": seed, "steps": steps, "cfg": cfg, "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0, "model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0] }, "class_type": "KSampler" },
            "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
            "7": { "inputs": { "filename_prefix": "mandingoforge_output", "images": ["6", 0] }, "class_type": "SaveImage" }
        });
        let client = reqwest::Client::new();
        let res = client.post(format!("http://127.0.0.1:{}/prompt", port)).json(&json!({ "prompt": workflow })).send().await;
        match res {
            Ok(r) if r.status().is_success() => Ok(r.json().await.unwrap_or_default()),
            Ok(r) => Err(format!("ComfyUI error: {}", r.status())),
            Err(e) => Err(e.to_string()),
        }
    }

    pub async fn get_queue(&self) -> Result<Value, String> {
        let url = format!("http://127.0.0.1:{}/queue", self.port);
        reqwest::get(&url).await?.json::<Value>().await.map_err(|e| e.to_string())
    }
}
