use std::sync::Arc;
use tokio::process::{Child, Command};
use tokio::sync::Mutex;
use std::process::Stdio;
use std::path::PathBuf;
use tauri::State;
use serde::Serialize;

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
}
