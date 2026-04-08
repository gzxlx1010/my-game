# Dust2 FPS - CS2 Style First Person Shooter

## Project Overview
A browser-based first person shooter inspired by CS2's classic Dust2 map. Built with Three.js for 3D rendering, featuring:
- Classic Dust2 map layout with tunnels, bombsites, and cover positions
- First-person perspective with full WASD + mouse controls
- 3D AK47 weapon model with recoil animation
- Collision detection with walls and objects

## Tech Stack
- **Renderer**: Three.js 0.183
- **Build Tool**: Vite 8.0
- **Language**: TypeScript 6.0

## Project Structure
```
/workspace/projects/
├── index.html              # Game entry HTML
├── src/
│   ├── main.ts            # Game initialization & loop
│   ├── FPSController.ts   # First-person movement & look controls
│   ├── Dust2Map.ts        # Map generation & collision objects
│   ├── AK47.ts            # Weapon model & animations
│   └── style.css          # UI styling (crosshair, HUD, start screen)
├── .coze                   # Project configuration
└── package.json
```

## Controls
- **WASD / Arrow Keys**: Move forward/back/strafe
- **Mouse**: Look around (click to lock cursor)
- **Left Click**: Shoot (muzzle flash + recoil)
- **Space**: Jump
- **ESC**: Release cursor lock

## Key Features
1. **FPS Controller**: Pointer lock mouse capture, smooth movement with collision detection
2. **Dust2 Map**: Platforms, tunnels, bombsites (A/B), ramps, cover boxes
3. **AK47 Weapon**: Procedural 3D model with:
   - Recoil animation on fire
   - Movement bob
   - Muzzle flash effect

## Build & Run
```bash
pnpm install     # Install dependencies
pnpm dev         # Start dev server (port 5000)
pnpm build       # Production build
pnpm preview     # Preview production build
```

## Game Flow
1. Page loads with start screen
2. Click "CLICK TO PLAY" to start
3. Click again to lock cursor
4. WASD to move, mouse to look
5. Left click to shoot
