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
        negative_prompt: "low quality, bad anatomy, deformed",
        checkpoint: selectedCheckpoint,
        steps: steps,
        cfg: cfg,
        seed: seed,
        model_type: modelType,
      });

      setMessage("Generation started! Check the output folder.");
    } catch (err: any) {
      setMessage(`Error: ${err}`);
    }

    setGenerating(false);
  }
