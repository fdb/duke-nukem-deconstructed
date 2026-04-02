# Duke Nukem 3D Reverse Engineering Explorer

Web-based Build engine data explorer. React 19 + TypeScript + TanStack Router + Tailwind CSS v4 (zinc+orange, rounded-none) + React Three Fiber.

## Known-correct formulas (DO NOT CHANGE)

These have been verified against the original game and EDuke32 source. Changing them will break things.

### Coordinate mapping (Build -> Three.js)
- X -> X (scaled by 1/512)
- Y -> Z (scaled by 1/512)
- Z -> -Y (scaled by 1/8192)

### Angle conversion (Build -> Three.js)
Camera rotation (Three.js rotation.y is clockwise, Build angles are counter-clockwise):
```
rotation.y = -(buildAngle * 2 * Math.PI) / 2048 - Math.PI / 2
```

Sprite direction vector (wall/floor sprites — NOT the same as camera!):
```
ang = +(buildAngle * 2 * Math.PI) / 2048 - Math.PI / 2
```
Note the POSITIVE sign. This gives direction (sin(θ), -cos(θ)) in Build coords, matching
engine_priv.h get_wallspr_dims(). The camera uses negative because rotation.y is clockwise;
sprite directions use positive because cos/sin follow standard math convention.
The `-Math.PI / 2` offset accounts for the Build→Three.js coordinate rotation.

### Wall sprite quad winding
Vertices: TL, TR, BR, TL, BR, BL. UVs: `0,0 1,0 1,1 0,0 1,1 0,1` (normal, not reversed).
With the correct POSITIVE angle formula, TL lands at screen-LEFT when viewed from the front,
so normal UV mapping (u=0 at TL) produces correct (non-mirrored) textures.

### Wall texture UV repeat
From EDuke32 polymer.cpp line 3382-3383:
```
uRepeat = xrepeat * 8 / tileWidth    // independent of wall length!
vRepeat = heightZ * yrepeat / (tileHeight * 2048)
```
`heightZ` is raw Build Z units: `abs(sector.ceilingZ - sector.floorZ)`.

### Floor/ceiling UV
From EDuke32 polymer.cpp lines 2784-2832:
```
tex = wal->x
tey = -wal->y        // NOTE: Y is negated!
if (stat & 4) swap(tex, tey)   // bit 2: swap XY (90° rotation)
if (stat & 16) tex = -tex      // bit 4: flip X
if (stat & 32) tey = -tey      // bit 5: flip Y
scaleCoef = (stat & 8) ? 8 : 16  // bit 3: double expand
u = tex / (tileWidth * scaleCoef)
v = tey / (tileHeight * scaleCoef)
```
Stat bit 6 (64) = relative to first wall alignment: rotate UVs by first wall angle.
Panning: `xpanning` and `ypanning` add offsets (see polymer.cpp lines 2815-2829).

### Slope calculation
From EDuke32 engine.cpp getzsofslopeptr():
```
z_offset = heinum * perpDist / 256
```
Divisor is 256 (not 4096).

### Sprite sizing (EDuke32 Polymer)
- Face-camera: `xRatio = xRepeat * 0.20`, `yRatio = yRepeat * 0.25`
- Wall/floor: `xRatio = xRepeat * 0.25`, `yRatio = yRepeat * 0.25`
- Final size: `w = tileWidth * ratio / 512`, `h = tileHeight * ratio / 512`

### Parallax sky
- Bit 0 of `ceilingStat`/`floorStat` = parallax flag
- Skip floor/ceiling polygon for parallax sectors (don't render flat geometry)
- Sky uses sector's `ceilingPicnum` as base tile, tiles base+0..7 arranged in a cylinder
- Sky cylinder triangles must be wound CCW from inside (front-facing), use `side: FrontSide`

### Portal wall visibility (EDuke32 polymer.cpp lines 3654-3673)
- When BOTH current and adjacent sector have parallax ceiling, skip the upper wall
- When BOTH current and adjacent sector have parallax floor, skip the lower wall
- This prevents solid walls from appearing where sky-to-sky portals exist

### Masked walls (wall cstat bits 4-5)
- Bit 4 (16) = masked wall, bit 5 (32) = 1-way wall
- Render portal opening (adj floor to adj ceiling) with `overPicnum` and alpha testing
- Uses same UV formula as regular walls but with `overPicnum` texture

### Face sprite xOffset
Polymer converts face sprites to wall sprites facing the camera (pr_billboardingmode).
The xoff is applied in camera-local space via `glTranslatef(-xoff, yoff, 0)` after rotation.
Our billboard approach differs fundamentally — we apply xOff in world-X space as an
approximation (`fpx = px - xOff`). Camera-space application was tested and produced worse
results due to the different billboarding implementation. Keep as world-space for now.

### Sprite flip logic (EDuke32 polymer.cpp lines 4034-4053)
```
flipu = xflip XOR flooraligned   // floor sprites INVERT xflip
flipv = yflip AND NOT flooraligned  // floor sprites never flipv from yflip
if (flipu) xoff = -xoff
if (yflip && !face_sprite) yoff = -yoff
```
yCentered (cstat bit 7): face sprites adjust yoff directly, wall sprites use separate centeryoff.

### Sprite filtering
- `cstat & 0x8000` = invisible, skip
- `picnum < 11` = engine markers (SECTOREFFECTOR, ACTIVATOR, etc.), skip

## Project structure
- `src/lib/` - parsers (grp, map, art, palette, voc)
- `src/components/viewer/` - 3D viewer (scene, build-geometry, sprites, sky, fly-camera, hud, texture-atlas)
- `src/context/grp-context.tsx` - GRP file loading and data access
- `src/routes/` - TanStack Router pages
- `eduke32/` - EDuke32 source (reference only, gitignored)
- `public/DUKE3D.GRP` - bundled shareware GRP

## Build requirements
- All changes MUST pass `npm run build` (which runs `tsc -b && vite build`) before hand-off
- TypeScript strict mode: no unused variables, no unused imports

## Tailwind
Uses `@import "tailwindcss" source("../src")` to restrict scanning to src/ only (eduke32/ contains non-UTF8 C files that crash Tailwind).
