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
│   ├── LevelSystem.ts     # Level system with 4 levels
│   ├── Enemy.ts           # Enemy AI system
│   ├── Medkit.ts          # Medkit healing items
│   ├── DecalSystem.ts     # Bullet hole decals
│   ├── Weapon.ts          # Weapon base class (abstract)
│   ├── AK47.ts            # AK47 weapon implementation
│   ├── Remington.ts       # Shotgun implementation
│   ├── Knife.ts           # Melee weapon implementation
│   ├── ShootingSystem.ts  # Raycasting & hit detection
│   └── style.css          # UI styling
├── .coze                   # Project configuration
└── package.json
```

## Game Flow
1. Page loads with start screen
2. Click "CLICK TO PLAY" to start
3. Level 1 starts automatically (Desert theme)
4. Kill enemies to progress (kill counter on right side)
5. When kill target reached, portal spawns
6. Enter portal to advance to next level
7. Complete all 4 levels to win

## Controls
- **WASD / Arrow Keys**: Move forward/back/strafe
- **Mouse**: Look around (click to lock cursor)
- **Left Click**: Shoot (muzzle flash + recoil)
- **Right Click**: Aim down sights
- **R**: Reload weapon
- **Space**: Jump
- **E**: Use medkit (when nearby)
- **1/2/3**: Switch weapons (AK47/Remington/Knife)
- **ESC**: Release cursor lock

## Audio Features
- Footstep sounds on walking (Web Audio API oscillator)
- Sounds trigger at regular intervals while moving
