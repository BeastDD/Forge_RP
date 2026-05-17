  async function handleGenerate() {
    if (!prompt.trim() || !selectedCheckpoint) {
      setMessage('Please enter a prompt and select a checkpoint');
      return;
    }

    setGenerating(true);
    setMessage('');

    try {
      const result = await invoke('generate_image', {
        prompt: prompt,
        negative_prompt: 'low quality, bad anatomy, deformed',  // Fixed parameter name
        checkpoint: selectedCheckpoint,
        steps: steps,
        cfg: cfg,
        seed: seed,
        model_type: modelType
      });
      setMessage('Generation started! Check the output folder.');
    } catch (err: any) {
      setMessage(`Generation error: ${err}`);
    }

    setGenerating(false);
  }
