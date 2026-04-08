# Dust2 FPS

A browser-based first person shooter game inspired by CS2's classic Dust2 map.

## Features

- **Classic Dust2 Map** - Tunnels, bombsites A/B, ramps and cover positions
- **Multiple Weapons**:
  - AK-47 (Key 1) - 30 rounds, 34 damage per shot
  - Remington 870 (Key 2) - 8 shells, 8 pellets shotgun
  - Knife (Key 3) - 65 damage, melee weapon
- **Realistic Movement** - WASD movement, sprint (Shift), jump (Space)
- **Weapon Mechanics** - Recoil, reload animations, weapon switching
- **Enemy AI** - Enemies patrol, chase and attack players
- **Hit Detection** - Raycasting with wall blocking
- **FPS Controls** - Pointer lock mouse capture

## Controls

| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Look around |
| Left Click | Shoot |
| Space | Jump |
| Shift | Sprint |
| R | Reload |
| 1/2/3 | Switch weapon |
| ESC | Release cursor |

## Tech Stack

- Three.js for 3D rendering
- TypeScript
- Vite build tool

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build
```

## Play Online

Open `index.html` in a browser or serve the `dist` folder.
