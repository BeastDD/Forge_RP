import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RefreshCw, Crown, Zap, Settings, FolderOpen, Terminal, Download, Image as ImageIcon } from 'lucide-react';

interface ComfyStatus {
  running: boolean;
  port: number;
  pid?: number;
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
  const [venvCreating, setVenvCreating] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Generation state
  const [prompt, setPrompt] = useState('');
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
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

      // Load checkpoints when comfy path is available
      if (c) {
        try {
          const models = await invoke<string[]>('list_checkpoints');
          setCheckpoints(models);
          if (models.length > 0 && !selectedCheckpoint) {
            setSelectedCheckpoint(models[0]);
          }
        } catch (e) {
          console.error('Failed to load checkpoints', e);
        }
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
      setMessage('Please enter a prompt and select a checkpoint');
      return;
    }

    setGenerating(true);
    setMessage('');

    try {
      const result = await invoke('generate_image', {
        prompt: prompt,
        negative_prompt: 'low quality, bad anatomy, deformed',
        checkpoint: selectedCheckpoint,
        steps: steps,
        cfg: cfg,
        seed: seed
      });
      setMessage('Generation started! Image will be saved in ComfyUI output folder.');
    } catch (err: any) {
      setMessage(`Generation error: ${err}`);
    }

    setGenerating(false);
  }

  // Settings functions
  async function pickComfyUIPath() {
    const selected = await open({ directory: true });
    if (selected) {
      try {
        await invoke('set_comfyui_path', { path: selected });
        await loadPaths();
        setPathError('');
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
    setVenvCreating(true);
    const target = await open({ directory: true });
    if (target) {
      try {
        const result = await invoke<string>('create_comfyui_venv', { targetDir: target });
        setMessage(result);
        await loadPaths();
      } catch (e: any) { setPathError(String(e)); }
    }
    setVenvCreating(false);
  }

  async function installRequirements() {
    setInstalling(true);
    try {
      const result = await invoke<string>('install_comfyui_requirements');
      setMessage(result);
    } catch (e: any) { setPathError(String(e)); }
    setInstalling(false);
  }

  return (
    <div className="min-h-screen bg-mandingo-bg text-mandingo-text">
      <nav className="border-b border-mandingo-gold/20 bg-mandingo-surface/95 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mandingo-gold flex items-center justify-center"><Crown className="w-6 h-6" /></div>
            <div>
              <div className="font-semibold text-2xl tracking-tight gold-text">MANDINGOFORGE</div>
              <div className="text-xs text-mandingo-muted">v1.0 • SPRINT 1</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentView === 'generation' && (
              <button onClick={() => setCurrentView('dashboard')} className="px-4 py-2 border border-mandingo-gold/30 rounded-xl text-sm">Back</button>
            )}
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 border border-mandingo-gold/30 rounded-xl">
              <Settings className="w-4 h-4" /> SETTINGS
            </button>
          </div>
        </div>
      </nav>

      {/* DASHBOARD */}
      {currentView === 'dashboard' && (
        <div className="max-w-5xl mx-auto px-8 pt-12">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-semibold tracking-tighter">Forge. Desire. Create.</h1>
          </div>

          <div className="card max-w-3xl mx-auto mb-8">
            <div className="flex justify-between mb-6">
              <div className="section-title">ComfyUI Engine</div>
              <div className={`px-4 py-1 rounded-full text-sm ${status.running ? 'text-green-400' : 'text-mandingo-muted'}`}>
                {status.running ? 'IGNITED' : 'DORMANT'}
              </div>
            </div>

            <div className="flex gap-4 mb-6">
              {!status.running ? (
                <button onClick={handleStart} disabled={loading} className="btn-primary flex-1">
                  {loading ? 'IGNITING...' : 'IGNITE THE FORGE'}
                </button>
              ) : (
                <button onClick={handleStop} disabled={loading} className="btn-danger flex-1">
                  {loading ? 'SHUTTING DOWN...' : 'SHUT DOWN ENGINE'}
                </button>
              )}
            </div>

            {message && <div className="p-4 bg-mandingo-surface2 rounded-xl text-sm">{message}</div>}
          </div>
        </div>
      )}

      {/* GENERATION VIEW */}
      {currentView === 'generation' && (
        <div className="max-w-4xl mx-auto px-8 pt-8">
          <div className="flex items-center gap-3 mb-8">
            <ImageIcon className="w-8 h-8 text-mandingo-gold" />
            <div>
              <div className="text-3xl font-semibold">Image Generation</div>
              <div className="text-mandingo-muted">ComfyUI is running</div>
            </div>
          </div>

          <div className="card space-y-6">
            {/* Prompt */}
            <div>
              <div className="text-sm text-mandingo-muted mb-2">PROMPT</div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to generate..."
                className="w-full h-28 bg-mandingo-surface2 border border-mandingo-gold/20 rounded-2xl p-4"
              />
            </div>

            {/* Checkpoint */}
            <div>
              <div className="text-sm text-mandingo-muted mb-2">CHECKPOINT</div>
              <select
                value={selectedCheckpoint}
                onChange={(e) => setSelectedCheckpoint(e.target.value)}
                className="w-full bg-mandingo-surface2 border border-mandingo-gold/20 rounded-2xl p-3"
              >
                {checkpoints.length === 0 && <option>No models found</option>}
                {checkpoints.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-mandingo-muted mb-1">STEPS</div>
                <input
                  type="number"
                  value={steps}
                  onChange={(e) => setSteps(Math.max(1, Math.min(100, parseInt(e.target.value) || 20)))}
                  className="w-full bg-mandingo-surface2 border border-mandingo-gold/20 rounded-xl p-3"
                />
              </div>
              <div>
                <div className="text-sm text-mandingo-muted mb-1">CFG SCALE</div>
                <input
                  type="number"
                  step="0.5"
                  value={cfg}
                  onChange={(e) => setCfg(Math.max(0, Math.min(30, parseFloat(e.target.value) || 7.5)))}
                  className="w-full bg-mandingo-surface2 border border-mandingo-gold/20 rounded-xl p-3"
                />
              </div>
              <div>
                <div className="text-sm text-mandingo-muted mb-1">SEED (-1 = random)</div>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value) || -1)}
                  className="w-full bg-mandingo-surface2 border border-mandingo-gold/20 rounded-xl p-3"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || !selectedCheckpoint}
              className="w-full py-4 bg-mandingo-gold text-mandingo-bg rounded-2xl font-semibold text-lg disabled:opacity-60"
            >
              {generating ? 'GENERATING...' : 'GENERATE IMAGE'}
            </button>

            {message && <div className="p-4 bg-mandingo-surface2 rounded-xl text-sm">{message}</div>}
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && ( /* existing settings modal ... */ )}
      </AnimatePresence>
    </div>
  );
}

export default App;
