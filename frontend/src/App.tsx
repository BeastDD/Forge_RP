import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RefreshCw, ExternalLink, Crown, Zap, Settings, FolderOpen, Terminal, Download } from 'lucide-react';

function App() {
  const [status, setStatus] = useState({ running: false, port: 8188 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [comfyPath, setComfyPath] = useState('');
  const [pythonPath, setPythonPath] = useState('');
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState('');
  const [venvCreating, setVenvCreating] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => { /* fetch status */ }, 3000);
    loadPaths();
    return () => clearInterval(interval);
  }, []);

  async function loadPaths() {
    try {
      setComfyPath(await invoke('get_comfyui_path'));
      setPythonPath(await invoke('get_python_path'));
    } catch (e) {}
  }

  async function pickComfyUIPath() { /* existing */ }
  async function pickPythonPath() { /* existing */ }

  async function createVirtualEnvironment() {
    setVenvCreating(true);
    const target = await open({ directory: true, title: 'Choose folder for new virtual environment' });
    if (target) {
      try {
        const result = await invoke('create_comfyui_venv', { targetDir: target });
        setMessage(result);
        await loadPaths();
      } catch (e) { setPathError(String(e)); }
    }
    setVenvCreating(false);
  }

  // NEW: Install Requirements button
  async function installRequirements() {
    setInstalling(true);
    setPathError('');
    try {
      const result = await invoke('install_comfyui_requirements');
      setMessage(result);
    } catch (err: any) {
      setPathError(String(err));
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div>
      {/* Top nav with Settings button */}
      <button onClick={() => setShowSettings(true)}>SETTINGS</button>

      {/* Main content */}

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
            <div className="bg-mandingo-surface rounded-3xl w-full max-w-lg p-8">
              <div className="flex justify-between mb-6">
                <div className="text-2xl font-semibold">Settings</div>
                <button onClick={() => setShowSettings(false)}>×</button>
              </div>

              {/* ComfyUI Path */}
              <div className="mb-6">
                <div className="text-mandingo-gold mb-2 flex items-center gap-2"><FolderOpen size={16}/> ComfyUI Folder</div>
                <div className="bg-mandingo-surface2 p-3 rounded text-sm font-mono mb-2">{comfyPath}</div>
                <button onClick={pickComfyUIPath} className="w-full py-2 border">Browse ComfyUI</button>
              </div>

              {/* Python + Venv + Install Requirements */}
              <div className="mb-6">
                <div className="text-mandingo-gold mb-2 flex items-center gap-2"><Terminal size={16}/> Python Environment</div>
                <div className="bg-mandingo-surface2 p-3 rounded text-sm font-mono mb-3">{pythonPath || 'System Python'}</div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button onClick={pickPythonPath} className="py-2 border rounded">Browse Python</button>
                  <button onClick={createVirtualEnvironment} disabled={venvCreating} className="py-2 bg-mandingo-gold text-black rounded font-medium">
                    {venvCreating ? 'Creating...' : 'Create New Venv'}
                  </button>
                </div>

                {/* NEW: Install Requirements Button */}
                <button 
                  onClick={installRequirements} 
                  disabled={installing || !comfyPath}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-mandingo-gold/40 rounded-2xl disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {installing ? 'Installing Requirements...' : 'Install Requirements'}
                </button>
                <p className="text-xs text-mandingo-muted mt-1 text-center">Installs from requirements.txt using current Python</p>
              </div>

              {pathError && <div className="text-red-400 text-sm mb-4">{pathError}</div>}

              <button onClick={() => setShowSettings(false)} className="mt-4 w-full py-3 bg-mandingo-gold text-black rounded-xl">Done</button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
