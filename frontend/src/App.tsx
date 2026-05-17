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
      setComfyPath(await invoke<string>('get_comfyui_path'));
      setPythonPath(await invoke<string>('get_python_path'));
    } catch (e) {}
  }

  async function handleStart() {
    setLoading(true);
    setMessage('');
    try {
      const result = await invoke<string>('start_comfyui');
      setMessage(result);
      await fetchStatus();

      // If start was successful, switch to generation view
      if (!result.toLowerCase().includes('error')) {
        setTimeout(() => {
          setCurrentView('generation');
        }, 800);
      }
    } catch (err: any) {
      setMessage(`Error: ${err}`);
    }
    setLoading(false);
  }

  async function handleStop() {
    setLoading(true);
    try {
      const result = await invoke<string>('stop_comfyui');
      setMessage(result);
      setCurrentView('dashboard');
      await fetchStatus();
    } catch (err: any) {
      setMessage(`Error: ${err}`);
    }
    setLoading(false);
  }

  // Generation (placeholder for now)
  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const result = await invoke('generate_image', {
        prompt: prompt,
        negative_prompt: 'low quality, bad anatomy',
        checkpoint: 'model.safetensors', // TODO: make dynamic later
        steps: 25,
        cfg: 7,
        seed: -1
      });
      setMessage('Generation started! Check ComfyUI output folder.');
    } catch (err: any) {
      setMessage(`Generation error: ${err}`);
    }
    setGenerating(false);
  }

  // Settings functions (keep existing)
  async function pickComfyUIPath() { /* ... */ }
  async function pickPythonPath() { /* ... */ }
  async function createVirtualEnvironment() { /* ... */ }
  async function installRequirements() { /* ... */ }

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
              <button onClick={() => setCurrentView('dashboard')} className="px-4 py-2 border border-mandingo-gold/30 rounded-xl text-sm">
                Back to Dashboard
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 border border-mandingo-gold/30 rounded-xl">
              <Settings className="w-4 h-4" /> SETTINGS
            </button>
          </div>
        </div>
      </nav>

      {/* DASHBOARD VIEW */}
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
        <div className="max-w-4xl mx-auto px-8 pt-10">
          <div className="flex items-center gap-3 mb-8">
            <ImageIcon className="w-8 h-8 text-mandingo-gold" />
            <div>
              <div className="text-3xl font-semibold">Image Generation</div>
              <div className="text-mandingo-muted text-sm">ComfyUI is running • Ready to forge</div>
            </div>
          </div>

          <div className="card">
            <div className="mb-4">
              <div className="text-sm text-mandingo-muted mb-2">PROMPT</div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A muscular black man with intense gaze, cinematic lighting, highly detailed..."
                className="w-full h-32 bg-mandingo-surface2 border border-mandingo-gold/20 rounded-2xl p-4 text-lg resize-y"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full py-4 bg-mandingo-gold text-mandingo-bg rounded-2xl font-semibold text-lg disabled:opacity-60"
            >
              {generating ? 'GENERATING...' : 'GENERATE IMAGE'}
            </button>

            {message && <div className="mt-4 p-4 bg-mandingo-surface2 rounded-xl text-sm">{message}</div>}
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-6">
            <div className="bg-mandingo-surface rounded-3xl w-full max-w-lg p-8">
              <div className="flex justify-between mb-6">
                <div className="text-2xl">Settings</div>
                <button onClick={() => setShowSettings(false)}>×</button>
              </div>

              <div className="mb-6">
                <div className="text-mandingo-gold mb-2">ComfyUI Folder</div>
                <div className="bg-mandingo-surface2 p-3 rounded mb-2 text-sm font-mono">{comfyPath}</div>
                <button onClick={pickComfyUIPath} className="w-full py-2 border rounded">Browse ComfyUI</button>
              </div>

              <div className="mb-6">
                <div className="text-mandingo-gold mb-2">Python Environment</div>
                <div className="bg-mandingo-surface2 p-3 rounded mb-3 text-sm font-mono">{pythonPath}</div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button onClick={pickPythonPath} className="py-2 border rounded">Browse Python</button>
                  <button onClick={createVirtualEnvironment} disabled={venvCreating} className="py-2 bg-mandingo-gold text-black rounded font-medium">
                    {venvCreating ? 'Creating...' : 'Create New Venv'}
                  </button>
                </div>

                <button onClick={installRequirements} disabled={installing} className="w-full py-3 border rounded flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> {installing ? 'Installing...' : 'Install Requirements'}
                </button>
              </div>

              {pathError && <div className="text-red-400 text-sm mb-4">{pathError}</div>}
              <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-mandingo-gold text-black rounded-xl">Done</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
