import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RefreshCw, ExternalLink, Crown, Zap, Settings, FolderOpen, Terminal } from 'lucide-react';

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

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [comfyPath, setComfyPath] = useState('');
  const [pythonPath, setPythonPath] = useState('');
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState('');
  const [venvCreating, setVenvCreating] = useState(false);

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
      const cPath = await invoke<string>('get_comfyui_path');
      const pPath = await invoke<string>('get_python_path');
      setComfyPath(cPath);
      setPythonPath(pPath);
    } catch (e) { console.error('Failed to load paths', e); }
  }

  async function handleStart() { /* ... same as before ... */ }
  async function handleStop() { /* ... same ... */ }
  async function testConnection() { /* ... same ... */ }
  const openComfyUI = () => { if (status.running) window.open(`http://127.0.0.1:${status.port}`, '_blank'); };

  // Browse ComfyUI
  async function pickComfyUIPath() {
    setPathError('');
    const selected = await open({ directory: true, title: 'Select ComfyUI folder' });
    if (selected && typeof selected === 'string') {
      setPathLoading(true);
      try {
        const result = await invoke<string>('set_comfyui_path', { path: selected });
        setMessage(result);
        await loadPaths();
      } catch (err: any) { setPathError(String(err)); }
      setPathLoading(false);
    }
  }

  // Browse Python
  async function pickPythonPath() {
    setPathError('');
    const selected = await open({ 
      directory: false, 
      multiple: false,
      filters: [{ name: 'Python', extensions: ['exe', ''] }],
      title: 'Select Python executable (from venv or system)'
    });
    if (selected && typeof selected === 'string') {
      setPathLoading(true);
      try {
        const result = await invoke<string>('set_python_path', { path: selected });
        setMessage(result);
        await loadPaths();
      } catch (err: any) { setPathError(String(err)); }
      setPathLoading(false);
    }
  }

  // Create new virtual environment (the stress-free feature)
  async function createVirtualEnvironment() {
    setPathError('');
    setVenvCreating(true);

    const targetDir = await open({
      directory: true,
      multiple: false,
      title: 'Choose location for new virtual environment folder'
    });

    if (!targetDir || typeof targetDir !== 'string') {
      setVenvCreating(false);
      return;
    }

    try {
      const result = await invoke<string>('create_comfyui_venv', { targetDir });
      setMessage(result);
      await loadPaths();
    } catch (err: any) {
      setPathError(String(err));
    } finally {
      setVenvCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-mandingo-bg text-mandingo-text">
      <nav className="border-b border-mandingo-gold/20 bg-mandingo-surface/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mandingo-gold to-mandingo-gold-light flex items-center justify-center">
              <Crown className="w-6 h-6 text-mandingo-bg" />
            </div>
            <div>
              <div className="font-semibold text-2xl tracking-[-1.5px] gold-text">MANDINGOFORGE</div>
              <div className="text-[10px] text-mandingo-muted -mt-1">v1.0 • SPRINT 1</div>
            </div>
          </div>

          <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-mandingo-gold/30 hover:bg-mandingo-gold/5">
            <Settings className="w-4 h-4" /> SETTINGS
          </button>
        </div>
      </nav>

      {/* Main content (simplified for brevity) */}
      <div className="max-w-5xl mx-auto px-8 pt-16">
        <div className="text-center mb-12">
          <h1 className="text-7xl font-semibold tracking-[-3.5px]">Forge. Desire. Create.</h1>
        </div>

        <div className="card max-w-3xl mx-auto">
          {/* Engine controls - keep existing buttons */}
          <div className="flex gap-4">
            <button onClick={handleStart} className="btn-primary flex-1">IGNITE THE FORGE</button>
            <button onClick={handleStop} className="btn-danger flex-1">SHUT DOWN</button>
          </div>
        </div>
      </div>

      {/* SETTINGS MODAL - Enhanced with Python + Venv */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-6">
            <motion.div initial={{opacity:0, scale:0.96}} animate={{opacity:1, scale:1}} className="w-full max-w-lg bg-mandingo-surface rounded-3xl border border-mandingo-gold/20 overflow-hidden">
              <div className="p-8">
                <div className="flex justify-between mb-6">
                  <div className="text-2xl font-semibold">Settings</div>
                  <button onClick={() => setShowSettings(false)} className="text-2xl">×</button>
                </div>

                {/* ComfyUI Location */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2 text-mandingo-gold"><FolderOpen className="w-4 h-4"/> ComfyUI Folder</div>
                  <div className="bg-mandingo-surface2 p-3 rounded-xl text-sm font-mono break-all mb-3">{comfyPath || 'Not set'}</div>
                  <button onClick={pickComfyUIPath} className="w-full py-3 border border-mandingo-gold/40 rounded-2xl">Browse ComfyUI Folder</button>
                </div>

                {/* Python Environment - NEW */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2 text-mandingo-gold"><Terminal className="w-4 h-4"/> Python Environment</div>
                  <div className="bg-mandingo-surface2 p-3 rounded-xl text-sm font-mono break-all mb-3">{pythonPath || 'Using system Python'}</div>
                  
                  <div className="flex gap-3">
                    <button onClick={pickPythonPath} className="flex-1 py-3 border border-mandingo-gold/40 rounded-2xl text-sm">
                      Browse Python Executable
                    </button>
                    <button 
                      onClick={createVirtualEnvironment} 
                      disabled={venvCreating}
                      className="flex-1 py-3 bg-mandingo-gold text-mandingo-bg rounded-2xl font-medium disabled:opacity-60"
                    >
                      {venvCreating ? 'Creating...' : 'Create New Venv'}
                    </button>
                  </div>
                  <p className="text-[10px] text-mandingo-muted mt-2 text-center">Create a clean isolated Python environment for ComfyUI</p>
                </div>

                {pathError && <div className="text-red-400 text-sm mb-4">{pathError}</div>}
              </div>

              <div className="border-t border-mandingo-gold/20 p-6 flex justify-end">
                <button onClick={() => setShowSettings(false)} className="px-8 py-2 bg-mandingo-gold text-mandingo-bg rounded-xl">Done</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
