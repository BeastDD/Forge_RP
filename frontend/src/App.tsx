import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RefreshCw, ExternalLink, Crown, Zap, Settings, FolderOpen, Terminal, Download } from 'lucide-react';

interface ComfyStatus {
  running: boolean;
  port: number;
  pid?: number;
}

function App() {
  const [status, setStatus] = useState<ComfyStatus>({ running: false, port: 8188 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [connectionTest, setConnectionTest] = useState<boolean | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [comfyPath, setComfyPath] = useState('');
  const [pythonPath, setPythonPath] = useState('');
  const [pathError, setPathError] = useState('');
  const [venvCreating, setVenvCreating] = useState(false);
  const [installing, setInstalling] = useState(false);

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
    } catch (e) { console.error(e); }
  }

  async function loadPaths() {
    try {
      setComfyPath(await invoke<string>('get_comfyui_path'));
      setPythonPath(await invoke<string>('get_python_path'));
    } catch (e) {}
  }

  async function handleStart() {
    setLoading(true);
    try {
      const result = await invoke<string>('start_comfyui');
      setMessage(result);
      await fetchStatus();
    } catch (err: any) { setMessage(String(err)); }
    setLoading(false);
  }

  async function handleStop() {
    setLoading(true);
    try {
      const result = await invoke<string>('stop_comfyui');
      setMessage(result);
      await fetchStatus();
    } catch (err: any) { setMessage(String(err)); }
    setLoading(false);
  }

  async function testConnection() {
    try {
      const connected = await invoke<boolean>('test_comfy_connection');
      setConnectionTest(connected);
    } catch { setConnectionTest(false); }
  }

  const openComfyUI = () => {
    if (status.running) window.open(`http://127.0.0.1:${status.port}`, '_blank');
  };

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
    setVenvCreating(true);
    const target = await open({ directory: true, title: 'Choose folder for new venv' });
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
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 border border-mandingo-gold/30 rounded-xl">
            <Settings className="w-4 h-4" /> SETTINGS
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 pt-12">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-semibold tracking-tighter">Forge. Desire. Create.</h1>
        </div>

        <div className="card max-w-3xl mx-auto mb-8">
          <div className="flex justify-between mb-6">
            <div>
              <div className="section-title">ComfyUI Engine</div>
            </div>
            <div className={`px-4 py-1 rounded-full text-sm ${status.running ? 'text-green-400 border border-green-500/40' : 'text-mandingo-muted border border-mandingo-gold/30'}`}>
              {status.running ? 'IGNITED' : 'DORMANT'}
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            {!status.running ? (
              <button onClick={handleStart} className="btn-primary flex-1">IGNITE THE FORGE</button>
            ) : (
              <button onClick={handleStop} className="btn-danger flex-1">SHUT DOWN ENGINE</button>
            )}
            <button onClick={openComfyUI} className="px-6 py-4 border border-mandingo-gold/30 rounded-xl">Open ComfyUI</button>
          </div>

          {message && <div className="p-4 bg-mandingo-surface2 rounded-xl text-sm">{message}</div>}
        </div>

        <div className="text-center text-sm text-mandingo-muted">Settings now includes Create Venv + Install Requirements</div>
      </div>

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

              <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-mandingo-gold text-black rounded-xl mt-4">Done</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
