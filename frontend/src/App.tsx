  // Generation state
  const [prompt, setPrompt] = useState('');
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [modelType, setModelType] = useState<'sd15' | 'sdxl'>('sdxl'); // default to SDXL
  const [steps, setSteps] = useState(20);
  const [cfg, setCfg] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [generating, setGenerating] = useState(false);
