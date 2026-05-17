    // List checkpoints recursively (including subfolders)
    pub async fn list_checkpoints(&self) -> Result<Vec<String>, String> {
        let comfy_path = self.get_comfy_path().await;
        let checkpoints_dir = comfy_path.join("models").join("checkpoints");

        if !checkpoints_dir.exists() {
            return Err(format!("Checkpoints folder not found at: {}", checkpoints_dir.display()));
        }

        let mut models = Vec::new();
        collect_models_recursive(&checkpoints_dir, &mut models);
        models.sort();
        Ok(models)
    }
