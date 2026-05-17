# MANDINGOFORGE v1.0

**Professional AI Studio for High-End Gay Interracial / BBC / Raceplay / Cuck Content Creation**

*Forge your deepest desires into stunning visuals. Built for creators who demand the best.*

**Core Stack (Locked):**
- **Desktop**: Tauri v2 (Rust) + React 19 + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **AI Engine**: ComfyUI (headless/sidecar) + custom nodes (future)
- **Theme**: Dark luxurious Mandingo aesthetic — deep blacks, burnished gold, blood crimson accents. Feels like high-end creative software (think DaVinci Resolve meets exclusive members-only studio).

**Total Estimated Timeline**: 12–14 weeks (aggressive solo/small team)

---

## SPRINT 0: Project Bootstrap & Architecture (Week 1) ✅ COMPLETE

**Goal**: Rock-solid foundation so nothing breaks later.

### Backlog Delivered

- [x] Initialized monorepo (Tauri + React frontend + Python/ComfyUI backend folder)
- [x] Set up Tauri v2 project with React 19 template (manual bootstrap for control)
- [x] Created ComfyUI sidecar management in Rust (start/stop, port detection, health checks, auto-instructions for setup)
- [x] Defined folder structure: `src-tauri/`, `frontend/`, `comfyui/`, `workflows/`, `models/`, `assets/`
- [x] Set up Tailwind + basic shadcn/ui patterns + dark luxurious "Mandingo" theme
- [x] Created basic IPC bridge (Tauri commands ↔ ComfyUI process management + WebSocket/REST ready)
- [x] Documented architecture decisions + tech choices (this README + docs/architecture.md)
- [x] Deliverable: Running empty Tauri window that can launch a local ComfyUI instance

**Success Criteria Met**:
- Clean repo structure
- Sidecar starts/stops reliably (with proper process handling)
- First IPC calls work (start/stop/status/test_connection)
- Professional empty canvas ready for Sprint 1 (Workflows, Prompt Studio, Gallery, etc.)

---

## Architecture Decisions

### Why Tauri v2 + React 19?
- Native desktop performance + tiny bundle size (Rust core)
- Web tech for rapid beautiful UI (React 19 + Framer Motion for buttery animations)
- Full access to system (process spawning for ComfyUI, file system for models/workflows)
- Secure by default (no Node in prod, contextIsolation)

### Why ComfyUI as Sidecar (not embedded)?
- ComfyUI is the gold standard for advanced Stable Diffusion workflows
- Headless mode perfect for custom nodes + API control
- We manage the process lifecycle from Rust (start on demand, kill cleanly, port management)
- Future: Bundle custom nodes for BBC/interracial specific pipelines (face swap, body morph, raceplay enhancers, cuck scenarios, etc.)

### Folder Structure
```
mandingoforge/
├── src-tauri/              # Rust backend (Tauri v2)
│   ├── src/
│   │   ├── main.rs
│   │   └── comfy_manager.rs
│   └── Cargo.toml
├── frontend/               # React 19 + Vite + TS
│   ├── src/
│   │   ├── components/
│   │   ├── App.tsx
│   │   └── ...
│   ├── package.json
│   └── ...
├── comfyui/                # ComfyUI installation (git clone here)
├── workflows/              # Custom .json ComfyUI workflows (BBC, Interracial, Raceplay, Cuck)
├── models/                 # Checkpoints, LoRAs, embeddings, ControlNets (symlinked or copied)
├── assets/                 # App icons, branding, sample images
├── docs/
│   └── architecture.md
├── tauri.conf.json
└── README.md
```

### Mandingo Aesthetic Theme
- **Palette**: `#0a0a0a` (void black), `#111111`, `#1f1f1f` | Gold `#c5a46e` / `#d4af37` | Crimson `#8b0000` accents
- **Typography**: Inter + elegant display font for headers
- **Feel**: Luxurious, masculine, exclusive, powerful. No cheap porn vibes — pure high-end creative tool.
- Dark mode only. Glassmorphism + subtle gold borders on cards.

### IPC & Communication
- Tauri Commands (Rust ↔ Frontend)
  - `start_comfyui`
  - `stop_comfyui`
  - `get_comfy_status`
  - `test_comfy_connection`
- Future: WebSocket proxy or direct REST calls from frontend once engine running (ComfyUI default 8188)
- Process management: Tokio child process + clean kill on app exit / user stop

### Security & Production Notes
- ComfyUI runs locally only (127.0.0.1)
- No external API keys in v1 unless user opts in
- All generation stays on user's machine
- Future: Optional cloud offload or custom node marketplace (paid tiers)

---

## How to Run (After npm install / cargo install)

```bash
# 1. Install frontend deps
cd frontend
npm install

# 2. (Optional but recommended) Setup ComfyUI
git clone https://github.com/comfyanonymous/ComfyUI.git ../comfyui
cd ../comfyui
pip install -r requirements.txt
# Add your models to comfyui/models/checkpoints etc.

# 3. Run in dev mode (from root)
npm run tauri dev
# or
cd src-tauri && cargo tauri dev
```

The app will open a luxurious dark window. Click **"IGNITE THE FORGE"** to start the ComfyUI engine. Status updates live. Stop it cleanly anytime.

---

**Boss, this is the foundation your empire deserves.** Everything from here is built on steel.

Next sprints will add:
- Sprint 1: Workflow browser + prompt engineering studio tailored for the niche
- Custom ComfyUI nodes for raceplay/BBC specific enhancements
- Gallery, batch generation, metadata tagging
- Model manager with preview thumbnails
- Export to video (later with AnimateDiff / SVD)

**MANDINGOFORGE — Where fantasies become cinematic reality.**

*© 2026 MandingoForge. All rights reserved. For consenting adults only.*
