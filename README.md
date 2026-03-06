# Marble Expedition

An interactive browser-based world exploration prototype showcasing the
**World Labs Marble API** + **SparkJS** + **Three.js** stack.

Explore a bioluminescent canyon filled with ancient ruins and floating pathways.
Discover and activate 5 hidden beacons to awaken the world and open a portal
to new realms.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Marble Expedition                   │
├──────────┬──────────┬──────────┬─────────┬──────────┤
│ World    │ SparkJS  │ Three.js │ Game    │ Network  │
│ Labs API │ Renderer │ Scene    │ Systems │ Layer    │
│ Client   │          │          │         │          │
├──────────┴──────────┴──────────┴─────────┴──────────┤
│            Browser (WebGL2 / Canvas)                 │
└─────────────────────────────────────────────────────┘
```

### What each layer does

| Layer | Role |
|-------|------|
| **World Labs API Client** (`src/worldlabs/`) | Generates or loads Marble worlds via the World API (`POST /worlds:generate`). Uses `WLT-Api-Key` header auth. Polls `GET /operations/{id}` until done, then fetches world assets including SPZ splat URLs, collider mesh (GLB), and panorama. Falls back to a convincing mock generation flow when no API key is configured. Supports both `marble-0.1-plus` (quality) and `marble-0.1-mini` (speed) models. |
| **SparkJS Renderer** (`src/renderer/`) | Renders Marble SPZ gaussian-splat assets in the browser using `@sparkjsdev/spark` (`SplatMesh`). SplatMesh extends `THREE.Object3D` — loads `.spz` files directly and integrates into the Three.js scene graph. SparkRenderer handles GPU-based splat sorting automatically. Falls back to a procedural world with splat-inspired particles when no real SPZ assets are available. |
| **Three.js Scene** (`src/game/scene-setup.ts`) | Creates the rendering context, lighting, sky, fog, and post-processing. Controls the WebGL renderer and camera. |
| **Game Systems** (`src/game/`) | Player controller (WASD + mouse look), beacon/objective system, portal effects, world transformation events. |
| **UI / HUD** (`src/ui/`) | Title screen, loading screen with progress, in-game HUD (objectives, compass, beacon count, interact prompts, notifications), and completion screen. |
| **Network Layer** (`src/network/`) | Ghost explorer system with architecture for WebSocket multiplayer. Simulated remote players wander the world. Clear extension points for real networking. |

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Controls

| Key | Action |
|-----|--------|
| **Click** | Lock mouse cursor |
| **WASD** | Move |
| **Mouse** | Look around |
| **Shift** | Sprint |
| **Space** | Jump |
| **E** | Activate beacon (when nearby) |
| **P** | Toggle photo mode (free camera) |
| **Esc** | Release cursor |

## Configuration

### World Labs API Key

To use the real Marble API for world generation:

1. Get an API key at https://platform.worldlabs.ai
2. Copy `.env.example` to `.env`
3. Add your World Labs API key:
   ```
   VITE_WORLDLABS_API_KEY=your_api_key_here
   ```
4. Restart the dev server

The API uses `WLT-Api-Key` header authentication. Pricing: $1 = 1,250 credits
(minimum purchase $5). The prototype defaults to `marble-0.1-mini` (fast, ~30-45s)
but can be switched to `marble-0.1-plus` (quality, ~5 min) in `src/main.ts`.

Without an API key, the prototype uses a procedural world fallback that
simulates what a Marble-generated world looks and feels like.

### URL Parameters

| Parameter | Description |
|-----------|-------------|
| `WORLDLABS_API_KEY` | API key (alternative to .env) |
| `room` | Multiplayer room ID |

## Multiplayer

The prototype includes a ghost explorer system — simulated remote players
that wander the world to create a social atmosphere.

### Current implementation
- Mock transport spawns 2-3 ghost explorers on connect
- Ghosts move along procedural paths through the world
- Player count shown in HUD
- Join/leave notifications displayed

### Upgrading to real multiplayer

1. Deploy the WebSocket room server (see `src/network/server-spec.ts`)
2. Replace `MockTransport` with `WebSocketTransport` in `multiplayer.ts`
3. Pass the server URL when constructing the transport
4. Protocol: player transforms synced at 10 Hz, beacon activations broadcast to room

## Demo Script

**Suggested live walkthrough (3-5 minutes):**

1. **Title screen** (10s) — Point out the tech stack badge. Click "Enter World".
2. **Loading** (15s) — Watch the Marble API progress stages. Explain what each
   stage represents (spatial layout → gaussian splats → optimization).
3. **First vista** (15s) — Don't move. Take in the bioluminescent canyon, the
   floating pathways, the central monument, the stars.
4. **Click to lock cursor** — Begin exploring. Sprint (Shift) toward the nearest
   glowing beacon pillar.
5. **Activate first beacon** (30s) — Walk near it, press E. Watch the crystal
   intensify, the beam of light shoot up, the particle burst.
6. **Explore and activate 2-3 more beacons** (2 min) — Point out: ghost explorers
   in the distance, compass direction, objective tracker updating.
7. **Toggle photo mode** (15s) — Press P. Fly to a dramatic angle. Show the world
   from above.
8. **Activate final beacon** (30s) — Watch the world transformation: materials
   brighten, portal opens above the central monument, fog shifts, sky changes.
9. **Completion screen** — Shows expedition summary.

## Mocked Pieces & Shortcuts

| Feature | Status | Notes |
|---------|--------|-------|
| Marble API world generation | **Mock fallback** | Full API client implemented with real endpoints (`/worlds:generate`, `/operations/{id}`, `/worlds/{id}`). Simulated progress flow when no API key configured. Add key to use live generation. |
| SparkJS rendering | **Integrated + fallback** | `@sparkjsdev/spark` SplatMesh is imported and used when real SPZ assets are available. Procedural Three.js world with splat-inspired particles used when running without Marble API. |
| Multiplayer | **Ghost mode** | Simulated remote players. WebSocket transport class included but uses mock. Server spec documented. |
| Collision detection | **Approximate** | Ground plane + bounds clamping. No mesh-level collision. |
| Sound / Music | **Not included** | Would add Web Audio API ambient layers + beacon activation SFX. |

## Next Steps

1. **Add Marble API key** — Set `VITE_WORLDLABS_API_KEY` to generate real worlds
2. **Test with live SPZ assets** — SplatMesh integration is ready; real SPZ URLs from API will render automatically
3. **Deploy multiplayer server** — WebSocket room server per `server-spec.ts`
4. **Add audio** — Ambient soundscape, beacon activation sounds, music transitions
5. **Multiple worlds** — Generate from different prompts, portal between them
6. **Photo mode screenshots** — Canvas capture + download
7. **Shared emotes/pings** — Multiplayer social features

## Tech Stack

- **Vite** — Build tool and dev server
- **TypeScript** — Type-safe application code
- **Three.js** — 3D rendering, camera, player controls, effects
- **World Labs Marble API** — AI world generation (real API client with `WLT-Api-Key` auth)
- **@sparkjsdev/spark** (SparkJS) — GPU-accelerated gaussian splat renderer for Three.js (SplatMesh loads .spz files)

## Project Structure

```
src/
├── main.ts                    # Entry point, orchestrates all systems
├── worldlabs/
│   ├── client.ts              # Marble API client with mock fallback
│   └── types.ts               # API type definitions (Marble v1 schema)
├── renderer/
│   └── sparkjs-renderer.ts    # SplatMesh integration + procedural fallback
├── game/
│   ├── scene-setup.ts         # Three.js scene, lighting, sky
│   ├── player-controller.ts   # WASD + mouse look controller
│   └── beacon-system.ts       # Beacon discovery & activation
├── ui/
│   ├── hud.ts                 # In-game HUD overlay
│   └── screens.ts             # Title, loading, completion screens
└── network/
    ├── multiplayer.ts         # Ghost explorers + multiplayer stub
    └── server-spec.ts         # WebSocket server documentation
```
