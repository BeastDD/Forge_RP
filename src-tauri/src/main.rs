// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, State, WindowBuilder, WindowUrl};
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
async fn get_comfy_status(manager: State<'_, Arc<ComfyManager>>) -> ComfyStatus {
    manager.get_status().await
}

#[tauri::command]
async fn test_comfy_connection(manager: State<'_, Arc<ComfyManager>>) -> Result<bool, String> {
    manager.test_connection().await
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize ComfyManager as managed state
            let comfy_manager = Arc::new(ComfyManager::new());
            app.manage(comfy_manager.clone());

            // Create the main luxurious window
            let _window = WindowBuilder::new(
                app,
                "main",
                WindowUrl::App("index.html".into()),
            )
            .title("MANDINGOFORGE v1.0")
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 600.0)
            .resizable(true)
            .fullscreen(false)
            .center()
            .decorations(true)
            .build()
            .expect("Failed to create main window");

            // Optional: Auto-start ComfyUI on launch? Disabled for Sprint 0 control.
            // You can uncomment if you want engine hot on startup.
            // tokio::spawn(async move {
            //     let _ = comfy_manager.start().await;
            // });

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
