# ⚔️ 3D Arena Fighters

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)
![React](https://img.shields.io/badge/React-19.0-61dafb?style=for-the-badge&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.186-black?style=for-the-badge&logo=three.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38bdf8?style=for-the-badge&logo=tailwindcss)
![WebSocket](https://img.shields.io/badge/WebSocket-8.21-green?style=for-the-badge&logo=socketdotio)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

**A high-performance, real-time 3D multiplayer arena combat game built with Three.js, React 19, WebSockets, and zero-dependency Web Audio procedural sound synthesis.**

[Features](#-key-features) • [Game Modes](#-game-modes) • [Characters](#-character-roster) • [Controls](#-controls--hotkeys) • [Architecture](#-system-architecture) • [Getting Started](#-getting-started) • [Deployment](#-deployment)

</div>

---

## 🌟 Overview

**3D Arena Fighters** delivers fast-paced, arcade-style third-person combat directly in the browser. Powered by custom procedural shaders in **Three.js**, an authoritative **WebSocket backend**, and a dynamic **tactical Swarm AI engine**, players can duel friends in low-latency multiplayer rooms, test their skills against adaptive AI in solo matchmaking, or survive multi-wave onslaughts in the PvE Battle Royale mode.

---

## 🚀 Key Features

- **🎮 Real-Time Low-Latency Multiplayer (1v1 & Spectating):**
  - Instant room generation with optional private PIN codes.
  - Public room lobby browser with live status indicators (waiting, in battle, ended).
  - Built-in real-time match chat, latency/ping tracking, and spectator support.
  - Smooth client-side interpolation (lerping) and server-authoritative hit registration.

- **🤖 Intelligent Swarm AI & Battle Royale Mode:**
  - Multi-phase survival horde mode with wave banners and escalating difficulty.
  - **Tactical Encircling AI:** Dynamic role assignment where a designated *Primary Attacker* engages at full sprint while *Flankers* surround the player at lower speeds to prevent overwhelming chaotic swarms.
  - Dynamic AI behavior: proximity checks, projectile telegraphing, dodge windows, and attack handoffs.

- **🎨 Immersive 3D Visuals & Camera Dynamics:**
  - Procedural arena with holographic grid lines, particle fields, volumetric energy rings, and dynamic floor reflections.
  - Directional impact sparks, weapon light trails, floating combat damage numbers, screen shake, and dust puffs.
  - Smooth orbit-tracking camera with pitch dampening and collision avoidance.

- **🎵 Zero-Latency Procedural Audio Synthesizer:**
  - Built using the native **Web Audio API**—no external audio files required.
  - Generates real-time sound effects for blade slashes, heavy blunt impacts, parry deflections, laser bursts, explosive ultimates, footsteps, and victory fanfares.

- **🛡️ Custom GLB / GLTF 3D Model Uploader:**
  - Import external 3D models via local file upload (`.glb` / `.gltf`) or direct model URL.
  - Real-time 3D character select preview stage with rotation controls, scale normalization, and bounding-box centering.

- **🏅 Seals & Progression Sanctuary:**
  - Persistent rank tracking (Wins, Win Streaks, Losses, Tier Levels).
  - Unlockable **Ancient Seals** (Bronze to Legendary) granting stats bonuses:
    - Attack Damage % Boost
    - Special Ability Power %
    - Max HP Boost
    - Movement Speed %
    - Shield Block Mitigation %

- **📱 Fully Responsive & Mobile-Ready:**
  - Adaptive UI with virtual touch joystick and dedicated action buttons (Attack, Block, Special, Dash) for touchscreen devices.

---

## 🕹️ Game Modes

### 1. ⚔️ PvP Ranked Arena (Multiplayer)
Challenge players across the globe in standard 1v1 duels. Create custom rooms with custom rounds or jump into existing public sessions. Includes rematch handling and round-end combat telemetry.

### 2. 🛡️ Solo Training & AI Tiers
Battle an adaptive bot that scales across 7 distinct difficulty tiers:
- **Tier 1 - Recruit Bot** (Low aggression, high telegraphing)
- **Tier 2 - Fighter Bot** (Learns to dodge)
- **Tier 3 - Veteran Bot** (Active blocking and combo chains)
- **Tier 4 - Elite Cybernetic** (High-speed movement)
- **Tier 5 - Master Warlord** (Aggressive special ability usage)
- **Tier 6 - Overlord Sentinel** (Quick counters and parries)
- **Tier 7 - Cosmic Legend** (Maximum combat aggression)

### 3. 🌀 Battle Royale (Wave Survival)
Face off against hordes of robotic invaders across progressive phases:
- **Phase 1: Vanguard Recon** (Light skirmishers)
- **Phase 2: Hunter Squad** (Coordinated flankers)
- **Phase 3: Heavy Strike** (Armored bruisers)
- **Final Phase: Apex Swarm** (Full arena warfare)

---

## 👥 Character Roster

| Character | Class | Weapon | Special Ability | Style |
| :--- | :--- | :--- | :--- | :--- |
| **Ronin Zero** | Cyber Samurai | Muramasa Plasma Katana | *Dragon's Edge* — Piercing line wave | Fast, Precision Slices |
| **Goliath MK-IV** | Armored Mecha | Seismic Graviton Gauntlets | *Orbital Impact* — 360° Ground Shockwave | High HP, Heavy Armor |
| **Aria Lumina** | Astral Valkyrie | Radiant Photon Spear | *Cosmic Shower* — Homing Light Missiles | High Mobility, Ranged |
| **Kage Vex** | Night Wraith | Void Spectral Daggers | *Phantom Warp* — Backstab Teleport | Critical Strikes, Stealth |
| **Custom Hero** | User Imported | Custom Rig | *Quantum Pulse* — Kinetic Burst | Custom 3D Model (`.glb`) |

---

## 🎮 Controls & Hotkeys

### Keyboard & Mouse

| Action | Primary Key | Secondary Key / Mouse | Description |
| :--- | :--- | :--- | :--- |
| **Move Forward** | `W` | `Up Arrow` | Walk / Run forward |
| **Move Backward** | `S` | `Down Arrow` | Walk / Run backward |
| **Move Left / Right** | `A` / `D` | `Left / Right Arrow` | Strafe sideways |
| **Light Attack** | `J` | `Left Mouse Click` | Fast melee combo attack |
| **Block / Parry** | `K` | `Right Mouse Click` | Defend (reduces damage by 75%+) |
| **Special Ability** | `L` | `E` | Cast unique class ultimate |
| **Dash / Evade** | `Space` | `Left Shift` | Quick directional dash (uses stamina) |
| **Camera Rotate** | Click + Drag | Trackpad | Orbit view around character |
| **Camera Zoom** | Scroll Wheel | Pinch | Adjust zoom distance |

### Mobile Touch Controls
- **Left Thumb:** Floating dynamic virtual thumbstick for smooth omnidirectional movement.
- **Right Thumb:** Dedicated action buttons for Attack, Block, Special Ability, and Dash.

---

## 🏗️ System Architecture

```
3D-Arena-Fighters/
├── server.ts                  # Authoritative Express + WebSocket game server
├── src/
│   ├── main.tsx               # Client bootstrap
│   ├── App.tsx                # Master state controller & view switcher
│   ├── types.ts               # Shared TypeScript schemas & protocol messages
│   ├── index.css              # Tailwind CSS entry
│   │
│   ├── components/            # UI & Overlay Components
│   │   ├── ArenaLogo.tsx      # Cyberpunk animated branding header
│   │   ├── BattleView.tsx     # 3D Canvas wrapper, HUD, health bars, controls
│   │   ├── CharacterSelectScreen.tsx # 3D character roster & GLB uploader
│   │   ├── HomeLobbyBrowser.tsx      # Room browser, matchmaking, filters
│   │   ├── LobbyView.tsx      # Pre-game staging area, player list, chat
│   │   └── SealsSanctuaryModal.tsx   # Seal progression & stats inspect
│   │
│   └── game/                  # Core Game Engine
│       ├── sound.ts           # Web Audio procedural sound synthesizer
│       ├── characterPresets.ts# Base hero stats, quotes, and descriptions
│       ├── battleProgress.ts  # Local storage progress, tier rankings, seals
│       ├── useGameSocket.ts   # React hook for client WebSocket lifecycle
│       └── three/
│           ├── BattleArenaStage.ts    # Three.js battle scene, physics, loop
│           ├── SelectionPreviewStage.ts # Three.js hero showroom stage
│           └── modelLoader.ts         # GLTF/GLB parser & mesh normalizer
```

### Networking Flow
1. **Connection:** Client establishes a persistent WebSocket connection (`ws://` or secure `wss://`).
2. **State Sync:** Player position, rotation, and animation state packets are transmitted at ~30–60Hz.
3. **Authoritative Combat:** Attacks are broadcast with origin/direction vectors; the server validates line-of-sight and proximity before applying damage and issuing `combat_hit` and `player_death` events.

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** / **pnpm**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/3d-arena-fighters.git
   cd 3d-arena-fighters
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

4. **Verify TypeScript compilation and linting:**
   ```bash
   npm run lint
   ```

---

## 📦 Production Build & Deployment

To bundle the client assets with Vite and package the backend server with `esbuild`:

```bash
npm run build
```

This generates:
- `dist/` containing the optimized client bundle.
- `dist/server.cjs` containing the bundled standalone Node.js server.

To run the production build:
```bash
npm start
```

---

## 🛠️ Technology Stack

- **Graphics:** [Three.js](https://threejs.org/) (Custom geometries, materials, particles, camera tracking)
- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Networking:** [ws (WebSocket)](https://github.com/websockets/ws), [Express](https://expressjs.com/)
- **Audio:** Web Audio API (`AudioContext`, procedural oscillators, gain nodes, biquad filters)
- **Animations & Effects:** [Motion](https://motion.dev/), [canvas-confetti](https://www.npmjs.com/package/canvas-confetti), [Lucide React](https://lucide.dev/)
- **Bundlers:** [Vite](https://vitejs.dev/), [esbuild](https://esbuild.github.io/), [tsx](https://github.com/privatenumber/tsx)

---

## 📄 License

This project is licensed under the **MIT License**. Feel free to use, modify, and distribute this software.
