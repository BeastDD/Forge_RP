# MANDINGOFORGE v1.0

**Professional AI Studio for High-End Gay Interracial / BBC / Raceplay / Cuck Content Creation**

*Forge your deepest desires into stunning visuals. Built for creators who demand the best.*

**Core Stack (Locked):**
- **Desktop**: Tauri v2 (Rust) + React 19 + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **AI Engine**: ComfyUI (headless/sidecar) + custom nodes (future)
- **Theme**: Dark luxurious Mandingo aesthetic — deep blacks, burnished gold, blood crimson accents.

**Total Estimated Timeline**: 12–14 weeks (aggressive solo/small team)

---

## SPRINT 0: Project Bootstrap & Architecture ✅ COMPLETE

(Previous content remains)

---

## SPRINT 1: ComfyUI Backend Foundation + Basic Image Generation (IN PROGRESS — Major UX Improvement)

**Goal**: Get raw image generation working end-to-end + make ComfyUI location fully flexible.

### Key Improvement: Bring Your Own ComfyUI

**No, you do NOT need to clone ComfyUI inside the MandingoForge folder.**

You can now point **MANDINGOFORGE to any existing ComfyUI installation** on your entire PC.

This is ideal if you already have:
- A heavily customized ComfyUI with tons of nodes (IPAdapter, ControlNet, Reactor, etc.)
- Your own models, LoRAs, and embeddings
- Multiple ComfyUI installs for different projects

### How the New Path System Works

1. The app now reads/writes a `.comfyui_path` file (in the project root for now)
2. On startup, if the file exists and is valid, it uses that path
3. You can change it anytime via new Tauri commands:
   - `get_comfyui_path()`
   - `set_comfyui_path("/full/path/to/your/comfyui")`
4. The path is validated (must contain `main.py`)
5. Once set, `start_comfyui` will launch **your** ComfyUI from wherever it lives

**This gives you full freedom.** Bring any custom installation into MandingoForge.

### Backlog Status

- [x] ComfyUI path is now fully configurable (any location on disk)
- [x] Path persistence via `.comfyui_path` file
- [x] Validation that the folder actually contains a valid ComfyUI
- [x] Dynamic txt2img workflow + generate_image command
- [x] Queue polling support

---

## How to Configure Your Existing ComfyUI (Recommended)

```bash
# From the app (once frontend is wired):
# Settings → ComfyUI Location → Browse to your existing ComfyUI folder

# Or manually create .comfyui_path file in the project root:
echo "/Users/yourname/ComfyUI" > .comfyui_path
# or
echo "C:\\Users\\you\\ComfyUI" > .comfyui_path
```

Then click **"IGNITE THE FORGE"** — it will start **your** ComfyUI installation with all your custom nodes and models.

---

**Boss, this is exactly what you asked for.** Full flexibility. No forced folder structure. Point it at whatever ComfyUI setup you already love.

The backend is now even more powerful and user-friendly.

Next: Wire a nice Settings panel in the frontend so you can browse and select your ComfyUI folder with a file picker.

**MANDINGOFORGE — Built for power users who already have their tools dialed in.**
