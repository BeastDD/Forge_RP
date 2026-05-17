# MANDINGOFORGE Architecture (Sprint 0)

## Tech Choices (Locked)

### Frontend
- **React 19** + TypeScript
- **Vite** for blazing fast dev
- **Tailwind CSS** + custom Mandingo theme
- **shadcn/ui** patterns (for consistency + accessibility)
- **Framer Motion** for premium micro-interactions and page transitions
- **@tauri-apps/api** for invoke + event listening

### Backend (Rust)
- **Tauri v2** — secure, performant desktop shell
- **tokio** for async process management
- Custom `ComfyManager` state for lifecycle control

### AI Runtime
- **ComfyUI** running as managed child process (sidecar pattern)
- Communication: REST (http://127.0.0.1:8188) + WebSocket (for prompt queue, progress)
- Default port: 8188 (configurable in future)

## Process Management Strategy
- Rust owns the `Child` handle via `tokio::process::Command`
- On `start_comfyui`: spawn with `python main.py --listen 127.0.0.1 --port 8188 --disable-auto-launch`
- Health check: HTTP GET to `/system_stats` or `/` 
- On stop: `kill()` + wait with timeout
- App exit: ensure child is terminated
- Future: auto port selection if 8188 busy, multiple instances support

## IPC Commands (Current)
1. `start_comfyui()` → Result<String>
2. `stop_comfyui()` → Result<String>
3. `get_comfy_status()` → { running: bool, port: u16, pid?: number }
4. `test_comfy_connection()` → Result<bool> (tries HTTP health)

## Theme Implementation
CSS variables + Tailwind:
```css
--color-bg: #0a0a0a;
--color-surface: #111111;
--color-gold: #c5a46e;
--color-crimson: #8b0000;
--color-text: #f5f5f5;
```

Luxurious touches:
- Subtle gold ring on focus
- Smooth Framer Motion scale on cards
- Elegant loading states (perhaps pulsing gold bar)

## Future Extensibility
- Custom ComfyUI nodes in `comfyui/custom_nodes/mandingoforge/`
- Workflow versioning in `workflows/`
- Model metadata DB (sqlite via rusqlite later)
- Plugin system for community nodes

**This architecture is built to scale into a full professional studio without ever feeling janky.**
