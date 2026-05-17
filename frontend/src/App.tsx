  async function handleGenerate() {
    if (!prompt.trim() || !selectedCheckpoint) {
      setMessage("Please enter a prompt and select a model");
      return;
    }

    setGenerating(true);
    setMessage("");

    try {
      await invoke("generate_image", {
        prompt: prompt,
        negativePrompt: "low quality, bad anatomy, deformed", // camelCase for Tauri v2
        checkpoint: selectedCheckpoint,
        steps: steps,
        cfg: cfg,
        seed: seed,
        modelType: modelType, // camelCase for Tauri v2
      });

      setMessage("Generation started! Check the output folder.");
    } catch (err: any) {
      setMessage(`Error: ${err}`);
    }

    setGenerating(false);
  }
