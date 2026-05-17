import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, RefreshCw, ExternalLink, Crown, Zap, Settings, FolderOpen } from 'lucide-react';

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

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [comfyPath, setComfyPath] = useState('');
  const [pathLoading, setPathLoading] = useState(false);
  const [pathError, setPathError] = useState('');

  // Poll status every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 3000);
    fetchStatus();
    loadComfyPath();
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const res = await invoke<ComfyStatus>('get_comfy_status');
      setStatus(res);
    } catch (e) {
      console.error('Status fetch failed', e);
    }
  }

  async function loadComfyPath() {
    try {
      const path = await invoke<string>('get_comfyui_path');
      setComfyPath(path);
    } catch (e) {
      console.error('Failed to load ComfyUI path', e);
    }
  }

  async function handleStart() {
    setLoading(true);
    setMessage('');
    setConnectionTest(null);
    
    try {
      const result = await invoke<string>('start_comfyui');
      setMessage(result);
      await fetchStatus();
      setTimeout(testConnection, 4000);
    } catch (err: any) {
      setMessage(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    setMessage('');
    
    try {
      const result = await invoke<string>('stop_comfyui');
      setMessage(result);
      setConnectionTest(null);
      await fetchStatus();
    } catch (err: any) {
      setMessage(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  async function testConnection() {
    setLoading(true);
    try {
      const connected = await invoke<boolean>('test_comfy_connection');
      setConnectionTest(connected);
      setMessage(connected 
        ? '🔥 Connection to the Forge is strong. Engine is responsive.' 
        : 'Engine running but connection test failed. Check logs.');
    } catch (err: any) {
      setConnectionTest(false);
      setMessage(`Connection test failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  const openComfyUI = () => {
    if (status.running) {
      window.open(`http://127.0.0.1:${status.port}`, '_blank');
    }
  };

  // === Settings: Folder Picker with better error handling ===
  async function pickComfyUIPath() {
    setPathError('');
    setPathLoading(true);

    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select your ComfyUI installation folder (must contain main.py)',
      });

      if (selected && typeof selected === 'string') {
        try {
          const result = await invoke<string>('set_comfyui_path', { path: selected });
          setMessage(result);
          await loadComfyPath();
          setPathError(''); // clear any previous error
        } catch (err: any) {
          const errorMsg = typeof err === 'string' ? err : err?.message || 'Unknown error setting path';
          setPathError(errorMsg);
          setMessage(`Failed to set ComfyUI path: ${errorMsg}`);
        }
      }
    } catch (err: any) {
      console.error('Dialog error:', err);
      setPathError('Failed to open folder picker. Make sure the app has permission.');
    } finally {
      setPathLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-mandingo-bg text-mandingo-text overflow-hidden">
      {/* Top Navigation Bar - Luxurious */}
      <nav className="border-b border-mandingo-gold/20 bg-mandingo-surface/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mandingo-gold to-mandingo-gold-light flex items-center justify-center">
                <Crown className="w-6 h-6 text-mandingo-bg" />
              </div>
              <div>
                <div className="font-semibold text-2xl tracking-[-1.5px] gold-text">MANDINGOFORGE</div>
                <div className="text-[10px] text-mandingo-muted -mt-1">v1.0 • SPRINT 1</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => {
                setShowSettings(true);
                setPathError(''); // reset error when opening settings
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-mandingo-gold/30 hover:bg-mandingo-gold/5 transition-all text-mandingo-muted hover:text-mandingo-text"
            >
              <Settings className="w-4 h-4" />
              SETTINGS
            </button>

            <div className="px-4 py-1.5 rounded-full bg-mandingo-surface2 border border-mandingo-gold/20 text-mandingo-muted flex items-center gap-2">
              <Zap className="w-4 h-4" /> COMFYUI SIDECAR
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-8 pt-16 pb-24">
        {/* Hero Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-mandingo-gold/30 text-mandingo-gold text-xs tracking-[3px] mb-6">
            PROFESSIONAL • EXCLUSIVE • UNFILTERED
          </div>
          
          <h1 className="text-7xl font-semibold tracking-[-3.5px] leading-none mb-4">
            Forge.<br />Desire.<br />Create.
          </h1>
          <p className="text-2xl text-mandingo-muted max-w-md mx-auto">
            The premier desktop AI studio for gay interracial, BBC, raceplay & cuck content.
          </p>
        </div>

        {/* Main Control Card */}
        <div className="card max-w-3xl mx-auto mb-8">
          <div className="flex items-start justify-between mb-8">
            <div>
              <div className="section-title">ComfyUI Engine</div>
              <p className="text-mandingo-muted">Local sidecar • Headless • Fully controlled</p>
            </div>
            
            <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border ${status.running 
              ? 'border-green-500/40 bg-green-950/40 text-green-400' 
              : 'border-mandingo-gold/30 bg-mandingo-surface2 text-mandingo-muted'}`}>
              <div className={`w-2 h-2 rounded-full ${status.running ? 'bg-green-400 status-dot' : 'bg-mandingo-muted'}`} />
              {status.running ? 'IGNITED' : 'DORMANT'}
            </div>
          </div>

          {/* Status Info */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-mandingo-surface2 rounded-xl p-4">
              <div className="text-xs text-mandingo-muted mb-1">PORT</div>
              <div className="text-3xl font-mono tracking-tighter">{status.port}</div>
            </div>
            <div className="bg-mandingo-surface2 rounded-xl p-4">
              <div className="text-xs text-mandingo-muted mb-1">PID</div>
              <div className="text-3xl font-mono tracking-tighter">{status.pid || '—'}</div>
            </div>
            <div className="bg-mandingo-surface2 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="text-xs text-mandingo-muted mb-1">CONNECTION</div>
                <div className={`text-lg font-medium ${connectionTest === true ? 'text-green-400' : connectionTest === false ? 'text-red-400' : 'text-mandingo-muted'}`}>
                  {connectionTest === true && 'HEALTHY'}
                  {connectionTest === false && 'UNREACHABLE'}
                  {connectionTest === null && 'NOT TESTED'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            {!status.running ? (
              <button 
                onClick={handleStart}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-3 disabled:opacity-70"
              >
                <Play className="w-5 h-5" />
                {loading ? 'IGNITING THE FORGE...' : 'IGNITE THE FORGE'}
              </button>
            ) : (
              <>
                <button 
                  onClick={handleStop}
                  disabled={loading}
                  className="btn-danger flex-1 flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  <Square className="w-5 h-5" />
                  {loading ? 'SHUTTING DOWN...' : 'SHUT DOWN ENGINE'}
                </button>
                
                <button 
                  onClick={openComfyUI}
                  className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-xl border border-mandingo-gold/40 hover:bg-mandingo-gold/5 transition-all font-medium"
                >
                  <ExternalLink className="w-5 h-5" />
                  OPEN COMFYUI UI
                </button>
              </>
            )}

            <button 
              onClick={testConnection}
              disabled={!status.running || loading}
              className="px-6 py-4 rounded-xl border border-mandingo-gold/30 hover:bg-mandingo-gold/5 flex items-center gap-2 disabled:opacity-50 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              TEST
            </button>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-6 p-4 rounded-xl bg-mandingo-surface2 border border-mandingo-gold/20 text-sm font-mono"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
          <div className="card text-center">
            <div className="text-mandingo-gold mb-3"><Crown className="mx-auto w-8 h-8" /></div>
            <div className="font-semibold mb-1">Sprint 1 Active</div>
            <div className="text-xs text-mandingo-muted">Full generation pipeline + Settings</div>
          </div>
          <div className="card text-center">
            <div className="text-mandingo-gold mb-3"><Zap className="mx-auto w-8 h-8" /></div>
            <div className="font-semibold mb-1">Flexible ComfyUI</div>
            <div className="text-xs text-mandingo-muted">Use any existing installation</div>
          </div>
          <div className="card text-center border border-mandingo-gold/30">
            <div className="font-semibold mb-1 gold-text">Mandingo Aesthetic</div>
            <div className="text-xs text-mandingo-muted">Luxurious • Powerful • Unapologetic</div>
          </div>
        </div>

        <div className="text-center mt-16 text-[10px] text-mandingo-muted tracking-widest">
          BUILT FOR CREATORS WHO DEMAND THE BEST • LOCAL ONLY • NO COMPROMISE
        </div>
      </div>

      {/* === SETTINGS MODAL === */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg rounded-3xl bg-mandingo-surface border border-mandingo-gold/20 overflow-hidden"
            >
              <div className="px-8 pt-8 pb-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="text-2xl font-semibold tracking-tight">Settings</div>
                    <div className="text-mandingo-muted text-sm">Configure your Forge</div>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="text-mandingo-muted hover:text-white transition-colors text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* ComfyUI Path Section */}
                <div className="mb-8">
                  <div className="section-title mb-3 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" /> ComfyUI Installation
                  </div>
                  <p className="text-sm text-mandingo-muted mb-4">
                    Point MandingoForge to your existing ComfyUI folder. Works with any custom installation.
                  </p>

                  <div className="bg-mandingo-surface2 rounded-2xl p-4 mb-4 border border-mandingo-gold/10">
                    <div className="text-xs text-mandingo-muted mb-1">CURRENT PATH</div>
                    <div className="font-mono text-sm break-all text-mandingo-gold">
                      {comfyPath || 'Not configured (using default ../comfyui)'}
                    </div>
                  </div>

                  <button
                    onClick={pickComfyUIPath}
                    disabled={pathLoading}
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border border-mandingo-gold/40 hover:bg-mandingo-gold/5 active:bg-mandingo-gold/10 transition-all font-medium disabled:opacity-60"
                  >
                    <FolderOpen className="w-5 h-5" />
                    {pathLoading ? 'VALIDATING PATH...' : 'BROWSE FOR COMFYUI FOLDER'}
                  </button>

                  {/* Error message inside modal */}
                  {pathError && (
                    <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm">
                      {pathError}
                    </div>
                  )}

                  <p className="text-[10px] text-mandingo-muted mt-3 text-center">
                    Select the folder containing <span className="font-mono">main.py</span>
                  </p>
                </div>

                <div className="text-center text-xs text-mandingo-muted">
                  Changes take effect immediately. Restart the engine after changing path.
                </div>
              </div>

              <div className="border-t border-mandingo-gold/20 px-8 py-5 flex justify-end">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-8 py-2.5 rounded-xl bg-mandingo-gold text-mandingo-bg font-medium hover:bg-mandingo-gold-light transition-colors"
                >
                  DONE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
