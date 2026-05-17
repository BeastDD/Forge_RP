import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { AnimatePresence } from 'framer-motion';
import { Settings, FolderOpen, Terminal, Download, Image as ImageIcon, Crown } from 'lucide-react';

interface ComfyStatus {
  running: boolean;
  port: number;
}

type View = 'dashboard' | 'generation';

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [status, setStatus] = useState<ComfyStatus>({ running: false, port: 8188 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [showSettings, setShowSettings] = useState(false);
  const [comfyPath, setComfyPath] = useState('');
  const [pythonPath, setPythonPath] = useState('');
  const [pathError, setPathError] = useState('');

  // Generation state
  const [prompt, setPrompt] = useState('');
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [modelType, setModelType] = useState<'sd15' | 'sdxl'>('sdxl');
  const [steps, setSteps] = useState(20);
  const [cfg, setCfg] = useState(7.5);
  const [seed, setSeed] = useState(-1);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const interval = setInterval(fetchStatus, 3000);
    fetchStatus();
    loadPaths();
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const res = await invoke<ComfyStatus>('get_comfy_status');
      setStatus(res);
    } catch (e) {}
  }

  async function loadPaths() {
    try {
      const c = await invoke<string>('get_comfyui_path');
      const p = await invoke<string>('get_python_path');
      setComfyPath(c);
      setPythonPath(p);

      if (c) {
        try {
          const models = await invoke<string[]>('list_checkpoints');
          setCheckpoints(models);
          if (models.length > 0 && !selectedCheckpoint) {
            setSelectedCheckpoint(models[0]);
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  async function handleStart() {
    setLoading(true);
    setMessage('');
    try {
      const result = await invoke<string>('start_comfyui');
      setMessage(result);
      await fetchStatus();
      if (!result.toLowerCase().includes('error')) {
        setTimeout(() => setCurrentView('generation'), 600);
      }
    } catch (err: any) {
      setMessage(`Error: ${err}`);
    }
    setLoading(false);
  }

  async function handleStop() {
    setLoading(true);
    try {
      await invoke('stop_comfyui');
      setCurrentView('dashboard');
      await fetchStatus();
    } catch (err: any) {
      setMessage(`Error: ${err}`);
    }
    setLoading(false);
  }

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
      negative_prompt: "low quality, bad anatomy, deformed", // ← Correct (snake_case)
      checkpoint: selectedCheckpoint,
      steps: steps,
      cfg: cfg,
      seed: seed,
      model_type: modelType, // ← Also snake_case
    });

    setMessage("Generation started! Check the output folder.");
  } catch (err: any) {
    setMessage(`Error: ${err}`);
  }

  setGenerating(false);
  }

  async function pickComfyUIPath() {
    const selected = await open({ directory: true });
    if (selected) {
      try {
        await invoke('set_comfyui_path', { path: selected });
        await loadPaths();
      } catch (e: any) { setPathError(String(e)); }
    }
  }

  async function pickPythonPath() {
    const selected = await open({ directory: false });
    if (selected) {
      try {
        await invoke('set_python_path', { path: selected });
        await loadPaths();
      } catch (e: any) { setPathError(String(e)); }
    }
  }

  async function createVirtualEnvironment() {
    const target = await open({ directory: true });
    if (target) {
      try {
        const result = await invoke<string>('create_comfyui_venv', { targetDir: target });
        setMessage(result);
        await loadPaths();
      } catch (e: any) { setPathError(String(e)); }
    }
  }

  async function installRequirements() {
    try {
      const result = await invoke<string>('install_comfyui_requirements');
      setMessage(result);
    } catch (e: any) { setPathError(String(e)); }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top Navigation */}
      <nav className="border-b border-[#c5a46e]/20 bg-[#111] px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#c5a46e] flex items-center justify-center">
            <Crown className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="font-semibold text-2xl tracking-tight text-[#c5a46e]">MANDINGOFORGE</div>
            <div className="text-xs text-gray-500 -mt-1">v1.0</div>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 border border-[#c5a46e]/30 rounded-xl hover:bg-[#c5a46e]/10">
          <Settings className="w-4 h-4" /> SETTINGS
        </button>
      </nav>

      {/* Dashboard View */}
      {currentView === 'dashboard' && (
        <div className="max-w-4xl mx-auto px-8 pt-16">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-semibold tracking-tighter">Forge. Desire. Create.</h1>
          </div>

          <div className="bg-[#111] border border-[#c5a46e]/20 rounded-3xl p-8 max-w-2xl mx-auto">
            <div className="flex justify-between mb-6">
              <div className="text-xl font-semibold">ComfyUI Engine</div>
              <div className={`px-4 py-1 rounded-full text-sm ${status.running ? 'text-green-400' : 'text-gray-400'}`}>
                {status.running ? 'IGNITED' : 'DORMANT'}
              </div>
            </div>

            <div className="flex gap-4">
              {!status.running ? (
                <button onClick={handleStart} disabled={loading} className="flex-1 py-4 bg-[#c5a46e] text-black rounded-2xl font-semibold">
                  {loading ? 'IGNITING...' : 'IGNITE THE FORGE'}
                </button>
              ) : (
                <button onClick={handleStop} disabled={loading} className="flex-1 py-4 bg-red-600 rounded-2xl font-semibold">
                  {loading ? 'SHUTTING DOWN...' : 'SHUT DOWN ENGINE'}
                </button>
              )}
            </div>

            {message && <div className="mt-6 p-4 bg-[#1a1a1a] rounded-xl text-sm">{message}</div>}
          </div>
        </div>
      )}

      {/* Generation View */}
      {currentView === 'generation' && (
        <div className="max-w-4xl mx-auto px-8 pt-10">
          <div className="flex items-center gap-3 mb-8">
            <ImageIcon className="w-8 h-8 text-[#c5a46e]" />
            <div>
              <div className="text-3xl font-semibold">Image Generation</div>
              <div className="text-gray-400">ComfyUI is running</div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#c5a46e]/20 rounded-3xl p-8 space-y-6">
            <div>
              <div className="text-sm text-gray-400 mb-2">PROMPT</div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-[#1a1a1a] border border-[#c5a46e]/20 rounded-2xl p-4"
                placeholder="Describe what you want to generate..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-2">MODEL TYPE</div>
                <select
                  value={modelType}
                  onChange={(e) => setModelType(e.target.value as 'sd15' | 'sdxl')}
                  className="w-full bg-[#1a1a1a] border border-[#c5a46e]/20 rounded-2xl p-3"
                >
                  <option value="sdxl">SDXL (Illustrious, Pony, etc.)</option>
                  <option value="sd15">SD 1.5</option>
                </select>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2">CHECKPOINT</div>
                <select
                  value={selectedCheckpoint}
                  onChange={(e) => setSelectedCheckpoint(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#c5a46e]/20 rounded-2xl p-3"
                >
                  {checkpoints.length === 0 && <option>No models found</option>}
                  {checkpoints.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">STEPS</div>
                <input type="number" value={steps} onChange={(e) => setSteps(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))} className="w-full bg-[#1a1a1a] border border-[#c5a46e]/20 rounded-xl p-3" />
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">CFG</div>
                <input type="number" step="0.5" value={cfg} onChange={(e) => setCfg(Math.max(0, Math.min(30, parseFloat(e.target.value) || 7.5)))} className="w-full bg-[#1a1a1a] border border-[#c5a46e]/20 rounded-xl p-3" />
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">SEED (-1 = random)</div>
                <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || -1)} className="w-full bg-[#1a1a1a] border border-[#c5a46e]/20 rounded-xl p-3" />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || !selectedCheckpoint}
              className="w-full py-4 bg-[#c5a46e] text-black rounded-2xl font-semibold text-lg disabled:opacity-60"
            >
              {generating ? 'GENERATING...' : 'GENERATE IMAGE'}
            </button>

            {message && <div className="p-4 bg-[#1a1a1a] rounded-xl text-sm">{message}</div>}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-6">
            <div className="bg-[#111] border border-[#c5a46e]/20 rounded-3xl w-full max-w-lg p-8">
              <div className="flex justify-between mb-6">
                <div className="text-2xl">Settings</div>
                <button onClick={() => setShowSettings(false)}>×</button>
              </div>

              <div className="mb-6">
                <div className="text-[#c5a46e] mb-2">ComfyUI Folder</div>
                <div className="bg-[#1a1a1a] p-3 rounded mb-2 text-sm break-all">{comfyPath}</div>
                <button onClick={pickComfyUIPath} className="w-full py-2 border border-[#c5a46e]/40 rounded">Browse ComfyUI</button>
              </div>

              <div>
                <div className="text-[#c5a46e] mb-2">Python Environment</div>
                <div className="bg-[#1a1a1a] p-3 rounded mb-3 text-sm break-all">{pythonPath}</div>
                <div className="flex gap-3">
                  <button onClick={pickPythonPath} className="flex-1 py-2 border rounded">Browse Python</button>
                  <button onClick={createVirtualEnvironment} className="flex-1 py-2 bg-[#c5a46e] text-black rounded">Create Venv</button>
                </div>
              </div>

              {pathError && <div className="text-red-400 text-sm mb-4">{pathError}</div>}

              <button onClick={() => setShowSettings(false)} className="mt-6 w-full py-3 bg-[#c5a46e] text-black rounded-xl">Done</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;