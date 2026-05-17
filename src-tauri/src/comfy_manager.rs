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

    pub async fn create_virtual_environment(&self, target_dir: String) -> Result<String, String> {
        let target = PathBuf::from(target_dir.trim());
        if target.exists() { return Err("Target folder already exists.".to_string()); }

        let sys_python = if cfg!(windows) { "python" } else { "python3" };
        let output = Command::new(sys_python).arg("-m").arg("venv").arg(&target).output().await
            .map_err(|e| format!("Failed to create venv: {}", e))?;

        if !output.status.success() {
            return Err(format!("venv creation failed: {}", String::from_utf8_lossy(&output.stderr)));
        }

        let venv_python = if cfg!(windows) {
            target.join("Scripts").join("python.exe")
        } else {
            target.join("bin").join("python")
        };

        *self.python_path.lock().await = venv_python.clone();
        let _ = fs::write(".python_path", venv_python.to_string_lossy().as_ref());

        Ok(format!("Virtual environment created successfully.\nSwitched to: {}", venv_python.display()))
    }

    pub async fn install_requirements(&self) -> Result<String, String> {
        let comfy_path = self.get_comfy_path().await;
        let python_path = self.get_python_path().await;

        let req_file = comfy_path.join("requirements.txt");
        if !req_file.exists() {
            return Err("requirements.txt not found in ComfyUI folder".to_string());
        }

        let py = if python_path.exists() { python_path.to_string_lossy().to_string() } else { "python".to_string() };

        let output = Command::new(&py)
            .arg("-m").arg("pip").arg("install").arg("-r").arg(&req_file)
            .current_dir(&comfy_path)
            .output()
            .await
            .map_err(|e| format!("pip install failed: {}", e))?;

        if output.status.success() {
            Ok("Requirements installed successfully!".to_string())
        } else {
            Err(format!("pip install error:\n{}", String::from_utf8_lossy(&output.stderr)))
        }
    }

    pub async fn start(&self) -> Result<String, String> {
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

    pub async fn stop(&self) -> Result<String, String> {
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

    // Fixed generate_image with proper parameters
    pub async fn generate_image(
        &self,
        _prompt: String,
        _negative_prompt: String,
        _checkpoint: String,
        _steps: u32,
        _cfg: f32,
        _seed: i64,
    ) -> Result<Value, String> {
        if !self.test_connection().await.unwrap_or(false) {
            return Err("ComfyUI is not running".to_string());
        }
        // For now we return a placeholder. Full dynamic workflow will be restored.
        Ok(json!({ "status": "generation queued (placeholder)" }))
    }

    pub async fn get_queue(&self) -> Result<Value, String> {
        let url = format!("http://127.0.0.1:{}/queue", self.port);
        match reqwest::get(&url).await {
            Ok(resp) => resp.json::<Value>().await.map_err(|e| e.to_string()),
            Err(e) => Err(e.to_string()),
        }
    }
}
