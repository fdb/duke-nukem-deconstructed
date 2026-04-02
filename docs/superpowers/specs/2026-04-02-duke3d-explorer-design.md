# Duke Nukem 3D Reverse Engineering Explorer — Design Spec

## Overview

A web application that tears down the Duke Nukem 3D shareware version (v1.3d) through a set of interconnected pages, each explaining a different part of the Build engine. All game data is parsed client-side in TypeScript directly from the original DUKE3D.GRP file. The centrepiece is a Three.js-based 3D level viewer with free-fly camera and textured/wireframe rendering.

## Tech Stack

| Tool | Role |
|------|------|
| React 19 | UI framework |
| TypeScript | All code, strict mode |
| TanStack Router | File-based routing |
| Tailwind CSS v4 | Styling — zinc + orange palette, `rounded-none` globally |
| Vite | Build tool, dev server |
| React Three Fiber | 3D viewer |
| Three.js | WebGL rendering |
| @react-three/drei | R3F helpers (PointerLockControls, etc.) |

## Design Language

- **Background:** zinc-900
- **Text:** zinc-100 primary, zinc-400 secondary
- **Accents:** orange-500 (links, active states, highlights)
- **Corners:** flat everywhere (`rounded-none`)
- **Data views:** monospace font (for hex dumps, file listings, CON source)
- **Layout:** top navigation bar with page links, no sidebar, content fills viewport
- **Responsive:** desktop-first, functional on tablet. 3D viewer is desktop-only (pointer lock)

## Data Architecture

### Loading Flow

```
public/DUKE3D.GRP → fetch() → ArrayBuffer → parseGrp() → GrpArchive → React context → all pages
```

The shareware GRP (10.5 MB, 215 files) is bundled in `public/` and fetched on app init. The shareware license explicitly permits free redistribution.

### Parser Library (`src/lib/`)

Pure TypeScript parsers with no side effects. Each takes an `ArrayBuffer` or `DataView` and returns typed data structures.

#### `grp.ts` — GRP Container

The GRP format (by Ken Silverman):
- 12-byte magic: `KenSilverman`
- 4-byte LE uint32: file count
- Directory: `count` entries of 12-byte null-padded filename + 4-byte LE uint32 size
- File data follows sequentially

Returns a `GrpArchive` with a method to extract any file by name as an `ArrayBuffer`.

#### `palette.ts` — Palette & Shade Tables

PALETTE.DAT contains:
- 768 bytes: 256 RGB triplets (0–63 range, must multiply by 4 for 0–255)
- 256 × 32 shade table: maps (color index, shade level) → new color index
- Translucency table

LOOKUP.DAT contains palette remapping tables (water tint, night vision, etc.).

Returns typed arrays for the palette and shade/lookup tables.

#### `art.ts` — ART Tile Decoding

Each TILES###.ART file:
- Header: version (4 bytes), numtiles (4 bytes), localtilestart (4 bytes), localtileend (4 bytes)
- `N` x int16 array: tile widths
- `N` x int16 array: tile heights
- `N` x int32 array: picanm (animation data — frame count, type, speed, x/y offset)
- Pixel data: column-major, 1 byte per pixel (palette index), index 255 = transparent

Returns tile metadata and a method to render any tile to RGBA `ImageData` given a palette.

#### `map.ts` — MAP Parsing

Build engine MAP v7 format:
- Header: version, player start (x, y, z, angle, sector)
- Sectors array (40 bytes each): ceiling/floor heights, textures, slopes, tags, visibility
- Walls array (32 bytes each): x, y, next wall, next sector, textures, flags, panning
- Sprites array (44 bytes each): x, y, z, texture, flags, sector, angle, status

Returns fully typed `BuildMap` with `Sector[]`, `Wall[]`, `Sprite[]`.

Slope data: sectors have `ceilingheinum` and `floorheinum` fields (slope angle as fixed-point).

#### `voc.ts` — Creative VOC Audio

Creative Voice File format:
- 19-byte header: "Creative Voice File" + version + data offset
- Blocks: type byte + 3-byte size + data
- Block type 1: sound data (sample rate byte, compression, PCM samples)

Returns PCM `Float32Array` and sample rate, ready for Web Audio API playback.

### State Management

`src/context/grp-context.tsx` — React context provider:
- Fetches and parses the GRP on mount
- Exposes `GrpArchive` to all pages
- Loading state with progress indicator
- Parsed sub-resources (palette, art tiles, maps) are memoized on first access

No external state library. React context + `useMemo` for derived data is sufficient.

## Pages

### `/` — Home

Hero introduction: what is Duke Nukem 3D, the Build engine, and what this explorer does. Grid of cards linking to each section. Background: slowly orbiting wireframe render of E1L1 (using the same R3F viewer component in orbit mode, wireframe only).

### `/archive` — The Archive

Explains the SHR self-extracting PKZIP format. Shows:
- Hex view of the first ~256 bytes (MZ header, PKLITE signature)
- Table of all files extracted from the archive with sizes and type descriptions
- Context paragraph about BBS/shareware distribution in 1996

### `/grp` — GRP Container

Interactive exploration of the GRP format:
- Hex view of the GRP header (highlighting "KenSilverman" magic, file count)
- Sortable/filterable table of all 215 files with name, size, type
- Click any file entry to navigate to the relevant page (e.g., clicking a .MAP goes to `/maps`, a .ART goes to `/tiles`)
- Explanation of the format structure with annotated byte diagrams

### `/palette` — Palette & Shade Tables

Visualizing the colour system:
- 16×16 grid of all 256 palette colours
- Shade table visualizer: select a colour and see its 32 shade levels as a gradient strip
- Lookup remap display: dropdown to pick a remap table (water, night vision, etc.), shows the full palette transformed
- Explanation of how 256-colour indexed rendering works

### `/tiles` — ART Tiles

Browsable grid of all tiles from all 13 ART files:
- Filterable by ART file, tile size, or animation status
- Click a tile to see: full-size render, dimensions, animation frames (if animated), picanm data
- Toggle between indexed view (raw palette indices as greyscale) and palette-applied colour view
- Explanation of column-major pixel storage and the ART format

### `/maps` — MAP Format

Level explorer with 2D overhead view:
- Level selector: E1L1–E1L6 with names (Hollywood Holocaust, Red Light District, etc.)
- 2D Canvas or SVG rendering of sectors (filled polygons) and walls (lines)
- Click a sector to see: floor/ceiling heights, texture numbers (linking to `/tiles`), tags, slope data
- Click a wall to see: texture, next sector, flags
- Sprites shown as small icons at their positions
- "Open in 3D" button linking to `/viewer/:map`
- Explanation of Build engine 2.5D geometry: sectors, walls, sprites, portals

### `/viewer/:map` — 3D Level Viewer

Full-viewport React Three Fiber scene:
- **Geometry construction** from parsed MAP data:
  - Sectors → floor and ceiling polygons (triangulated from wall loops), with slope applied
  - Walls → quads between adjacent wall points at floor/ceiling heights; upper/lower sections for height differences between adjoining sectors
  - Sprites → billboard quads (face-camera), floor-aligned, or wall-aligned depending on sprite flags
- **Textures:** ART tiles applied via the palette, uploaded as Three.js `DataTexture`
- **Free-fly camera:** PointerLockControls + WASD/QE (up/down), Shift for speed boost
- **Render modes:** toggle between textured and wireframe (Three.js `wireframe: true` on materials)
- **HUD overlay:** current position, sector, FPS counter, render mode indicator, level picker dropdown
- Click to enter pointer lock, Escape to release

### `/scripts` — CON Scripting

Exploration of the game scripting language:
- Syntax-highlighted display of GAME.CON, USER.CON, DEFS.CON
- Explanation of key constructs: `actor`, `state`, `move`, `ai`, `action`
- Click an actor definition to see its sprite tile (cross-link to `/tiles`)
- Click a `define` to see what it maps to (sound number → `/audio`, tile number → `/tiles`)

### `/audio` — Audio

Sound browser:
- Table of all 181 VOC files with name, size, duration
- Click to play using Web Audio API (decode VOC → PCM → AudioBuffer)
- Simple waveform visualization for the playing sound
- MIDI section: list of 7 MID files with names (GRABBAG = main theme, etc.)
- MIDI playback if feasible (using a Web MIDI library or noting it as future work)
- Explanation of Creative Voice File format

## Cross-Linking Strategy

Every reference to a related concept is a `<Link>` to its page:
- Tile numbers in map/sector views → `/tiles` (scrolled to that tile)
- Map names in GRP listing → `/maps`
- Sound numbers in CON scripts → `/audio`
- Palette references in tile views → `/palette`
- "View in 3D" from map overview → `/viewer/:map`

## Project Structure

```
src/
  lib/                    # Pure parsers
    grp.ts
    art.ts
    map.ts
    palette.ts
    voc.ts
    types.ts              # Shared type definitions
  context/
    grp-context.tsx       # GRP loading + React context
  components/
    layout.tsx            # Top nav + page shell
    hex-view.tsx          # Reusable hex dump viewer
    tile-renderer.tsx     # Canvas-based tile rendering
    map-2d.tsx            # 2D overhead map view
    viewer/
      scene.tsx           # Main R3F scene
      geometry.ts         # MAP → Three.js geometry conversion
      camera.tsx          # Free-fly camera controller
      materials.ts        # Texture/wireframe material management
  routes/
    __root.tsx
    index.tsx             # /
    archive.tsx           # /archive
    grp.tsx               # /grp
    palette.tsx           # /palette
    tiles.tsx             # /tiles
    maps.tsx              # /maps
    viewer.$map.tsx       # /viewer/:map
    scripts.tsx           # /scripts
    audio.tsx             # /audio
public/
  DUKE3D.GRP              # Bundled shareware GRP
```

## Build Engine Format Summary

For reference during implementation:

| Format | Magic/Signature | Key sizes |
|--------|----------------|-----------|
| GRP | `KenSilverman` (12 bytes) | 16-byte directory entries |
| MAP v7 | version=7 (uint32) | Sector: 40 bytes, Wall: 32 bytes, Sprite: 44 bytes |
| ART v1 | version=1 (uint32) | Variable per tile, column-major pixels |
| PALETTE.DAT | (none) | 768 + 8192 + 256*256 bytes |
| VOC | `Creative Voice File\x1a` | Block-structured |

## Scope Boundaries

**In scope:**
- All 9 pages as described
- Full geometry parsing including slopes
- Sprite rendering as billboards
- Textured + wireframe modes
- VOC playback via Web Audio
- Cross-linking between all pages

**Out of scope (future work):**
- MIDI playback (complex, needs soundfont)
- Animated sprites in the 3D viewer
- Collision detection / walk mode
- Sector effects (moving doors, elevators)
- Multiplayer demo playback (.DMO files)
- Mobile-optimized 3D viewer
