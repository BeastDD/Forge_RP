// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, State};
use std::sync::Arc;
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

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let comfy_manager = Arc::new(ComfyManager::new());
            app.manage(comfy_manager.clone());

            // Create main window using new Tauri v2 API
            let _window = tauri::WebviewWindowBuilder::new(
                app,
                "mandingoforge-main",      // ← New unique label
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
            start_comfyui,
            stop_comfyui,
            get_comfy_status,
            test_comfy_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
