#[tauri::command]
async fn generate_image(
    manager: State<'_, Arc<ComfyManager>>,
    prompt: String,
    negative_prompt: String,
    checkpoint: String,
    steps: u32,
    cfg: f32,
    seed: i64,
    model_type: String
) -> Result<Value, String> {
    manager.generate_image(prompt, negative_prompt, checkpoint, steps, cfg, seed, model_type).await
}
