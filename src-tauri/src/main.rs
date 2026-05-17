// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, State};
use std::sync::Arc;
use serde_json::Value;
use crate::comfy_manager::{ComfyManager, ComfyStatus};

mod comfy_manager;

#[tauri::command]
async fn start_comfyui(manager: State<'_, Arc<ComfyManager>>) -> Result<String, String> {
    manager.start().await
}

#[tauri::command]
async fn stop_comfyui(manager: State<'_, Arc<ComfyManager>>) -> Result<String, String> {
    manager.stop().await
}

#[tauri::command]
async fn get_comfy_status(manager: State<'_, Arc<ComfyManager>>) -> Result<ComfyStatus, String> {
    Ok(manager.get_status().await)
}

#[tauri::command]
async fn test_comfy_connection(manager: State<'_, Arc<ComfyManager>>) -> Result<bool, String> {
    manager.test_connection().await
}

#[tauri::command]
async fn generate_image(
    manager: State<'_, Arc<ComfyManager>>,
    prompt: String,
    negative_prompt: String,
    checkpoint: String,
    steps: u32,
    cfg: f32,
    seed: i64,
) -> Result<Value, String> {
    manager.generate_image(prompt, negative_prompt, checkpoint, steps, cfg, seed).await
}

#[tauri::command]
async fn get_comfy_queue(manager: State<'_, Arc<ComfyManager>>) -> Result<Value, String> {
    manager.get_queue().await
}

// ComfyUI Path
#[tauri::command]
async fn get_comfyui_path(manager: State<'_, Arc<ComfyManager>>) -> Result<String, String> {
    Ok(manager.get_comfy_path().await.to_string_lossy().to_string())
}

#[tauri::command]
async fn set_comfyui_path(manager: State<'_, Arc<ComfyManager>>, path: String) -> Result<String, String> {
    manager.set_comfy_path(path).await
}

// Python Environment (NEW)
#[tauri::command]
async fn get_python_path(manager: State<'_, Arc<ComfyManager>>) -> Result<String, String> {
    Ok(manager.get_python_path().await.to_string_lossy().to_string())
}

#[tauri::command]
async fn set_python_path(manager: State<'_, Arc<ComfyManager>>, path: String) -> Result<String, String> {
    manager.set_python_path(path).await
}

#[tauri::command]
async fn create_comfyui_venv(manager: State<'_, Arc<ComfyManager>>, target_dir: String) -> Result<String, String> {
    manager.create_virtual_environment(target_dir).await
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let comfy_manager = Arc::new(ComfyManager::new());
            app.manage(comfy_manager.clone());

            let _window = tauri::WebviewWindowBuilder::new(
                app,
                "mandingoforge-main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("MANDINGOFORGE v1.0")
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .resizable(true)
            .center()
            .build()
            .expect("Failed to create main window");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_comfyui, stop_comfyui, get_comfy_status, test_comfy_connection,
            generate_image, get_comfy_queue,
            get_comfyui_path, set_comfyui_path,
            get_python_path, set_python_path, create_comfyui_venv   // NEW
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
