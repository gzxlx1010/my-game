# Dust2 FPS - CS2 Style First Person Shooter

## Project Overview
A browser-based first person shooter inspired by CS2's classic Dust2 map. Built with Three.js for 3D rendering, featuring:
- Classic Dust2 map layout with tunnels, bombsites, and cover positions
- First-person perspective with full WASD + mouse controls
- 3D AK47 weapon model with recoil animation
- Collision detection with walls and objects
- Realistic walking simulation with head bob
- Breathing camera effects
- Footstep sounds
- UI controls panel with animations

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
│   ├── Weapon.ts          # Weapon base class (abstract)
│   ├── AK47.ts            # AK47 weapon implementation
│   ├── Enemy.ts           # Enemy AI system
│   ├── ShootingSystem.ts  # Raycasting & hit detection
│   └── style.css          # UI styling (crosshair, HUD, controls panel)
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

### 1. FPS Controller
- Pointer lock mouse capture
- Smooth movement with collision detection
- WASD movement with acceleration
- Jump mechanics with landing effect
- Walking state detection

### 2. Walking Simulation
- Head bob animation synchronized with footsteps
- Footstep sounds (Web Audio API)
- Landing impact effect
- Movement speed variation (slower when idle)

### 3. Breathing System
- Subtle FOV breathing effect
- Camera sway from breathing
- Intensity varies with movement state

### 4. Dust2 Map
- Platforms, tunnels, bombsites (A/B)
- Ramps, cover boxes, pillars
- Gradient skybox with fog
- Dynamic lighting

### 5. AK47 Weapon
- Procedural 3D model
- Recoil animation on fire
- Movement bob synchronized with player
- Breathing sway
- Muzzle flash effect
- Ammo system (30 rounds)
- Reload animation with R key

### 6. Weapon System (Extensible)
- Abstract `Weapon` base class
- `WeaponConfig` interface for weapon properties
- Configurable: fireRate, damage, maxAmmo, reloadTime
- Easy to add new weapons (M4A1, AWP, etc.)

### 7. Shooting System
- Raycasting hit detection
- Hit markers on successful kills
- Damage calculation based on weapon config
- AK47: 34 damage per shot (3 hits to kill)

### 8. Enemy System
- Enemy spawning at key map locations (A site, B site, tunnels, mid)
- State machine: idle, patrol, chase, attack, dying, dead
- Alert range detection (80 units)
- Attack range (15 units)
- Collision avoidance with walls
- Visual state indication (gray=idle, orange=patrol, red=chase/attack)
- Death animation (falling + fading)
- Auto respawn after 5 seconds
- Up to 8 enemies can be spawned

### 9. UI System
- Crosshair with dot
- Weapon info display
- Animated controls panel
- Movement status indicator
- Start screen with animations

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
3. Controls panel animates in
4. Click again to lock cursor
5. WASD to move, mouse to look
6. Left click to shoot
7. Space to jump
8. ESC to release cursor

## Audio Features
- Footstep sounds on walking (Web Audio API oscillator)
- Sounds trigger at regular intervals while moving
