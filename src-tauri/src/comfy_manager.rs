    pub async fn generate_image(
        &self,
        prompt: String,
        negative_prompt: String,
        checkpoint: String,
        steps: u32,
        cfg: f32,
        seed: i64,
        model_type: String, // "sd15" or "sdxl"
    ) -> Result<Value, String> {
        if !self.test_connection().await.unwrap_or(false) {
            return Err("ComfyUI is not running".to_string());
        }

        let port = self.port;

        // Choose workflow based on model type
        let (width, height) = if model_type == "sd15" {
            (512, 768) // Good default for SD 1.5
        } else {
            (1024, 1024) // Better default for SDXL
        };

        let workflow = json!({
            "1": { "inputs": { "ckpt_name": checkpoint }, "class_type": "CheckpointLoaderSimple" },
            "2": { "inputs": { "text": prompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
            "3": { "inputs": { "text": negative_prompt, "clip": ["1", 1] }, "class_type": "CLIPTextEncode" },
            "4": { "inputs": { "width": width, "height": height, "batch_size": 1 }, "class_type": "EmptyLatentImage" },
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
            "6": { "inputs": { "samples": ["5", 0], "vae": ["1", 2] }, "class_type": "VAEDecode" },
            "7": { "inputs": { "filename_prefix": "mandingoforge", "images": ["6", 0] }, "class_type": "SaveImage" }
        });

        let client = reqwest::Client::new();
        let res = client.post(format!("http://127.0.0.1:{}/prompt", port))
            .json(&json!({ "prompt": workflow }))
            .send()
            .await
            .map_err(|e| format!("Failed to contact ComfyUI: {}", e))?;

        if res.status().is_success() {
            res.json::<Value>().await.map_err(|e| e.to_string())
        } else {
            Err(format!("ComfyUI error: {}", res.status()))
        }
    }
