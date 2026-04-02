# Duke3D Reverse Engineering Explorer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-page web app that tears down Duke Nukem 3D shareware through interactive visualizations of every Build engine format, culminating in a Three.js 3D level viewer.

**Architecture:** Pure TypeScript parsers (`src/lib/`) decode all Build engine formats client-side from the bundled DUKE3D.GRP. A React context provides the parsed archive to all pages. TanStack Router handles file-based routing. React Three Fiber powers the 3D viewer.

**Tech Stack:** React 19, TypeScript (strict), TanStack Router (file-based), Tailwind CSS v4 (zinc+orange, rounded-none), Vite, React Three Fiber, Three.js, @react-three/drei

**Design spec:** `docs/superpowers/specs/2026-04-02-duke3d-explorer-design.md`

---

## File Structure

```
src/
  lib/
    grp.ts              # GRP container parser
    grp.test.ts         # GRP parser tests
    palette.ts          # PALETTE.DAT + LOOKUP.DAT parser
    palette.test.ts     # Palette parser tests
    art.ts              # ART tile decoder
    art.test.ts         # ART decoder tests
    map.ts              # MAP v7 parser
    map.test.ts         # MAP parser tests
    voc.ts              # Creative VOC → PCM decoder
    voc.test.ts         # VOC decoder tests
    types.ts            # Shared type definitions
  context/
    grp-context.tsx     # GRP loading + React context provider
  components/
    layout.tsx          # Top nav bar + page shell (Outlet)
    hex-view.tsx        # Reusable hex dump component
    tile-canvas.tsx     # Canvas-based single tile renderer
    map-2d.tsx          # 2D overhead map canvas
    viewer/
      scene.tsx         # Main R3F Canvas + scene
      build-geometry.ts # MAP data → Three.js BufferGeometry
      fly-camera.tsx    # PointerLock + WASD free-fly controller
      hud.tsx           # Position/sector/FPS overlay
  routes/
    __root.tsx          # Root layout route
    index.tsx           # / — Home
    archive.tsx         # /archive
    grp.tsx             # /grp
    palette.tsx         # /palette
    tiles.tsx           # /tiles
    maps.tsx            # /maps
    viewer.$map.tsx     # /viewer/:map
    scripts.tsx         # /scripts
    audio.tsx           # /audio
public/
  DUKE3D.GRP            # Bundled shareware GRP (10.5 MB)
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.ts`, `index.html`, `src/main.tsx`, `src/app.css`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routeTree.gen.ts`
- Create: `vitest.config.ts`
- Copy: `public/DUKE3D.GRP`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd /Users/fdb/ReverseEngineering/duke-nukem-3d
npm create vite@latest app -- --template react-ts
```

Move contents out of `app/` into the project root:

```bash
mv app/* app/.* . 2>/dev/null; rmdir app
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @tanstack/react-router @tanstack/router-devtools @react-three/fiber @react-three/drei three
npm install -D @tanstack/router-plugin @types/three vitest tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Vite with TanStack Router plugin and Tailwind**

Replace `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

export default defineConfig({
  plugins: [TanStackRouterVite({}), react(), tailwindcss()],
});
```

- [ ] **Step 4: Configure vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 5: Set up Tailwind with zinc+orange theme**

Replace `src/app.css` (or `src/index.css` — whichever Vite created):

```css
@import "tailwindcss";

:root {
  --color-accent: oklch(0.646 0.222 41.116); /* orange-500 */
  --color-accent-light: oklch(0.744 0.183 55.934); /* orange-400 */
}

* {
  border-radius: 0 !important;
}

body {
  @apply bg-zinc-900 text-zinc-100 antialiased;
  font-family: system-ui, -apple-system, sans-serif;
}

a {
  @apply text-orange-500 hover:text-orange-400 underline-offset-2;
}

code, .mono {
  font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
}
```

- [ ] **Step 6: Set up TanStack Router root route**

Create `src/routes/__root.tsx`:

```tsx
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen">
      <Outlet />
    </div>
  ),
});
```

Create `src/routes/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-orange-500">
        Duke Nukem 3D — Reverse Engineering Explorer
      </h1>
      <p className="mt-4 text-zinc-400">Loading...</p>
    </div>
  ),
});
```

- [ ] **Step 7: Set up main entry point**

Replace `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./app.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

- [ ] **Step 8: Copy DUKE3D.GRP to public/**

```bash
mkdir -p public
cp extracted/DUKE3D.GRP public/DUKE3D.GRP
```

- [ ] **Step 9: Generate route tree and verify dev server**

```bash
npx tsr generate
npm run dev
```

Open in browser — should show the placeholder home page with orange title on zinc-900 background.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "scaffold: Vite + React + TanStack Router + Tailwind + R3F"
```

---

### Task 2: GRP Parser

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/grp.ts`
- Create: `src/lib/grp.test.ts`

- [ ] **Step 1: Define shared types**

Create `src/lib/types.ts`:

```ts
export interface GrpEntry {
  name: string;
  size: number;
  offset: number;
}

export interface GrpArchive {
  files: GrpEntry[];
  getFile(name: string): ArrayBuffer;
  getFileBytes(name: string): Uint8Array;
  buffer: ArrayBuffer;
}

export interface Palette {
  /** 256 RGB triplets, 0-255 range */
  colors: Uint8Array;
  /** 32 shade levels × 256 colors → remapped color index */
  shadeTable: Uint8Array;
  /** Number of shade levels (typically 32) */
  numShades: number;
}

export interface LookupTable {
  /** 256-byte remap: paletteIndex → newPaletteIndex */
  remap: Uint8Array;
}

export interface ArtTile {
  width: number;
  height: number;
  /** Animation frames (0 = not animated) */
  animFrames: number;
  /** Animation type: 0=none, 1=oscillate, 2=forward, 3=backward */
  animType: number;
  /** X offset for rendering */
  xOffset: number;
  /** Y offset for rendering */
  yOffset: number;
  /** Animation speed */
  animSpeed: number;
  /** Raw column-major pixel data (palette indices). Empty if 0×0 tile. */
  pixels: Uint8Array;
}

export interface ArtFile {
  firstTile: number;
  lastTile: number;
  tiles: ArtTile[];
}

export interface BuildSector {
  wallPtr: number;
  wallNum: number;
  ceilingZ: number;
  floorZ: number;
  ceilingStat: number;
  floorStat: number;
  ceilingPicnum: number;
  ceilingHeinum: number;
  ceilingShade: number;
  ceilingPal: number;
  ceilingXPanning: number;
  ceilingYPanning: number;
  floorPicnum: number;
  floorHeinum: number;
  floorShade: number;
  floorPal: number;
  floorXPanning: number;
  floorYPanning: number;
  visibility: number;
  loTag: number;
  hiTag: number;
  extra: number;
}

export interface BuildWall {
  x: number;
  y: number;
  point2: number;
  nextWall: number;
  nextSector: number;
  cstat: number;
  picnum: number;
  overPicnum: number;
  shade: number;
  pal: number;
  xRepeat: number;
  yRepeat: number;
  xPanning: number;
  yPanning: number;
  loTag: number;
  hiTag: number;
  extra: number;
}

export interface BuildSprite {
  x: number;
  y: number;
  z: number;
  cstat: number;
  picnum: number;
  shade: number;
  pal: number;
  clipDist: number;
  xRepeat: number;
  yRepeat: number;
  xOffset: number;
  yOffset: number;
  sectNum: number;
  statNum: number;
  ang: number;
  owner: number;
  xVel: number;
  yVel: number;
  zVel: number;
  loTag: number;
  hiTag: number;
  extra: number;
}

export interface BuildMap {
  version: number;
  playerStart: { x: number; y: number; z: number; ang: number; sector: number };
  sectors: BuildSector[];
  walls: BuildWall[];
  sprites: BuildSprite[];
}
```

- [ ] **Step 2: Write GRP parser tests**

Create `src/lib/grp.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseGrp } from "./grp";

function makeGrp(files: { name: string; data: Uint8Array }[]): ArrayBuffer {
  const magic = new TextEncoder().encode("KenSilverman");
  const dirSize = 16 * files.length;
  const dataSize = files.reduce((s, f) => s + f.data.length, 0);
  const buf = new ArrayBuffer(12 + 4 + dirSize + dataSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  bytes.set(magic, 0);
  view.setUint32(12, files.length, true);

  let offset = 16;
  for (const f of files) {
    const nameBytes = new TextEncoder().encode(f.name);
    bytes.set(nameBytes.slice(0, 12), offset);
    view.setUint32(offset + 12, f.data.length, true);
    offset += 16;
  }
  for (const f of files) {
    bytes.set(f.data, offset);
    offset += f.data.length;
  }
  return buf;
}

describe("parseGrp", () => {
  it("parses magic and file count", () => {
    const grp = makeGrp([
      { name: "TEST.TXT", data: new Uint8Array([72, 73]) },
    ]);
    const archive = parseGrp(grp);
    expect(archive.files).toHaveLength(1);
    expect(archive.files[0].name).toBe("TEST.TXT");
    expect(archive.files[0].size).toBe(2);
  });

  it("extracts file data correctly", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const grp = makeGrp([{ name: "DATA.BIN", data }]);
    const archive = parseGrp(grp);
    const extracted = new Uint8Array(archive.getFile("DATA.BIN"));
    expect(extracted).toEqual(data);
  });

  it("handles multiple files", () => {
    const grp = makeGrp([
      { name: "A.TXT", data: new Uint8Array([65]) },
      { name: "B.TXT", data: new Uint8Array([66, 67]) },
    ]);
    const archive = parseGrp(grp);
    expect(archive.files).toHaveLength(2);
    expect(new Uint8Array(archive.getFile("A.TXT"))).toEqual(new Uint8Array([65]));
    expect(new Uint8Array(archive.getFile("B.TXT"))).toEqual(new Uint8Array([66, 67]));
  });

  it("throws on invalid magic", () => {
    const buf = new ArrayBuffer(16);
    expect(() => parseGrp(buf)).toThrow("Invalid GRP");
  });
});
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npx vitest run src/lib/grp.test.ts
```

Expected: FAIL — `parseGrp` does not exist.

- [ ] **Step 4: Implement GRP parser**

Create `src/lib/grp.ts`:

```ts
import type { GrpArchive, GrpEntry } from "./types";

const MAGIC = "KenSilverman";

export function parseGrp(buffer: ArrayBuffer): GrpArchive {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("ascii");

  const magic = decoder.decode(bytes.slice(0, 12));
  if (magic !== MAGIC) {
    throw new Error("Invalid GRP: bad magic");
  }

  const fileCount = view.getUint32(12, true);
  const files: GrpEntry[] = [];
  let dataOffset = 16 + fileCount * 16;

  for (let i = 0; i < fileCount; i++) {
    const entryOffset = 16 + i * 16;
    const nameBytes = bytes.slice(entryOffset, entryOffset + 12);
    const nullIdx = nameBytes.indexOf(0);
    const name = decoder.decode(nameBytes.slice(0, nullIdx === -1 ? 12 : nullIdx));
    const size = view.getUint32(entryOffset + 12, true);
    files.push({ name, size, offset: dataOffset });
    dataOffset += size;
  }

  return {
    files,
    buffer,
    getFile(name: string): ArrayBuffer {
      const entry = files.find((f) => f.name === name);
      if (!entry) throw new Error(`File not found in GRP: ${name}`);
      return buffer.slice(entry.offset, entry.offset + entry.size);
    },
    getFileBytes(name: string): Uint8Array {
      const entry = files.find((f) => f.name === name);
      if (!entry) throw new Error(`File not found in GRP: ${name}`);
      return new Uint8Array(buffer, entry.offset, entry.size);
    },
  };
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run src/lib/grp.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/grp.ts src/lib/grp.test.ts
git commit -m "feat: GRP container parser with tests"
```

---

### Task 3: Palette Parser

**Files:**
- Create: `src/lib/palette.ts`
- Create: `src/lib/palette.test.ts`

- [ ] **Step 1: Write palette parser tests**

Create `src/lib/palette.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parsePalette, parseLookupDat } from "./palette";

function makePaletteDat(): ArrayBuffer {
  // 768 (palette) + 8192 (shade table) + padding
  const size = 768 + 2 + 8192; // +2 for numshades uint16
  const buf = new ArrayBuffer(size);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);

  // Color 0: RGB(10, 20, 30) in 0-63 range
  bytes[0] = 10;
  bytes[1] = 20;
  bytes[2] = 30;
  // Color 1: RGB(63, 0, 0)
  bytes[3] = 63;
  bytes[4] = 0;
  bytes[5] = 0;

  // numshades after palette
  view.setUint16(768, 32, true);

  // Shade table: first entry maps color 0 shade 0 → index 5
  bytes[770] = 5;

  return buf;
}

describe("parsePalette", () => {
  it("reads 256 RGB colors and scales from 0-63 to 0-255", () => {
    const buf = makePaletteDat();
    const pal = parsePalette(buf);
    // Color 0: 10*4=40, 20*4=80, 30*4=120
    expect(pal.colors[0]).toBe(40);
    expect(pal.colors[1]).toBe(80);
    expect(pal.colors[2]).toBe(120);
    // Color 1: 63*4=252
    expect(pal.colors[3]).toBe(252);
  });

  it("reads shade table", () => {
    const buf = makePaletteDat();
    const pal = parsePalette(buf);
    expect(pal.numShades).toBe(32);
    expect(pal.shadeTable[0]).toBe(5);
  });
});

describe("parseLookupDat", () => {
  it("reads remap tables", () => {
    // LOOKUP.DAT: 1 byte numTables, then numTables * (1 byte palnum + 256 bytes remap)
    const buf = new ArrayBuffer(1 + 1 + 256);
    const bytes = new Uint8Array(buf);
    bytes[0] = 1; // 1 table
    bytes[1] = 0; // palnum 0
    bytes[2 + 0] = 42; // remap index 0 → 42
    const tables = parseLookupDat(buf);
    expect(tables).toHaveLength(1);
    expect(tables[0].remap[0]).toBe(42);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/lib/palette.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement palette parser**

Create `src/lib/palette.ts`:

```ts
import type { Palette, LookupTable } from "./types";

export function parsePalette(buffer: ArrayBuffer): Palette {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // 768 bytes: 256 × RGB in 0–63 range
  const colors = new Uint8Array(768);
  for (let i = 0; i < 768; i++) {
    colors[i] = Math.min(bytes[i] * 4, 255);
  }

  // uint16 numshades at offset 768
  const numShades = view.getUint16(768, true);

  // shade table: numShades × 256 bytes starting at 770
  const shadeTable = new Uint8Array(buffer, 770, numShades * 256);

  return { colors, shadeTable, numShades };
}

export function parseLookupDat(buffer: ArrayBuffer): LookupTable[] {
  const bytes = new Uint8Array(buffer);
  const numTables = bytes[0];
  const tables: LookupTable[] = [];

  let offset = 1;
  for (let i = 0; i < numTables; i++) {
    // 1 byte palnum (we skip it — index is implicit)
    offset += 1;
    const remap = new Uint8Array(buffer, offset, 256);
    tables.push({ remap: new Uint8Array(remap) });
    offset += 256;
  }

  return tables;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/lib/palette.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/palette.ts src/lib/palette.test.ts
git commit -m "feat: palette and lookup table parsers with tests"
```

---

### Task 4: ART Tile Decoder

**Files:**
- Create: `src/lib/art.ts`
- Create: `src/lib/art.test.ts`

- [ ] **Step 1: Write ART decoder tests**

Create `src/lib/art.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseArt, renderTileToRGBA } from "./art";

function makeArt(
  firstTile: number,
  tiles: { w: number; h: number; pixels: number[] }[],
): ArrayBuffer {
  const n = tiles.length;
  const lastTile = firstTile + n - 1;
  const headerSize = 16 + n * 2 + n * 2 + n * 4;
  const pixelSize = tiles.reduce((s, t) => s + t.w * t.h, 0);
  const buf = new ArrayBuffer(headerSize + pixelSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  view.setUint32(0, 1, true); // version
  view.setUint32(4, 0, true); // numtiles (unused in practice)
  view.setUint32(8, firstTile, true);
  view.setUint32(12, lastTile, true);

  let off = 16;
  for (const t of tiles) {
    view.setInt16(off, t.w, true);
    off += 2;
  }
  for (const t of tiles) {
    view.setInt16(off, t.h, true);
    off += 2;
  }
  // picanm — all zeros
  off += n * 4;

  for (const t of tiles) {
    for (const p of t.pixels) bytes[off++] = p;
  }

  return buf;
}

describe("parseArt", () => {
  it("parses tile dimensions and pixels", () => {
    const art = parseArt(
      makeArt(0, [{ w: 2, h: 3, pixels: [1, 2, 3, 4, 5, 6] }]),
    );
    expect(art.firstTile).toBe(0);
    expect(art.tiles).toHaveLength(1);
    expect(art.tiles[0].width).toBe(2);
    expect(art.tiles[0].height).toBe(3);
    expect(art.tiles[0].pixels).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });

  it("handles empty tiles (0x0)", () => {
    const art = parseArt(makeArt(10, [{ w: 0, h: 0, pixels: [] }]));
    expect(art.tiles[0].width).toBe(0);
    expect(art.tiles[0].height).toBe(0);
    expect(art.tiles[0].pixels).toHaveLength(0);
  });
});

describe("renderTileToRGBA", () => {
  it("converts indexed pixels to RGBA using palette", () => {
    const tile = {
      width: 1,
      height: 2,
      pixels: new Uint8Array([0, 1]),
      animFrames: 0,
      animType: 0,
      xOffset: 0,
      yOffset: 0,
      animSpeed: 0,
    };
    // Palette: color 0 = (255,0,0), color 1 = (0,255,0)
    const colors = new Uint8Array(768);
    colors[0] = 255; colors[1] = 0; colors[2] = 0;
    colors[3] = 0; colors[4] = 255; colors[5] = 0;

    const rgba = renderTileToRGBA(tile, colors);
    // Column-major → row-major conversion: pixel (0,0) = index 0, pixel (0,1) = index 1
    // Output is row-major RGBA
    expect(rgba[0]).toBe(255); // R
    expect(rgba[1]).toBe(0);   // G
    expect(rgba[2]).toBe(0);   // B
    expect(rgba[3]).toBe(255); // A
    expect(rgba[4]).toBe(0);   // R
    expect(rgba[5]).toBe(255); // G
    expect(rgba[6]).toBe(0);   // B
    expect(rgba[7]).toBe(255); // A
  });

  it("treats index 255 as transparent", () => {
    const tile = {
      width: 1,
      height: 1,
      pixels: new Uint8Array([255]),
      animFrames: 0, animType: 0, xOffset: 0, yOffset: 0, animSpeed: 0,
    };
    const colors = new Uint8Array(768);
    const rgba = renderTileToRGBA(tile, colors);
    expect(rgba[3]).toBe(0); // alpha = 0
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/lib/art.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement ART decoder**

Create `src/lib/art.ts`:

```ts
import type { ArtFile, ArtTile } from "./types";

export function parseArt(buffer: ArrayBuffer): ArtFile {
  const view = new DataView(buffer);

  const firstTile = view.getUint32(8, true);
  const lastTile = view.getUint32(12, true);
  const count = lastTile - firstTile + 1;

  let offset = 16;
  const widths = new Int16Array(count);
  for (let i = 0; i < count; i++) {
    widths[i] = view.getInt16(offset, true);
    offset += 2;
  }

  const heights = new Int16Array(count);
  for (let i = 0; i < count; i++) {
    heights[i] = view.getInt16(offset, true);
    offset += 2;
  }

  const picanms = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    picanms[i] = view.getUint32(offset, true);
    offset += 4;
  }

  const tiles: ArtTile[] = [];
  for (let i = 0; i < count; i++) {
    const w = Math.max(0, widths[i]);
    const h = Math.max(0, heights[i]);
    const pixelCount = w * h;
    const pixels =
      pixelCount > 0
        ? new Uint8Array(buffer, offset, pixelCount)
        : new Uint8Array(0);
    offset += pixelCount;

    const p = picanms[i];
    const animFrames = p & 0x3f;
    const animType = (p >> 6) & 0x3;
    const xOffset = (p >> 8) & 0xff;
    const yOffset = (p >> 16) & 0xff;
    const animSpeed = (p >> 24) & 0xf;

    tiles.push({ width: w, height: h, pixels: new Uint8Array(pixels), animFrames, animType, xOffset, yOffset, animSpeed });
  }

  return { firstTile, lastTile, tiles };
}

/**
 * Convert column-major indexed pixels to row-major RGBA.
 * Index 255 = transparent (alpha 0).
 */
export function renderTileToRGBA(
  tile: Pick<ArtTile, "width" | "height" | "pixels">,
  paletteColors: Uint8Array,
): Uint8Array {
  const { width, height, pixels } = tile;
  const rgba = new Uint8Array(width * height * 4);

  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      const srcIdx = col * height + row; // column-major
      const dstIdx = (row * width + col) * 4; // row-major RGBA
      const colorIdx = pixels[srcIdx];

      if (colorIdx === 255) {
        rgba[dstIdx + 3] = 0; // transparent
      } else {
        rgba[dstIdx] = paletteColors[colorIdx * 3];
        rgba[dstIdx + 1] = paletteColors[colorIdx * 3 + 1];
        rgba[dstIdx + 2] = paletteColors[colorIdx * 3 + 2];
        rgba[dstIdx + 3] = 255;
      }
    }
  }

  return rgba;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/lib/art.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/art.ts src/lib/art.test.ts
git commit -m "feat: ART tile decoder with column-major to RGBA conversion"
```

---

### Task 5: MAP Parser

**Files:**
- Create: `src/lib/map.ts`
- Create: `src/lib/map.test.ts`

- [ ] **Step 1: Write MAP parser tests**

Create `src/lib/map.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseMap } from "./map";

function makeMap(opts: {
  sectors: number;
  walls: number;
  sprites: number;
}): ArrayBuffer {
  const headerSize = 22; // 4+4+4+4+2+2+2
  const sectorSize = opts.sectors * 40;
  const wallSize = 2 + opts.walls * 32;
  const spriteSize = 2 + opts.sprites * 44;
  const buf = new ArrayBuffer(headerSize + sectorSize + wallSize + spriteSize);
  const view = new DataView(buf);

  view.setUint32(0, 7, true); // version
  view.setInt32(4, 1000, true); // posX
  view.setInt32(8, 2000, true); // posY
  view.setInt32(12, 3000, true); // posZ
  view.setUint16(16, 512, true); // angle
  view.setUint16(18, 0, true); // cursectnum
  view.setUint16(20, opts.sectors, true); // numsectors

  let off = headerSize + sectorSize;
  view.setUint16(off, opts.walls, true);
  off += 2 + opts.walls * 32;
  view.setUint16(off, opts.sprites, true);

  return buf;
}

describe("parseMap", () => {
  it("parses header and counts", () => {
    const map = parseMap(makeMap({ sectors: 2, walls: 5, sprites: 3 }));
    expect(map.version).toBe(7);
    expect(map.playerStart).toEqual({
      x: 1000, y: 2000, z: 3000, ang: 512, sector: 0,
    });
    expect(map.sectors).toHaveLength(2);
    expect(map.walls).toHaveLength(5);
    expect(map.sprites).toHaveLength(3);
  });

  it("throws on unsupported version", () => {
    const buf = new ArrayBuffer(22);
    const view = new DataView(buf);
    view.setUint32(0, 99, true);
    expect(() => parseMap(buf)).toThrow("Unsupported MAP version");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/lib/map.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement MAP parser**

Create `src/lib/map.ts`:

```ts
import type { BuildMap, BuildSector, BuildWall, BuildSprite } from "./types";

export function parseMap(buffer: ArrayBuffer): BuildMap {
  const view = new DataView(buffer);
  let off = 0;

  const version = view.getUint32(off, true); off += 4;
  if (version !== 7 && version !== 8 && version !== 9) {
    throw new Error(`Unsupported MAP version: ${version}`);
  }

  const posX = view.getInt32(off, true); off += 4;
  const posY = view.getInt32(off, true); off += 4;
  const posZ = view.getInt32(off, true); off += 4;
  const ang = view.getUint16(off, true); off += 2;
  const curSect = view.getUint16(off, true); off += 2;

  // Sectors
  const numSectors = view.getUint16(off, true); off += 2;
  const sectors: BuildSector[] = [];
  for (let i = 0; i < numSectors; i++) {
    sectors.push({
      wallPtr: view.getUint16(off, true),
      wallNum: view.getUint16(off + 2, true),
      ceilingZ: view.getInt32(off + 4, true),
      floorZ: view.getInt32(off + 8, true),
      ceilingStat: view.getUint16(off + 12, true),
      floorStat: view.getUint16(off + 14, true),
      ceilingPicnum: view.getInt16(off + 16, true),
      ceilingHeinum: view.getInt16(off + 18, true),
      ceilingShade: view.getInt8(off + 20),
      ceilingPal: view.getUint8(off + 21),
      ceilingXPanning: view.getUint8(off + 22),
      ceilingYPanning: view.getUint8(off + 23),
      floorPicnum: view.getInt16(off + 24, true),
      floorHeinum: view.getInt16(off + 26, true),
      floorShade: view.getInt8(off + 28),
      floorPal: view.getUint8(off + 29),
      floorXPanning: view.getUint8(off + 30),
      floorYPanning: view.getUint8(off + 31),
      visibility: view.getUint8(off + 32),
      loTag: view.getInt16(off + 34, true),
      hiTag: view.getInt16(off + 36, true),
      extra: view.getInt16(off + 38, true),
    });
    off += 40;
  }

  // Walls
  const numWalls = view.getUint16(off, true); off += 2;
  const walls: BuildWall[] = [];
  for (let i = 0; i < numWalls; i++) {
    walls.push({
      x: view.getInt32(off, true),
      y: view.getInt32(off + 4, true),
      point2: view.getUint16(off + 8, true),
      nextWall: view.getInt16(off + 10, true),
      nextSector: view.getInt16(off + 12, true),
      cstat: view.getUint16(off + 14, true),
      picnum: view.getUint16(off + 16, true),
      overPicnum: view.getUint16(off + 18, true),
      shade: view.getInt8(off + 20),
      pal: view.getUint8(off + 21),
      xRepeat: view.getUint8(off + 22),
      yRepeat: view.getUint8(off + 23),
      xPanning: view.getUint8(off + 24),
      yPanning: view.getUint8(off + 25),
      loTag: view.getInt16(off + 26, true),
      hiTag: view.getInt16(off + 28, true),
      extra: view.getInt16(off + 30, true),
    });
    off += 32;
  }

  // Sprites
  const numSprites = view.getUint16(off, true); off += 2;
  const sprites: BuildSprite[] = [];
  for (let i = 0; i < numSprites; i++) {
    sprites.push({
      x: view.getInt32(off, true),
      y: view.getInt32(off + 4, true),
      z: view.getInt32(off + 8, true),
      cstat: view.getUint16(off + 12, true),
      picnum: view.getUint16(off + 14, true),
      shade: view.getInt8(off + 16),
      pal: view.getUint8(off + 17),
      clipDist: view.getUint8(off + 18),
      xRepeat: view.getUint8(off + 20),
      yRepeat: view.getUint8(off + 21),
      xOffset: view.getInt8(off + 22),
      yOffset: view.getInt8(off + 23),
      sectNum: view.getUint16(off + 24, true),
      statNum: view.getUint16(off + 26, true),
      ang: view.getUint16(off + 28, true),
      owner: view.getUint16(off + 30, true),
      xVel: view.getInt16(off + 32, true),
      yVel: view.getInt16(off + 34, true),
      zVel: view.getInt16(off + 36, true),
      loTag: view.getInt16(off + 38, true),
      hiTag: view.getInt16(off + 40, true),
      extra: view.getInt16(off + 42, true),
    });
    off += 44;
  }

  return {
    version,
    playerStart: { x: posX, y: posY, z: posZ, ang, sector: curSect },
    sectors,
    walls,
    sprites,
  };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/lib/map.test.ts
```

Expected: all 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/map.ts src/lib/map.test.ts
git commit -m "feat: Build engine MAP v7 parser with tests"
```

---

### Task 6: VOC Audio Decoder

**Files:**
- Create: `src/lib/voc.ts`
- Create: `src/lib/voc.test.ts`

- [ ] **Step 1: Write VOC decoder tests**

Create `src/lib/voc.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseVoc } from "./voc";

function makeVoc(sampleRateByte: number, samples: number[]): ArrayBuffer {
  const header = "Creative Voice File\x1a";
  const dataOffset = 26;
  const blockSize = 2 + samples.length; // 2 bytes (sr_byte + codec) + pcm data
  const totalSize = dataOffset + 1 + 3 + blockSize + 1; // +1 block type, +3 size, +1 terminator
  const buf = new ArrayBuffer(totalSize);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);

  // Header
  const enc = new TextEncoder();
  bytes.set(enc.encode(header), 0);
  view.setUint16(20, dataOffset, true); // data offset
  view.setUint16(22, 0x010a, true); // version 1.10
  view.setUint16(24, 0x1129, true); // checksum

  // Block type 1: sound data
  let off = dataOffset;
  bytes[off++] = 1; // type
  bytes[off++] = blockSize & 0xff;
  bytes[off++] = (blockSize >> 8) & 0xff;
  bytes[off++] = (blockSize >> 16) & 0xff;
  bytes[off++] = sampleRateByte; // sample rate byte
  bytes[off++] = 0; // codec: 8-bit unsigned PCM

  for (const s of samples) bytes[off++] = s;

  // Terminator
  bytes[off] = 0;

  return buf;
}

describe("parseVoc", () => {
  it("decodes 8-bit unsigned PCM to float32", () => {
    // SR byte 128 → 1000000 / (256 - 128) = 7812 Hz
    const result = parseVoc(makeVoc(128, [128, 0, 255]));
    expect(result.sampleRate).toBe(7812);
    expect(result.samples).toHaveLength(3);
    // 128 → ~0.0 (center), 0 → -1.0, 255 → ~1.0
    expect(Math.abs(result.samples[0])).toBeLessThan(0.01);
    expect(result.samples[1]).toBeCloseTo(-1.0, 1);
    expect(result.samples[2]).toBeCloseTo(1.0, 1);
  });

  it("throws on invalid header", () => {
    const buf = new ArrayBuffer(26);
    expect(() => parseVoc(buf)).toThrow("Invalid VOC");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run src/lib/voc.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement VOC decoder**

Create `src/lib/voc.ts`:

```ts
export interface VocData {
  sampleRate: number;
  samples: Float32Array;
}

const VOC_MAGIC = "Creative Voice File\x1a";

export function parseVoc(buffer: ArrayBuffer): VocData {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("ascii");

  const magic = decoder.decode(bytes.slice(0, 20));
  if (magic !== VOC_MAGIC) {
    throw new Error("Invalid VOC: bad header");
  }

  const view = new DataView(buffer);
  const dataOffset = view.getUint16(20, true);

  const pcmChunks: Uint8Array[] = [];
  let sampleRate = 11025; // default
  let off = dataOffset;

  while (off < buffer.byteLength) {
    const blockType = bytes[off++];
    if (blockType === 0) break; // terminator

    const blockSize =
      bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16);
    off += 3;

    if (blockType === 1) {
      // Sound data
      const srByte = bytes[off];
      const codec = bytes[off + 1];
      sampleRate = Math.floor(1000000 / (256 - srByte));

      if (codec === 0) {
        // 8-bit unsigned PCM
        pcmChunks.push(bytes.slice(off + 2, off + blockSize));
      }
    }

    off += blockSize;
  }

  // Merge chunks and convert to float32
  const totalSamples = pcmChunks.reduce((s, c) => s + c.length, 0);
  const samples = new Float32Array(totalSamples);
  let idx = 0;
  for (const chunk of pcmChunks) {
    for (let i = 0; i < chunk.length; i++) {
      samples[idx++] = (chunk[i] - 128) / 128;
    }
  }

  return { sampleRate, samples };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run src/lib/voc.test.ts
```

Expected: all 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/voc.ts src/lib/voc.test.ts
git commit -m "feat: Creative VOC audio decoder with tests"
```

---

### Task 7: GRP Context Provider

**Files:**
- Create: `src/context/grp-context.tsx`
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Create GRP context provider**

Create `src/context/grp-context.tsx`:

```tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { parseGrp } from "../lib/grp";
import { parsePalette, parseLookupDat } from "../lib/palette";
import { parseArt, renderTileToRGBA } from "../lib/art";
import { parseMap } from "../lib/map";
import type {
  GrpArchive,
  Palette,
  LookupTable,
  ArtFile,
  ArtTile,
  BuildMap,
} from "../lib/types";

interface GrpContextValue {
  archive: GrpArchive;
  palette: Palette;
  lookupTables: LookupTable[];
  artFiles: ArtFile[];
  /** Get a tile by its global index across all ART files */
  getTile(tileNum: number): ArtTile | undefined;
  /** Render a tile to RGBA ImageData */
  renderTile(tileNum: number): Uint8Array | undefined;
  /** Parse a map by name (e.g., "E1L1.MAP") */
  getMap(name: string): BuildMap;
}

const GrpContext = createContext<GrpContextValue | null>(null);

export function GrpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<
    | { status: "loading"; progress: string }
    | { status: "ready"; value: GrpContextValue }
    | { status: "error"; error: string }
  >({ status: "loading", progress: "Fetching DUKE3D.GRP..." });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/DUKE3D.GRP");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (cancelled) return;

        setState({ status: "loading", progress: "Parsing GRP archive..." });
        const archive = parseGrp(buffer);

        setState({ status: "loading", progress: "Loading palette..." });
        const palette = parsePalette(archive.getFile("PALETTE.DAT"));
        const lookupTables = parseLookupDat(archive.getFile("LOOKUP.DAT"));

        setState({ status: "loading", progress: "Decoding art tiles..." });
        const artFiles: ArtFile[] = [];
        for (const entry of archive.files) {
          if (entry.name.endsWith(".ART")) {
            artFiles.push(parseArt(archive.getFile(entry.name)));
          }
        }

        const mapCache = new Map<string, BuildMap>();

        const value: GrpContextValue = {
          archive,
          palette,
          lookupTables,
          artFiles,
          getTile(tileNum: number): ArtTile | undefined {
            for (const art of artFiles) {
              if (tileNum >= art.firstTile && tileNum <= art.lastTile) {
                return art.tiles[tileNum - art.firstTile];
              }
            }
            return undefined;
          },
          renderTile(tileNum: number): Uint8Array | undefined {
            const tile = value.getTile(tileNum);
            if (!tile || tile.width === 0 || tile.height === 0) return undefined;
            return renderTileToRGBA(tile, palette.colors);
          },
          getMap(name: string): BuildMap {
            const cached = mapCache.get(name);
            if (cached) return cached;
            const parsed = parseMap(archive.getFile(name));
            mapCache.set(name, parsed);
            return parsed;
          },
        };

        if (!cancelled) setState({ status: "ready", value });
      } catch (e) {
        if (!cancelled) {
          setState({
            status: "error",
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-orange-500 text-lg font-bold mb-2">Loading</div>
          <div className="text-zinc-400">{state.progress}</div>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-lg font-bold mb-2">Error</div>
          <div className="text-zinc-400">{state.error}</div>
        </div>
      </div>
    );
  }

  return (
    <GrpContext.Provider value={state.value}>{children}</GrpContext.Provider>
  );
}

export function useGrp(): GrpContextValue {
  const ctx = useContext(GrpContext);
  if (!ctx) throw new Error("useGrp must be used within GrpProvider");
  return ctx;
}
```

- [ ] **Step 2: Create layout component with top nav**

Create `src/components/layout.tsx`:

```tsx
import { Link, Outlet } from "@tanstack/react-router";

const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/archive", label: "Archive" },
  { to: "/grp", label: "GRP" },
  { to: "/palette", label: "Palette" },
  { to: "/tiles", label: "Tiles" },
  { to: "/maps", label: "Maps" },
  { to: "/scripts", label: "Scripts" },
  { to: "/audio", label: "Audio" },
] as const;

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-zinc-800 bg-zinc-950 px-6 py-3 flex items-center gap-6">
        <Link
          to="/"
          className="text-orange-500 font-bold text-sm tracking-wide no-underline hover:text-orange-400"
        >
          DUKE3D RE
        </Link>
        <div className="flex gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-zinc-400 text-sm no-underline hover:text-zinc-100"
              activeProps={{ className: "text-zinc-100 text-sm no-underline" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Wire up root route with GrpProvider and Layout**

Replace `src/routes/__root.tsx`:

```tsx
import { createRootRoute } from "@tanstack/react-router";
import { GrpProvider } from "../context/grp-context";
import { Layout } from "../components/layout";

export const Route = createRootRoute({
  component: () => (
    <GrpProvider>
      <Layout />
    </GrpProvider>
  ),
});
```

- [ ] **Step 4: Verify in dev server**

```bash
npm run dev
```

Open browser — should show loading state, then the nav bar with "DUKE3D RE" and links. The home page content should appear after GRP loads.

- [ ] **Step 5: Commit**

```bash
git add src/context/grp-context.tsx src/components/layout.tsx src/routes/__root.tsx
git commit -m "feat: GRP context provider and layout with top nav"
```

---

### Task 8: Home Page

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Implement home page**

Replace `src/routes/index.tsx`:

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";

const SECTIONS = [
  {
    to: "/archive",
    title: "The Archive",
    desc: "SHR self-extracting ZIP — how shareware was distributed in 1996",
  },
  {
    to: "/grp",
    title: "GRP Container",
    desc: 'Ken Silverman\'s group file format — "KenSilverman" magic and 215 packed files',
  },
  {
    to: "/palette",
    title: "Palette & Shading",
    desc: "256-color palette, 32 shade levels, lookup remapping tables",
  },
  {
    to: "/tiles",
    title: "ART Tiles",
    desc: "Textures, sprites, and UI art — column-major indexed pixels",
  },
  {
    to: "/maps",
    title: "MAP Format",
    desc: "Sectors, walls, and sprites — the 2.5D geometry of Build engine levels",
  },
  {
    to: "/viewer/E1L1",
    title: "3D Viewer",
    desc: "Walk through Hollywood Holocaust in textured or wireframe 3D",
  },
  {
    to: "/scripts",
    title: "CON Scripts",
    desc: "The game scripting language — actors, AI, weapons, and game logic",
  },
  {
    to: "/audio",
    title: "Audio",
    desc: "Creative Voice files and MIDI music — Duke's one-liners and GRABBAG",
  },
] as const;

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-5xl font-bold text-orange-500 mb-4">
        Duke Nukem 3D
      </h1>
      <p className="text-xl text-zinc-400 mb-2">
        Reverse Engineering the Shareware Version
      </p>
      <p className="text-zinc-500 mb-12 max-w-2xl">
        A deep dive into the Build engine's data formats. Every byte parsed
        client-side in TypeScript from the original 1996 DUKE3D.GRP.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-zinc-800">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="bg-zinc-900 p-6 no-underline hover:bg-zinc-800/80 transition-colors"
          >
            <h2 className="text-zinc-100 font-semibold text-lg mb-2">
              {s.title}
            </h2>
            <p className="text-zinc-500 text-sm">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:5173/` — should show the hero section and grid of section cards. Click any card to navigate (routes will show blank pages for now, which is expected).

- [ ] **Step 3: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: home page with section grid"
```

---

### Task 9: Hex View Component

**Files:**
- Create: `src/components/hex-view.tsx`

- [ ] **Step 1: Create reusable hex view component**

Create `src/components/hex-view.tsx`:

```tsx
interface HexViewProps {
  data: Uint8Array;
  /** Max bytes to show */
  limit?: number;
  /** Byte ranges to highlight: [start, end, color] */
  highlights?: [number, number, string][];
}

export function HexView({ data, limit = 256, highlights = [] }: HexViewProps) {
  const bytes = data.slice(0, limit);
  const rows: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    rows.push(bytes.slice(i, i + 16));
  }

  function getHighlight(byteIndex: number): string | undefined {
    for (const [start, end, color] of highlights) {
      if (byteIndex >= start && byteIndex < end) return color;
    }
    return undefined;
  }

  return (
    <div className="mono text-xs overflow-x-auto">
      <table className="border-collapse">
        <tbody>
          {rows.map((row, rowIdx) => {
            const offset = rowIdx * 16;
            return (
              <tr key={offset}>
                <td className="text-zinc-600 pr-4 select-none">
                  {offset.toString(16).padStart(8, "0")}
                </td>
                <td className="pr-4">
                  {Array.from(row)
                    .map((b, i) => {
                      const color = getHighlight(offset + i);
                      return (
                        <span
                          key={i}
                          className={color ? "" : "text-zinc-300"}
                          style={color ? { color } : undefined}
                        >
                          {b.toString(16).padStart(2, "0")}
                          {i === 7 ? "  " : " "}
                        </span>
                      );
                    })}
                </td>
                <td className="text-zinc-600">
                  {Array.from(row)
                    .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "."))
                    .join("")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/hex-view.tsx
git commit -m "feat: reusable hex view component with highlighting"
```

---

### Task 10: Archive Page

**Files:**
- Create: `src/routes/archive.tsx`

- [ ] **Step 1: Implement archive page**

Create `src/routes/archive.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useGrp } from "../context/grp-context";
import { HexView } from "../components/hex-view";

const ARCHIVE_FILES = [
  { name: "DUKE3D.EXE", size: "1,178,963", desc: "Main game executable (DOS4GW 32-bit)" },
  { name: "DUKE3D.GRP", size: "11,035,779", desc: "Build engine group file — all game assets" },
  { name: "GAME.CON", size: "99,639", desc: "Actor AI, weapons, game logic scripts" },
  { name: "USER.CON", size: "36,960", desc: "User-configurable constants and settings" },
  { name: "DEFS.CON", size: "28,893", desc: "Tile and sound number definitions" },
  { name: "DUKE.RTS", size: "188,954", desc: "Remote Ridicule sounds (multiplayer taunts)" },
  { name: "SETUP.EXE", size: "27,153", desc: "Sound/video/input configuration utility" },
  { name: "MODEM.PCK", size: "4,125", desc: "Modem initialization strings" },
  { name: "DEMO1.DMO", size: "6,226", desc: "Attract-mode demo recording" },
  { name: "DEMO2.DMO", size: "9,701", desc: "Attract-mode demo recording" },
  { name: "DEMO3.DMO", size: "3,759", desc: "Attract-mode demo recording" },
];

// First 256 bytes of the SHR file (the MZ+PKLITE header)
// These are hardcoded since the SHR is not loaded — only the GRP is.
const SHR_HEADER_HEX = [
  0x4d, 0x5a, 0xf5, 0x01, 0x1e, 0x00, 0x01, 0x00, 0x06, 0x00, 0x89, 0x0c,
  0xff, 0xff, 0x00, 0x00, 0xb0, 0x5f, 0x00, 0x00, 0x00, 0x01, 0xf0, 0xff,
  0x52, 0x00, 0x00, 0x00, 0x14, 0x11, 0x50, 0x4b, 0x4c, 0x49, 0x54, 0x45,
  0x20, 0x43, 0x6f, 0x70, 0x72, 0x2e, 0x20, 0x31, 0x39, 0x39, 0x30, 0x2d,
  0x39, 0x32, 0x20, 0x50, 0x4b, 0x57, 0x41, 0x52, 0x45, 0x20, 0x49, 0x6e,
  0x63, 0x2e, 0x20, 0x41, 0x6c, 0x6c, 0x20, 0x52, 0x69, 0x67, 0x68, 0x74,
  0x73, 0x20, 0x52, 0x65, 0x73, 0x65, 0x72, 0x76, 0x65, 0x64, 0x07, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

export const Route = createFileRoute("/archive")({
  component: ArchivePage,
});

function ArchivePage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">The Archive</h1>
      <p className="text-zinc-400 mb-8">
        DN3DSW13.SHR — a 5.6 MB self-extracting PKZIP archive, the standard
        distribution format for shareware on BBSes and FTP sites in 1996.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          SHR Header — MZ + PKLITE Stub
        </h2>
        <p className="text-zinc-400 text-sm mb-4">
          The file starts with a DOS MZ executable header. The stub is
          compressed with PKLITE and contains the PKZIP extraction code. When
          run, it unpacks the embedded ZIP data into the current directory.
        </p>
        <div className="bg-zinc-950 border border-zinc-800 p-4 overflow-x-auto">
          <HexView
            data={new Uint8Array(SHR_HEADER_HEX)}
            highlights={[
              [0, 2, "#f97316"],   // MZ signature
              [30, 86, "#22c55e"], // PKLITE copyright
            ]}
          />
        </div>
        <div className="flex gap-6 mt-2 text-xs text-zinc-600">
          <span>
            <span className="text-orange-500">■</span> MZ signature
          </span>
          <span>
            <span className="text-green-500">■</span> PKLITE copyright string
          </span>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Extracted Contents
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 font-medium">File</th>
              <th className="pb-2 font-medium text-right">Size</th>
              <th className="pb-2 font-medium pl-6">Description</th>
            </tr>
          </thead>
          <tbody>
            {ARCHIVE_FILES.map((f) => (
              <tr key={f.name} className="border-b border-zinc-800/50">
                <td className="py-2 mono text-zinc-100">{f.name}</td>
                <td className="py-2 mono text-zinc-400 text-right">
                  {f.size}
                </td>
                <td className="py-2 text-zinc-500 pl-6">{f.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/archive` — should show hex view of the SHR header with highlighted MZ signature and PKLITE string, plus the file listing table.

- [ ] **Step 3: Commit**

```bash
git add src/routes/archive.tsx
git commit -m "feat: archive page with hex view and file listing"
```

---

### Task 11: GRP Page

**Files:**
- Create: `src/routes/grp.tsx`

- [ ] **Step 1: Implement GRP page**

Create `src/routes/grp.tsx`:

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGrp } from "../context/grp-context";
import { HexView } from "../components/hex-view";

export const Route = createFileRoute("/grp")({
  component: GrpPage,
});

function fileTypeRoute(name: string): string | null {
  if (name.endsWith(".MAP")) return `/maps`;
  if (name.endsWith(".ART")) return `/tiles`;
  if (name.endsWith(".VOC") || name.endsWith(".MID")) return `/audio`;
  if (name.endsWith(".CON")) return `/scripts`;
  if (name === "PALETTE.DAT" || name === "LOOKUP.DAT") return `/palette`;
  return null;
}

function fileTypeLabel(name: string): string {
  if (name.endsWith(".MAP")) return "Map";
  if (name.endsWith(".ART")) return "Art";
  if (name.endsWith(".VOC")) return "Sound";
  if (name.endsWith(".MID")) return "Music";
  if (name.endsWith(".CON")) return "Script";
  if (name.endsWith(".DAT")) return "Data";
  if (name.endsWith(".TMB")) return "Timbre";
  if (name.endsWith(".BIN")) return "Binary";
  return "Other";
}

function GrpPage() {
  const { archive } = useGrp();
  const [filter, setFilter] = useState("");

  const headerBytes = new Uint8Array(archive.buffer, 0, Math.min(96, archive.buffer.byteLength));

  const filtered = archive.files.filter((f) =>
    f.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">
        GRP Container
      </h1>
      <p className="text-zinc-400 mb-8">
        Ken Silverman's group file format — a flat archive with a 12-byte magic
        signature, file count, and sequential directory entries.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Header Structure
        </h2>
        <div className="bg-zinc-950 border border-zinc-800 p-4 overflow-x-auto">
          <HexView
            data={headerBytes}
            highlights={[
              [0, 12, "#f97316"],  // magic
              [12, 16, "#22c55e"], // file count
              [16, 32, "#3b82f6"], // first directory entry
            ]}
          />
        </div>
        <div className="flex gap-6 mt-2 text-xs text-zinc-600">
          <span><span className="text-orange-500">■</span> "KenSilverman" magic</span>
          <span><span className="text-green-500">■</span> File count (uint32 LE)</span>
          <span><span className="text-blue-500">■</span> First directory entry</span>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">
            Files ({archive.files.length})
          </h2>
          <input
            type="text"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-1 placeholder-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium text-right">Size</th>
              <th className="pb-2 font-medium text-right">Offset</th>
              <th className="pb-2 font-medium pl-4">Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const route = fileTypeRoute(f.name);
              return (
                <tr key={f.name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-1.5 mono">
                    {route ? (
                      <Link to={route} className="text-orange-500 hover:text-orange-400">
                        {f.name}
                      </Link>
                    ) : (
                      <span className="text-zinc-100">{f.name}</span>
                    )}
                  </td>
                  <td className="py-1.5 mono text-zinc-400 text-right">
                    {f.size.toLocaleString()}
                  </td>
                  <td className="py-1.5 mono text-zinc-600 text-right">
                    0x{f.offset.toString(16)}
                  </td>
                  <td className="py-1.5 text-zinc-500 pl-4">
                    {fileTypeLabel(f.name)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/grp` — should show hex header with highlights and the filterable file table with clickable links.

- [ ] **Step 3: Commit**

```bash
git add src/routes/grp.tsx
git commit -m "feat: GRP page with hex header view and file browser"
```

---

### Task 12: Palette Page

**Files:**
- Create: `src/routes/palette.tsx`

- [ ] **Step 1: Implement palette page**

Create `src/routes/palette.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useGrp } from "../context/grp-context";

export const Route = createFileRoute("/palette")({
  component: PalettePage,
});

function PalettePage() {
  const { palette, lookupTables } = useGrp();
  const [selectedColor, setSelectedColor] = useState<number | null>(null);
  const [selectedLookup, setSelectedLookup] = useState(0);

  function rgb(idx: number, colors = palette.colors): string {
    return `rgb(${colors[idx * 3]},${colors[idx * 3 + 1]},${colors[idx * 3 + 2]})`;
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">
        Palette & Shade Tables
      </h1>
      <p className="text-zinc-400 mb-8">
        Duke3D uses a 256-color indexed palette. Every pixel in the game is a
        single byte — an index into this palette. Shade tables darken colors for
        distance-based lighting.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          256-Color Palette
        </h2>
        <div className="inline-grid grid-cols-16 gap-px bg-zinc-800">
          {Array.from({ length: 256 }, (_, i) => (
            <button
              key={i}
              className={`w-6 h-6 cursor-pointer ${selectedColor === i ? "ring-2 ring-orange-500 ring-offset-1 ring-offset-zinc-900 z-10" : ""}`}
              style={{ backgroundColor: rgb(i) }}
              title={`#${i}: RGB(${palette.colors[i * 3]}, ${palette.colors[i * 3 + 1]}, ${palette.colors[i * 3 + 2]})`}
              onClick={() => setSelectedColor(i)}
            />
          ))}
        </div>
        {selectedColor !== null && (
          <div className="mt-4 text-sm text-zinc-400">
            Color <span className="mono text-zinc-100">#{selectedColor}</span>:{" "}
            <span className="mono">
              RGB({palette.colors[selectedColor * 3]},{" "}
              {palette.colors[selectedColor * 3 + 1]},{" "}
              {palette.colors[selectedColor * 3 + 2]})
            </span>
          </div>
        )}
      </section>

      {selectedColor !== null && (
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">
            Shade Table — Color #{selectedColor}
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            {palette.numShades} shade levels. Level 0 is full brightness, level{" "}
            {palette.numShades - 1} is darkest. Each level remaps the color
            index.
          </p>
          <div className="flex gap-px">
            {Array.from({ length: palette.numShades }, (_, shade) => {
              const remapped =
                palette.shadeTable[shade * 256 + selectedColor];
              return (
                <div
                  key={shade}
                  className="w-4 h-8"
                  style={{ backgroundColor: rgb(remapped) }}
                  title={`Shade ${shade}: → color #${remapped}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-zinc-600 mt-1">
            <span>Bright (0)</span>
            <span>Dark ({palette.numShades - 1})</span>
          </div>
        </section>
      )}

      {lookupTables.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">
            Lookup Remap Tables ({lookupTables.length})
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Lookup tables remap the entire palette — used for effects like
            underwater tinting, night vision green, and sector-specific coloring.
          </p>
          <select
            value={selectedLookup}
            onChange={(e) => setSelectedLookup(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-1 mb-4"
          >
            {lookupTables.map((_, i) => (
              <option key={i} value={i}>
                Table {i}
              </option>
            ))}
          </select>
          <div className="inline-grid grid-cols-16 gap-px bg-zinc-800">
            {Array.from({ length: 256 }, (_, i) => {
              const remapped = lookupTables[selectedLookup].remap[i];
              return (
                <div
                  key={i}
                  className="w-6 h-6"
                  style={{ backgroundColor: rgb(remapped) }}
                  title={`#${i} → #${remapped}`}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/palette` — should show 16×16 color grid, clickable to show shade table strip. Lookup table dropdown should remap the grid.

- [ ] **Step 3: Commit**

```bash
git add src/routes/palette.tsx
git commit -m "feat: palette page with shade table and lookup remap visualization"
```

---

### Task 13: Tile Canvas Component + Tiles Page

**Files:**
- Create: `src/components/tile-canvas.tsx`
- Create: `src/routes/tiles.tsx`

- [ ] **Step 1: Create tile canvas renderer**

Create `src/components/tile-canvas.tsx`:

```tsx
import { useEffect, useRef } from "react";

interface TileCanvasProps {
  rgba: Uint8Array;
  width: number;
  height: number;
  scale?: number;
  className?: string;
}

export function TileCanvas({
  rgba,
  width,
  height,
  scale = 1,
  className = "",
}: TileCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || width === 0 || height === 0) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const img = new ImageData(new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength), width, height);
    ctx.putImageData(img, 0, 0);
  }, [rgba, width, height]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{
        width: width * scale,
        height: height * scale,
        imageRendering: "pixelated",
      }}
    />
  );
}
```

- [ ] **Step 2: Implement tiles page**

Create `src/routes/tiles.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useGrp } from "../context/grp-context";
import { TileCanvas } from "../components/tile-canvas";

export const Route = createFileRoute("/tiles")({
  component: TilesPage,
});

function TilesPage() {
  const { artFiles, renderTile, getTile } = useGrp();
  const [selected, setSelected] = useState<number | null>(null);
  const [artFilter, setArtFilter] = useState<number | null>(null);

  const allTiles = useMemo(() => {
    const tiles: { num: number; artIdx: number }[] = [];
    artFiles.forEach((art, artIdx) => {
      for (let i = 0; i <= art.lastTile - art.firstTile; i++) {
        const t = art.tiles[i];
        if (t.width > 0 && t.height > 0) {
          tiles.push({ num: art.firstTile + i, artIdx });
        }
      }
    });
    return tiles;
  }, [artFiles]);

  const filtered = artFilter !== null
    ? allTiles.filter((t) => t.artIdx === artFilter)
    : allTiles;

  const selectedTile = selected !== null ? getTile(selected) : undefined;
  const selectedRgba = selected !== null ? renderTile(selected) : undefined;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">ART Tiles</h1>
      <p className="text-zinc-400 mb-4">
        {allTiles.length} non-empty tiles across {artFiles.length} ART files.
        Pixels stored column-major, 1 byte per pixel (palette index). Index 255
        = transparent.
      </p>

      <div className="flex gap-4 mb-6 items-center">
        <select
          value={artFilter ?? "all"}
          onChange={(e) =>
            setArtFilter(e.target.value === "all" ? null : Number(e.target.value))
          }
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-1"
        >
          <option value="all">All ART files</option>
          {artFiles.map((art, i) => (
            <option key={i} value={i}>
              TILES{String(art.firstTile / 256).padStart(3, "0")}.ART ({art.tiles.filter((t) => t.width > 0).length} tiles)
            </option>
          ))}
        </select>
        <span className="text-zinc-500 text-sm">{filtered.length} tiles shown</span>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 flex flex-wrap gap-1 content-start overflow-y-auto max-h-[70vh]">
          {filtered.map(({ num }) => {
            const rgba = renderTile(num);
            const tile = getTile(num)!;
            if (!rgba) return null;
            return (
              <button
                key={num}
                onClick={() => setSelected(num)}
                className={`border ${selected === num ? "border-orange-500" : "border-zinc-800"} hover:border-zinc-600 bg-zinc-950`}
                title={`Tile #${num} (${tile.width}×${tile.height})`}
              >
                <TileCanvas
                  rgba={rgba}
                  width={tile.width}
                  height={tile.height}
                  scale={Math.min(2, 64 / Math.max(tile.width, tile.height))}
                />
              </button>
            );
          })}
        </div>

        {selected !== null && selectedTile && selectedRgba && (
          <div className="w-72 flex-shrink-0 border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-zinc-100 font-semibold mb-3">
              Tile #{selected}
            </h3>
            <div className="bg-zinc-900 p-2 mb-4 flex justify-center">
              <TileCanvas
                rgba={selectedRgba}
                width={selectedTile.width}
                height={selectedTile.height}
                scale={Math.min(4, 200 / Math.max(selectedTile.width, selectedTile.height))}
              />
            </div>
            <dl className="text-sm grid grid-cols-2 gap-y-1">
              <dt className="text-zinc-500">Size</dt>
              <dd className="text-zinc-100 mono">
                {selectedTile.width}×{selectedTile.height}
              </dd>
              <dt className="text-zinc-500">Anim frames</dt>
              <dd className="text-zinc-100 mono">{selectedTile.animFrames}</dd>
              <dt className="text-zinc-500">Anim type</dt>
              <dd className="text-zinc-100 mono">{selectedTile.animType}</dd>
              <dt className="text-zinc-500">Offset</dt>
              <dd className="text-zinc-100 mono">
                {selectedTile.xOffset}, {selectedTile.yOffset}
              </dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `/tiles` — should show a grid of all non-empty tile thumbnails. Click one to see it enlarged with metadata in the sidebar.

- [ ] **Step 4: Commit**

```bash
git add src/components/tile-canvas.tsx src/routes/tiles.tsx
git commit -m "feat: tile canvas component and tiles browser page"
```

---

### Task 14: 2D Map View + Maps Page

**Files:**
- Create: `src/components/map-2d.tsx`
- Create: `src/routes/maps.tsx`

- [ ] **Step 1: Create 2D map canvas component**

Create `src/components/map-2d.tsx`:

```tsx
import { useEffect, useRef, useCallback } from "react";
import type { BuildMap, BuildSector, BuildWall } from "../lib/types";

interface Map2DProps {
  map: BuildMap;
  width: number;
  height: number;
  onSectorClick?: (sectorIdx: number) => void;
}

export function Map2D({ map, width, height, onSectorClick }: Map2DProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  // Compute bounds
  const bounds = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0, scale: 1, offX: 0, offY: 0 });

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = width;
    canvas.height = height;

    // Find bounds from all wall positions
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const w of map.walls) {
      minX = Math.min(minX, w.x);
      maxX = Math.max(maxX, w.x);
      minY = Math.min(minY, w.y);
      maxY = Math.max(maxY, w.y);
    }

    const padding = 20;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min(
      (width - padding * 2) / rangeX,
      (height - padding * 2) / rangeY,
    );
    const offX = padding + ((width - padding * 2) - rangeX * scale) / 2;
    const offY = padding + ((height - padding * 2) - rangeY * scale) / 2;

    bounds.current = { minX, maxX, minY, maxY, scale, offX, offY };

    function tx(x: number) { return offX + (x - minX) * scale; }
    function ty(y: number) { return offY + (y - minY) * scale; }

    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, width, height);

    // Draw sector fills
    for (const sector of map.sectors) {
      ctx.beginPath();
      let wallIdx = sector.wallPtr;
      const firstWall = map.walls[wallIdx];
      if (!firstWall) continue;
      ctx.moveTo(tx(firstWall.x), ty(firstWall.y));
      for (let i = 0; i < sector.wallNum; i++) {
        const wall = map.walls[wallIdx];
        const next = map.walls[wall.point2];
        ctx.lineTo(tx(next.x), ty(next.y));
        wallIdx = wall.point2;
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(63, 63, 70, 0.3)";
      ctx.fill();
    }

    // Draw walls
    for (const wall of map.walls) {
      const next = map.walls[wall.point2];
      if (!next) continue;
      ctx.beginPath();
      ctx.moveTo(tx(wall.x), ty(wall.y));
      ctx.lineTo(tx(next.x), ty(next.y));
      ctx.strokeStyle = wall.nextSector >= 0 ? "#71717a" : "#a1a1aa";
      ctx.lineWidth = wall.nextSector >= 0 ? 0.5 : 1;
      ctx.stroke();
    }

    // Draw sprites as dots
    for (const sprite of map.sprites) {
      ctx.beginPath();
      ctx.arc(tx(sprite.x), ty(sprite.y), 2, 0, Math.PI * 2);
      ctx.fillStyle = "#f97316";
      ctx.fill();
    }

    // Player start
    const ps = map.playerStart;
    ctx.beginPath();
    ctx.arc(tx(ps.x), ty(ps.y), 4, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();
  }, [map, width, height]);

  useEffect(() => { draw(); }, [draw]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onSectorClick) return;
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const { minX, minY, scale, offX, offY } = bounds.current;

    // Convert canvas coords to map coords
    const mx = (cx - offX) / scale + minX;
    const my = (cy - offY) / scale + minY;

    // Simple point-in-sector test using ray casting on wall loops
    for (let si = 0; si < map.sectors.length; si++) {
      const sector = map.sectors[si];
      let inside = false;
      let wi = sector.wallPtr;
      for (let i = 0; i < sector.wallNum; i++) {
        const wall = map.walls[wi];
        const next = map.walls[wall.point2];
        const x1 = wall.x, y1 = wall.y, x2 = next.x, y2 = next.y;
        if ((y1 > my) !== (y2 > my) && mx < ((x2 - x1) * (my - y1)) / (y2 - y1) + x1) {
          inside = !inside;
        }
        wi = wall.point2;
      }
      if (inside) {
        onSectorClick(si);
        return;
      }
    }
  }

  return (
    <canvas
      ref={ref}
      className="cursor-crosshair"
      onClick={handleClick}
    />
  );
}
```

- [ ] **Step 2: Implement maps page**

Create `src/routes/maps.tsx`:

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGrp } from "../context/grp-context";
import { Map2D } from "../components/map-2d";

const LEVELS = [
  { file: "E1L1.MAP", name: "Hollywood Holocaust" },
  { file: "E1L2.MAP", name: "Red Light District" },
  { file: "E1L3.MAP", name: "Death Row" },
  { file: "E1L4.MAP", name: "Toxic Dump" },
  { file: "E1L5.MAP", name: "The Abyss" },
  { file: "E1L6.MAP", name: "Launch Facility" },
];

export const Route = createFileRoute("/maps")({
  component: MapsPage,
});

function MapsPage() {
  const { getMap } = useGrp();
  const [levelIdx, setLevelIdx] = useState(0);
  const [selectedSector, setSelectedSector] = useState<number | null>(null);

  const level = LEVELS[levelIdx];
  const map = getMap(level.file);

  const sector = selectedSector !== null ? map.sectors[selectedSector] : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">MAP Format</h1>
      <p className="text-zinc-400 mb-6">
        Build engine levels are 2.5D: 2D floor plans extruded to 3D via
        floor/ceiling heights. Sectors are rooms, walls are lines connecting
        them, sprites are objects placed in sectors.
      </p>

      <div className="flex gap-4 mb-6 items-center">
        <select
          value={levelIdx}
          onChange={(e) => {
            setLevelIdx(Number(e.target.value));
            setSelectedSector(null);
          }}
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-1"
        >
          {LEVELS.map((l, i) => (
            <option key={l.file} value={i}>
              {l.file} — {l.name}
            </option>
          ))}
        </select>
        <span className="text-zinc-500 text-sm">
          {map.sectors.length} sectors · {map.walls.length} walls ·{" "}
          {map.sprites.length} sprites
        </span>
        <Link
          to="/viewer/$map"
          params={{ map: level.file.replace(".MAP", "") }}
          className="ml-auto text-sm bg-orange-500 text-zinc-950 px-4 py-1 font-semibold no-underline hover:bg-orange-400"
        >
          Open in 3D →
        </Link>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 border border-zinc-800 bg-zinc-950">
          <Map2D
            map={map}
            width={800}
            height={600}
            onSectorClick={setSelectedSector}
          />
        </div>

        <div className="w-64 flex-shrink-0">
          {sector && selectedSector !== null ? (
            <div className="border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="text-zinc-100 font-semibold mb-3">
                Sector #{selectedSector}
              </h3>
              <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                <dt className="text-zinc-500">Ceiling Z</dt>
                <dd className="text-zinc-100 mono">{sector.ceilingZ}</dd>
                <dt className="text-zinc-500">Floor Z</dt>
                <dd className="text-zinc-100 mono">{sector.floorZ}</dd>
                <dt className="text-zinc-500">Ceiling tex</dt>
                <dd>
                  <Link to="/tiles" className="mono text-sm">
                    #{sector.ceilingPicnum}
                  </Link>
                </dd>
                <dt className="text-zinc-500">Floor tex</dt>
                <dd>
                  <Link to="/tiles" className="mono text-sm">
                    #{sector.floorPicnum}
                  </Link>
                </dd>
                <dt className="text-zinc-500">Ceiling slope</dt>
                <dd className="text-zinc-100 mono">{sector.ceilingHeinum}</dd>
                <dt className="text-zinc-500">Floor slope</dt>
                <dd className="text-zinc-100 mono">{sector.floorHeinum}</dd>
                <dt className="text-zinc-500">Walls</dt>
                <dd className="text-zinc-100 mono">{sector.wallNum}</dd>
                <dt className="text-zinc-500">Visibility</dt>
                <dd className="text-zinc-100 mono">{sector.visibility}</dd>
                <dt className="text-zinc-500">Lo/Hi tag</dt>
                <dd className="text-zinc-100 mono">
                  {sector.loTag}/{sector.hiTag}
                </dd>
              </dl>
            </div>
          ) : (
            <div className="text-zinc-600 text-sm">
              Click a sector on the map to inspect it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `/maps` — should show 2D overhead view of E1L1 with walls, sectors, sprite dots, and player start marker. Click a sector to see properties. Switch levels with dropdown.

- [ ] **Step 4: Commit**

```bash
git add src/components/map-2d.tsx src/routes/maps.tsx
git commit -m "feat: 2D map viewer and maps page with sector inspector"
```

---

### Task 15: 3D Viewer — Geometry Builder

**Files:**
- Create: `src/components/viewer/build-geometry.ts`

This is the core conversion: Build engine MAP data → Three.js BufferGeometry.

- [ ] **Step 1: Implement geometry builder**

Create `src/components/viewer/build-geometry.ts`:

```ts
import * as THREE from "three";
import type { BuildMap, BuildSector, BuildWall } from "../../lib/types";

/** Build engine uses 16.16 fixed-point for Z. Divide by 8192 gives reasonable scale. */
const Z_SCALE = 1 / 8192;
/** XY coordinates are large integers. Scale down for Three.js. */
const XY_SCALE = 1 / 512;

/**
 * Get the Z height at a point in a sector, accounting for slope.
 * heinum is the slope value (rise per 4096 horizontal units along the first wall).
 */
function getSlopeZ(
  baseZ: number,
  heinum: number,
  px: number,
  py: number,
  firstWall: BuildWall,
  walls: BuildWall[],
): number {
  if (heinum === 0) return baseZ * Z_SCALE;

  const nextWall = walls[firstWall.point2];
  const dx = nextWall.x - firstWall.x;
  const dy = nextWall.y - firstWall.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return baseZ * Z_SCALE;

  // Normal to the first wall (pointing into the sector)
  const nx = -dy / len;
  const ny = dx / len;

  // Distance from the first wall along the normal
  const dist = (px - firstWall.x) * nx + (py - firstWall.y) * ny;

  return (baseZ + (heinum * dist) / 4096) * Z_SCALE;
}

export interface LevelGeometry {
  /** All wall quads merged into one geometry */
  walls: THREE.BufferGeometry;
  /** Floor polygons */
  floors: THREE.BufferGeometry;
  /** Ceiling polygons */
  ceilings: THREE.BufferGeometry;
  /** UV data keyed by picnum for texturing */
  wallPicnums: number[];
  floorPicnums: number[];
  ceilingPicnums: number[];
  /** Sprite positions and picnums for billboard rendering */
  sprites: { x: number; y: number; z: number; picnum: number; ang: number; xRepeat: number; yRepeat: number; cstat: number }[];
}

/**
 * Build wall quads for a sector.
 * Returns arrays of positions, normals, and UVs to be merged.
 */
function buildSectorWalls(
  sector: BuildSector,
  sectorIdx: number,
  map: BuildMap,
): { positions: number[]; uvs: number[]; picnums: number[] } {
  const positions: number[] = [];
  const uvs: number[] = [];
  const picnums: number[] = [];

  const firstWall = map.walls[sector.wallPtr];

  for (let i = 0; i < sector.wallNum; i++) {
    const wallIdx = sector.wallPtr + i;
    const wall = map.walls[wallIdx];
    const nextWall = map.walls[wall.point2];

    const x1 = wall.x * XY_SCALE;
    const y1 = wall.y * XY_SCALE;
    const x2 = nextWall.x * XY_SCALE;
    const y2 = nextWall.y * XY_SCALE;

    const ceilZ1 = getSlopeZ(sector.ceilingZ, sector.ceilingHeinum, wall.x, wall.y, firstWall, map.walls);
    const ceilZ2 = getSlopeZ(sector.ceilingZ, sector.ceilingHeinum, nextWall.x, nextWall.y, firstWall, map.walls);
    const floorZ1 = getSlopeZ(sector.floorZ, sector.floorHeinum, wall.x, wall.y, firstWall, map.walls);
    const floorZ2 = getSlopeZ(sector.floorZ, sector.floorHeinum, nextWall.x, nextWall.y, firstWall, map.walls);

    if (wall.nextSector < 0) {
      // Solid wall: floor to ceiling
      // Two triangles: (x1,floor1) (x2,floor2) (x2,ceil2) and (x1,floor1) (x2,ceil2) (x1,ceil1)
      positions.push(
        x1, -ceilZ1, y1,  x2, -ceilZ2, y2,  x2, -floorZ2, y2,
        x1, -ceilZ1, y1,  x2, -floorZ2, y2,  x1, -floorZ1, y1,
      );
      uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
      picnums.push(wall.picnum, wall.picnum);
    } else {
      // Portal wall: draw upper and lower portions
      const adjSector = map.sectors[wall.nextSector];
      const adjFirstWall = map.walls[adjSector.wallPtr];

      const adjCeilZ1 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjCeilZ2 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);
      const adjFloorZ1 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjFloorZ2 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);

      // Upper wall (our ceiling to their ceiling, if ours is higher)
      if (ceilZ1 < adjCeilZ1 || ceilZ2 < adjCeilZ2) {
        positions.push(
          x1, -ceilZ1, y1,  x2, -ceilZ2, y2,  x2, -adjCeilZ2, y2,
          x1, -ceilZ1, y1,  x2, -adjCeilZ2, y2,  x1, -adjCeilZ1, y1,
        );
        uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
        const pic = wall.overPicnum || wall.picnum;
        picnums.push(pic, pic);
      }

      // Lower wall (their floor to our floor, if ours is lower)
      if (floorZ1 > adjFloorZ1 || floorZ2 > adjFloorZ2) {
        positions.push(
          x1, -adjFloorZ1, y1,  x2, -adjFloorZ2, y2,  x2, -floorZ2, y2,
          x1, -adjFloorZ1, y1,  x2, -floorZ2, y2,  x1, -floorZ1, y1,
        );
        uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
        picnums.push(wall.picnum, wall.picnum);
      }
    }
  }

  return { positions, uvs, picnums };
}

/**
 * Triangulate a sector's floor or ceiling polygon using ear clipping.
 * Simple fan triangulation from first vertex — works for convex and many concave sectors.
 */
function triangulateSector(
  sector: BuildSector,
  map: BuildMap,
  isCeiling: boolean,
): number[] {
  const positions: number[] = [];
  const verts: [number, number, number][] = [];
  const firstWall = map.walls[sector.wallPtr];
  const heinum = isCeiling ? sector.ceilingHeinum : sector.floorHeinum;
  const baseZ = isCeiling ? sector.ceilingZ : sector.floorZ;

  for (let i = 0; i < sector.wallNum; i++) {
    const wall = map.walls[sector.wallPtr + i];
    const z = getSlopeZ(baseZ, heinum, wall.x, wall.y, firstWall, map.walls);
    verts.push([wall.x * XY_SCALE, -z, wall.y * XY_SCALE]);
  }

  // Fan triangulation from vertex 0
  for (let i = 1; i < verts.length - 1; i++) {
    if (isCeiling) {
      // Ceiling faces down — reverse winding
      positions.push(...verts[0], ...verts[i + 1], ...verts[i]);
    } else {
      positions.push(...verts[0], ...verts[i], ...verts[i + 1]);
    }
  }

  return positions;
}

export function buildLevelGeometry(map: BuildMap): LevelGeometry {
  const allWallPos: number[] = [];
  const allWallUvs: number[] = [];
  const allWallPicnums: number[] = [];
  const allFloorPos: number[] = [];
  const allFloorPicnums: number[] = [];
  const allCeilPos: number[] = [];
  const allCeilPicnums: number[] = [];

  for (let si = 0; si < map.sectors.length; si++) {
    const sector = map.sectors[si];

    // Walls
    const wallData = buildSectorWalls(sector, si, map);
    allWallPos.push(...wallData.positions);
    allWallUvs.push(...wallData.uvs);
    allWallPicnums.push(...wallData.picnums);

    // Floor
    const floorPos = triangulateSector(sector, map, false);
    allFloorPos.push(...floorPos);
    for (let t = 0; t < floorPos.length / 9; t++) {
      allFloorPicnums.push(sector.floorPicnum);
    }

    // Ceiling
    const ceilPos = triangulateSector(sector, map, true);
    allCeilPos.push(...ceilPos);
    for (let t = 0; t < ceilPos.length / 9; t++) {
      allCeilPicnums.push(sector.ceilingPicnum);
    }
  }

  const walls = new THREE.BufferGeometry();
  walls.setAttribute("position", new THREE.Float32BufferAttribute(allWallPos, 3));
  if (allWallUvs.length > 0) {
    walls.setAttribute("uv", new THREE.Float32BufferAttribute(allWallUvs, 2));
  }
  walls.computeVertexNormals();

  const floors = new THREE.BufferGeometry();
  floors.setAttribute("position", new THREE.Float32BufferAttribute(allFloorPos, 3));
  floors.computeVertexNormals();

  const ceilings = new THREE.BufferGeometry();
  ceilings.setAttribute("position", new THREE.Float32BufferAttribute(allCeilPos, 3));
  ceilings.computeVertexNormals();

  // Sprites
  const sprites = map.sprites.map((s) => ({
    x: s.x * XY_SCALE,
    y: -s.z * Z_SCALE,
    z: s.y * XY_SCALE,
    picnum: s.picnum,
    ang: s.ang,
    xRepeat: s.xRepeat,
    yRepeat: s.yRepeat,
    cstat: s.cstat,
  }));

  return {
    walls,
    floors,
    ceilings,
    wallPicnums: allWallPicnums,
    floorPicnums: allFloorPicnums,
    ceilingPicnums: allCeilPicnums,
    sprites,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/viewer/build-geometry.ts
git commit -m "feat: Build engine MAP to Three.js geometry converter"
```

---

### Task 16: 3D Viewer — Fly Camera + Scene + HUD

**Files:**
- Create: `src/components/viewer/fly-camera.tsx`
- Create: `src/components/viewer/hud.tsx`
- Create: `src/components/viewer/scene.tsx`

- [ ] **Step 1: Create fly camera controller**

Create `src/components/viewer/fly-camera.tsx`:

```tsx
import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

interface FlyCameraProps {
  startPos: [number, number, number];
  startAngle: number;
  speed?: number;
  onPositionChange?: (pos: THREE.Vector3) => void;
}

export function FlyCamera({
  startPos,
  startAngle,
  speed = 5,
  onPositionChange,
}: FlyCameraProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const keys = useRef(new Set<string>());

  useEffect(() => {
    camera.position.set(...startPos);
    // Build engine angle: 0=east, 512=north, 1024=west, 1536=south
    // Convert to radians: angle * (2π/2048)
    const radians = (startAngle * Math.PI * 2) / 2048;
    camera.rotation.set(0, radians, 0);
  }, [startPos, startAngle, camera]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { keys.current.add(e.code); }
    function onKeyUp(e: KeyboardEvent) { keys.current.delete(e.code); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const k = keys.current;
    const boost = k.has("ShiftLeft") || k.has("ShiftRight") ? 3 : 1;
    const s = speed * boost * delta;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();

    if (k.has("KeyW")) camera.position.addScaledVector(dir, s);
    if (k.has("KeyS")) camera.position.addScaledVector(dir, -s);
    if (k.has("KeyA")) camera.position.addScaledVector(right, -s);
    if (k.has("KeyD")) camera.position.addScaledVector(right, s);
    if (k.has("KeyQ") || k.has("Space")) camera.position.y += s;
    if (k.has("KeyE") || k.has("ControlLeft")) camera.position.y -= s;

    onPositionChange?.(camera.position.clone());
  });

  return <PointerLockControls ref={controlsRef} />;
}
```

- [ ] **Step 2: Create HUD overlay**

Create `src/components/viewer/hud.tsx`:

```tsx
interface HudProps {
  position: { x: number; y: number; z: number } | null;
  wireframe: boolean;
  onToggleWireframe: () => void;
  mapName: string;
}

export function Hud({ position, wireframe, onToggleWireframe, mapName }: HudProps) {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none flex justify-between items-start">
      <div className="bg-zinc-950/80 border border-zinc-800 px-3 py-2 mono text-xs text-zinc-400">
        <div className="text-orange-500 font-semibold mb-1">{mapName}</div>
        {position && (
          <div>
            {position.x.toFixed(1)}, {position.y.toFixed(1)},{" "}
            {position.z.toFixed(1)}
          </div>
        )}
      </div>
      <div className="flex gap-2 pointer-events-auto">
        <button
          onClick={onToggleWireframe}
          className={`px-3 py-1 text-xs font-semibold border ${
            wireframe
              ? "bg-orange-500 text-zinc-950 border-orange-500"
              : "bg-zinc-950/80 text-zinc-400 border-zinc-700 hover:text-zinc-100"
          }`}
        >
          {wireframe ? "Wireframe" : "Textured"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create main viewer scene**

Create `src/components/viewer/scene.tsx`:

```tsx
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { buildLevelGeometry } from "./build-geometry";
import { FlyCamera } from "./fly-camera";
import type { BuildMap } from "../../lib/types";

interface ViewerSceneProps {
  map: BuildMap;
  wireframe: boolean;
  onPositionChange?: (pos: THREE.Vector3) => void;
}

const Z_SCALE = 1 / 8192;
const XY_SCALE = 1 / 512;

export function ViewerScene({ map, wireframe, onPositionChange }: ViewerSceneProps) {
  const geometry = useMemo(() => buildLevelGeometry(map), [map]);

  const material = useMemo(
    () =>
      wireframe
        ? new THREE.MeshBasicMaterial({
            color: "#f97316",
            wireframe: true,
          })
        : new THREE.MeshStandardMaterial({
            color: "#a1a1aa",
            side: THREE.DoubleSide,
            roughness: 0.9,
          }),
    [wireframe],
  );

  const startPos: [number, number, number] = [
    map.playerStart.x * XY_SCALE,
    -map.playerStart.z * Z_SCALE,
    map.playerStart.y * XY_SCALE,
  ];

  return (
    <Canvas
      className="!absolute inset-0"
      camera={{ fov: 75, near: 0.1, far: 5000 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#09090b"]} />
      {!wireframe && (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[50, 100, 50]} intensity={0.8} />
        </>
      )}
      <mesh geometry={geometry.walls} material={material} />
      <mesh geometry={geometry.floors} material={material} />
      <mesh geometry={geometry.ceilings} material={material} />

      {/* Sprites as simple billboard quads */}
      {geometry.sprites.map((sprite, i) => (
        <mesh
          key={i}
          position={[sprite.x, sprite.y, sprite.z]}
        >
          <planeGeometry args={[
            (sprite.xRepeat / 32) * 2,
            (sprite.yRepeat / 32) * 2,
          ]} />
          <meshBasicMaterial
            color="#f97316"
            wireframe={wireframe}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      <FlyCamera
        startPos={startPos}
        startAngle={map.playerStart.ang}
        speed={8}
        onPositionChange={onPositionChange}
      />
    </Canvas>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/viewer/fly-camera.tsx src/components/viewer/hud.tsx src/components/viewer/scene.tsx
git commit -m "feat: 3D viewer with fly camera, HUD, and geometry rendering"
```

---

### Task 17: Viewer Route

**Files:**
- Create: `src/routes/viewer.$map.tsx`

- [ ] **Step 1: Implement viewer route**

Create `src/routes/viewer.$map.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useGrp } from "../context/grp-context";
import { ViewerScene } from "../components/viewer/scene";
import { Hud } from "../components/viewer/hud";
import type * as THREE from "three";

const LEVELS = [
  { id: "E1L1", file: "E1L1.MAP", name: "Hollywood Holocaust" },
  { id: "E1L2", file: "E1L2.MAP", name: "Red Light District" },
  { id: "E1L3", file: "E1L3.MAP", name: "Death Row" },
  { id: "E1L4", file: "E1L4.MAP", name: "Toxic Dump" },
  { id: "E1L5", file: "E1L5.MAP", name: "The Abyss" },
  { id: "E1L6", file: "E1L6.MAP", name: "Launch Facility" },
];

export const Route = createFileRoute("/viewer/$map")({
  component: ViewerPage,
});

function ViewerPage() {
  const { map: mapParam } = Route.useParams();
  const { getMap } = useGrp();

  const level = LEVELS.find((l) => l.id === mapParam) ?? LEVELS[0];
  const map = getMap(level.file);

  const [wireframe, setWireframe] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  const handlePos = useCallback((pos: THREE.Vector3) => {
    setPosition({ x: pos.x, y: pos.y, z: pos.z });
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-49px)]">
      <ViewerScene
        map={map}
        wireframe={wireframe}
        onPositionChange={handlePos}
      />
      <Hud
        position={position}
        wireframe={wireframe}
        onToggleWireframe={() => setWireframe((w) => !w)}
        mapName={`${level.id} — ${level.name}`}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-950/80 border border-zinc-800 px-4 py-2 text-xs text-zinc-500 text-center pointer-events-none">
        Click to look around · WASD to move · Q/E up/down · Shift to boost · Esc to release
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Regenerate route tree and verify**

```bash
npx tsr generate
npm run dev
```

Navigate to `/viewer/E1L1` — should show the 3D view of Hollywood Holocaust. Click to activate pointer lock, WASD to fly around. Toggle wireframe with the button.

- [ ] **Step 3: Commit**

```bash
git add src/routes/viewer.\$map.tsx
npx tsr generate
git add src/routeTree.gen.ts
git commit -m "feat: 3D viewer route with level selection"
```

---

### Task 18: Scripts Page

**Files:**
- Create: `src/routes/scripts.tsx`

- [ ] **Step 1: Implement scripts page**

Create `src/routes/scripts.tsx`:

```tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useGrp } from "../context/grp-context";

const CON_FILES = ["GAME.CON", "USER.CON", "DEFS.CON"];

const KEYWORD_RE = /\b(actor|enda|state|ends|move|ai|action|define|gamevar|include|ifcount|ifpdistl|ifrnd|ifcansee|ifhitweapon|ifdead|ifai|ifaction|ifmove|spawn|shoot|sound|debris|addkills|killit|sizeto|ifp|ifspritepal|ifgapzl|ifnotmoving|operate|myos|myospal|quote|palfrom|globalsound)\b/g;
const COMMENT_RE = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
const NUMBER_RE = /\b(\d+)\b/g;
const DEFINE_RE = /^(define\s+)(\w+)/gm;

function highlightCon(source: string): string {
  // Escape HTML first
  let html = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Comments (must be first to avoid highlighting inside comments)
  html = html.replace(COMMENT_RE, '<span class="text-zinc-600">$1</span>');
  // Keywords
  html = html.replace(KEYWORD_RE, '<span class="text-orange-400">$1</span>');
  // Numbers
  html = html.replace(NUMBER_RE, '<span class="text-cyan-400">$1</span>');

  return html;
}

export const Route = createFileRoute("/scripts")({
  component: ScriptsPage,
});

function ScriptsPage() {
  const { archive } = useGrp();
  const [activeFile, setActiveFile] = useState("GAME.CON");

  const source = useMemo(() => {
    const bytes = archive.getFileBytes(activeFile);
    return new TextDecoder("ascii").decode(bytes);
  }, [archive, activeFile]);

  const highlighted = useMemo(() => highlightCon(source), [source]);

  const lines = source.split("\n").length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">CON Scripts</h1>
      <p className="text-zinc-400 mb-6">
        Duke3D's game logic is defined in .CON files — a custom scripting
        language by Todd Replogle. Actors, weapons, AI behaviors, sound
        triggers, and game constants are all here.
      </p>

      <div className="flex gap-2 mb-4">
        {CON_FILES.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFile(f)}
            className={`px-4 py-1 text-sm font-semibold border ${
              activeFile === f
                ? "bg-orange-500 text-zinc-950 border-orange-500"
                : "bg-zinc-950 text-zinc-400 border-zinc-700 hover:text-zinc-100"
            }`}
          >
            {f}
          </button>
        ))}
        <span className="text-zinc-600 text-sm self-center ml-4">
          {lines} lines
        </span>
      </div>

      <div className="bg-zinc-950 border border-zinc-800 overflow-auto max-h-[70vh]">
        <pre className="p-4 text-xs leading-relaxed mono">
          <code dangerouslySetInnerHTML={{ __html: highlighted }} />
        </pre>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/scripts` — should show syntax-highlighted GAME.CON with tab switching between the three CON files.

- [ ] **Step 3: Commit**

```bash
git add src/routes/scripts.tsx
git commit -m "feat: CON scripts page with syntax highlighting"
```

---

### Task 19: Audio Page

**Files:**
- Create: `src/routes/audio.tsx`

- [ ] **Step 1: Implement audio page**

Create `src/routes/audio.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useMemo, useCallback } from "react";
import { useGrp } from "../context/grp-context";
import { parseVoc } from "../lib/voc";

export const Route = createFileRoute("/audio")({
  component: AudioPage,
});

function AudioPage() {
  const { archive } = useGrp();
  const [playing, setPlaying] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const vocFiles = useMemo(
    () => archive.files.filter((f) => f.name.endsWith(".VOC")),
    [archive],
  );
  const midFiles = useMemo(
    () => archive.files.filter((f) => f.name.endsWith(".MID")),
    [archive],
  );

  const playVoc = useCallback(
    (name: string) => {
      // Stop current
      sourceRef.current?.stop();

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;

      const vocData = parseVoc(archive.getFile(name));
      const buffer = ctx.createBuffer(1, vocData.samples.length, vocData.sampleRate);
      buffer.getChannelData(0).set(vocData.samples);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setPlaying(null);
      source.start();

      sourceRef.current = source;
      setPlaying(name);
    },
    [archive],
  );

  const stop = useCallback(() => {
    sourceRef.current?.stop();
    setPlaying(null);
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">Audio</h1>
      <p className="text-zinc-400 mb-8">
        {vocFiles.length} Creative Voice files (.VOC) — 8-bit unsigned PCM
        decoded to Web Audio. Sound effects, Duke's one-liners, ambience, and
        enemy sounds.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Sound Effects ({vocFiles.length})
        </h2>
        <div className="overflow-y-auto max-h-[50vh] border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900">
              <tr className="text-left text-zinc-500 border-b border-zinc-800">
                <th className="p-2 font-medium w-8"></th>
                <th className="p-2 font-medium">Name</th>
                <th className="p-2 font-medium text-right">Size</th>
              </tr>
            </thead>
            <tbody>
              {vocFiles.map((f) => (
                <tr
                  key={f.name}
                  className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer ${
                    playing === f.name ? "bg-orange-500/10" : ""
                  }`}
                  onClick={() =>
                    playing === f.name ? stop() : playVoc(f.name)
                  }
                >
                  <td className="p-2 text-center">
                    {playing === f.name ? (
                      <span className="text-orange-500">■</span>
                    ) : (
                      <span className="text-zinc-600">▶</span>
                    )}
                  </td>
                  <td className="p-2 mono text-zinc-100">{f.name}</td>
                  <td className="p-2 mono text-zinc-400 text-right">
                    {f.size.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Music ({midFiles.length} MIDI tracks)
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-800">
              <th className="pb-2 font-medium">Name</th>
              <th className="pb-2 font-medium text-right">Size</th>
              <th className="pb-2 font-medium pl-4">Note</th>
            </tr>
          </thead>
          <tbody>
            {midFiles.map((f) => (
              <tr key={f.name} className="border-b border-zinc-800/50">
                <td className="py-2 mono text-zinc-100">{f.name}</td>
                <td className="py-2 mono text-zinc-400 text-right">
                  {f.size.toLocaleString()}
                </td>
                <td className="py-2 text-zinc-500 pl-4">
                  {f.name === "GRABBAG.MID"
                    ? "Main theme"
                    : "Level music"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-zinc-600 text-sm mt-4">
          MIDI playback requires a soundfont — listed here for reference.
        </p>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/audio` — should show clickable VOC list (plays audio on click) and MIDI file listing. Test clicking a sound like PISTOL.VOC.

- [ ] **Step 3: Commit**

```bash
git add src/routes/audio.tsx
git commit -m "feat: audio page with VOC playback via Web Audio"
```

---

### Task 20: Route Generation + Final Integration

**Files:**
- Modify: `src/routeTree.gen.ts` (auto-generated)

- [ ] **Step 1: Regenerate all routes**

```bash
npx tsr generate
```

- [ ] **Step 2: Verify all routes work**

Start dev server and check each route:

```bash
npm run dev
```

Visit each: `/`, `/archive`, `/grp`, `/palette`, `/tiles`, `/maps`, `/viewer/E1L1`, `/scripts`, `/audio`.

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: all parser tests pass.

- [ ] **Step 4: Build for production**

```bash
npm run build
```

Should complete without errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: complete Duke3D reverse engineering explorer — all pages and parsers"
```
