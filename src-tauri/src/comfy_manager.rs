
// Recursive helper to collect all model files
fn collect_models_recursive(dir: &PathBuf, models: &mut Vec<String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_models_recursive(&path, models);
            } else if path.is_file() {
                if let Some(ext) = path.extension() {
                    let ext_str = ext.to_string_lossy().to_lowercase();
                    if ext_str == "safetensors" || ext_str == "ckpt" || ext_str == "pt" {
                        if let Some(name) = path.file_name() {
                            models.push(name.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }
    }
}
