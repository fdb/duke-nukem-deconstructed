import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/rendering")({
  component: RenderingPage,
});

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-zinc-900 border border-zinc-800 px-4 py-3 text-sm font-mono text-zinc-300 overflow-x-auto my-3">
      {children}
    </pre>
  );
}

function Formula({ children }: { children: string }) {
  return <code className="bg-zinc-800 text-orange-300 px-1.5 py-0.5 text-sm font-mono">{children}</code>;
}

function Tag({ color, children }: { color: "orange" | "blue" | "green" | "red" | "purple"; children: string }) {
  const colors = {
    orange: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    red: "bg-red-500/10 text-red-400 border-red-500/30",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  };
  return <span className={`text-xs font-mono px-2 py-0.5 border ${colors[color]}`}>{children}</span>;
}

function RenderingPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">Rendering Pipeline</h1>
      <p className="text-zinc-400 mb-2">
        Reconstructing the Build engine's 2.5D world in Three.js / WebGL.
      </p>
      <p className="text-zinc-500 text-sm mb-10">
        <a href="/viewer/E1L1" className="text-orange-500 no-underline hover:text-orange-400">Open the 3D viewer</a> to see these systems in action.
      </p>

      {/* ── Coordinate Mapping ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">01</span> Coordinate Mapping
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-zinc-900 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Build Engine</div>
            <Code>{`X → East    (int32)
Y → South   (int32)
Z → Down    (int32, 16x finer)
Angles: 2048 = full rotation`}</Code>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Three.js</div>
            <Code>{`X = Build.X / 512
Y = -Build.Z / 8192   (flipped!)
Z = Build.Y / 512
Angles: 2π = full rotation`}</Code>
          </div>
        </div>
        <p className="text-zinc-400 text-sm">
          The Z axis is inverted and scaled differently because Build measures vertical height
          at 16x the resolution of horizontal coordinates.
        </p>
      </section>

      {/* ── Angles ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">02</span> Angle Conversion
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-4">
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Tag color="blue">Camera</Tag>
                <span className="text-zinc-500 text-sm">Three.js rotation.y is clockwise</span>
              </div>
              <Code>{`rotation.y = -(angle * 2π / 2048) - π/2`}</Code>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Tag color="green">Sprites</Tag>
                <span className="text-zinc-500 text-sm">Direction vectors use standard trig</span>
              </div>
              <Code>{`ang = +(angle * 2π / 2048) - π/2    ← note POSITIVE sign!`}</Code>
            </div>
          </div>
        </div>
        <p className="text-zinc-400 text-sm">
          The <Formula>{"-π/2"}</Formula> offset accounts for the 90° coordinate rotation (Build X = East,
          Three.js -Z = North). Getting the sign wrong was our hardest bug — sprites appeared
          rotated ~45° for diagonal angles.
        </p>
      </section>

      {/* ── Texture Atlas ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">03</span> Texture Atlas
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-4">
          <Code>{`┌──────────────────────────── 2048px ────────────────────────────┐
│ ┌─tile 0──┐ ┌─tile 1──────┐ ┌─tile 2─┐ ┌─tile 3───────────┐ │
│ │  64×64  │ │   128×64    │ │ 32×32  │ │     256×128      │ │
│ └─────────┘ └─────────────┘ └────────┘ └──────────────────┘ │
│ ┌─tile 4──────────────┐ ┌─tile 5─┐ ┌─tile 6────┐           │
│ │      128×128        │ │ 64×64  │ │  96×64    │           │
│ │                     │ └────────┘ └───────────┘  . . .    │
│ └─────────────────────┘                                     │
│                           . . .                              │
└──────────────────────────────────────────────────────────────┘`}</Code>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm mb-3">
          <div className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-orange-400 font-semibold mb-1">Shelf Packing</div>
            <p className="text-zinc-500">Tiles packed left-to-right, wrapping to new rows. Single 2048x2048 atlas.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-orange-400 font-semibold mb-1">Column-Major ART</div>
            <p className="text-zinc-500">ART files store pixels column-first. Transposed to row-major on load. Index 255 = transparent.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-orange-400 font-semibold mb-1">Tiled Shader</div>
            <p className="text-zinc-500">Per-vertex <Formula>{"atlasRect"}</Formula> (vec4) + <Formula>{"fract(uv)"}</Formula> for seamless repeating within sub-rects.</p>
          </div>
        </div>
      </section>

      {/* ── Walls ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">04</span> Wall Rendering
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-4">
          <Code>{`Solid Wall          Portal Wall          Masked Wall
┌──────────┐      ┌──────────┐          ┌──────────┐
│ ceiling  │      │ upper    │ ← our    │          │
│          │      │..........│   ceil    │  ╳ ╳ ╳  │ ← overPicnum
│  picnum  │      │  portal  │          │  ╳ ╳ ╳  │   (alpha)
│          │      │  opening │          │  ╳ ╳ ╳  │
│ floor    │      │..........│ ← adj    │          │
└──────────┘      │ lower    │   floor  └──────────┘
                  └──────────┘

UV: uRepeat = xrepeat × 8 / tileWidth
    vRepeat = heightZ × yrepeat / (tileHeight × 2048)`}</Code>
        </div>
        <p className="text-zinc-400 text-sm">
          When both sectors have parallax ceiling, the upper wall is skipped entirely — this prevents
          phantom gray walls at sky boundaries. Masked walls (cstat bit 4) render the portal opening
          with <Formula>{"overPicnum"}</Formula> and alpha testing.
        </p>
      </section>

      {/* ── Floors/Ceilings ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">05</span> Floors & Ceilings
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-4">
          <Code>{`UV = worldPos / (tileDim × scaleCoef) + panning/256

stat bits control texture transform:
  bit 0 (1)  → parallax (skip geometry, use sky)
  bit 2 (4)  → swap X/Y (90° rotation)
  bit 3 (8)  → double expand (scaleCoef = 8 not 16)
  bit 4 (16) → flip X
  bit 5 (32) → flip Y
  bit 6 (64) → align relative to first wall

IMPORTANT: V coordinate uses -Y  (tey = -wal->y)`}</Code>
        </div>
      </section>

      {/* ── Slopes ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">06</span> Slopes
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-3">
          <Code>{`z_offset = heinum × perpDist / 256

           heinum > 0          heinum < 0
          ╱‾‾‾‾‾‾‾‾‾╲       ╲__________╱
   slope up from        slope down from
   first wall           first wall`}</Code>
        </div>
        <p className="text-zinc-400 text-sm">
          The divisor is <strong className="text-red-400">256</strong>, not 4096. Using 4096 makes slopes 16× too shallow —
          thatched roofs appear nearly flat. Derived from EDuke32's <Formula>{"getzsofslopeptr()"}</Formula> which
          uses <Formula>{"dmulscale3"}</Formula> (÷8) and <Formula>{"nsqrtasm<<5"}</Formula> (×32) → net ÷256.
        </p>
      </section>

      {/* ── Sprites ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">07</span> Sprites
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-4">
          <Code>{`                Face              Wall              Floor
              ┌─────┐          ┌─────┐           ─────────
              │  ☺  │  bill-   │     │  rotated  │       │  flat in
              │     │  board   │     │  by ang   │       │  XZ plane
              └─────┘          └─────┘           ─────────

  xRatio    xRepeat×0.20    xRepeat×0.25    xRepeat×0.25
  yRatio    yRepeat×0.25    yRepeat×0.25    yRepeat×0.25
  size      tileW × ratio / 512`}</Code>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-orange-400 font-semibold mb-1">Batching</div>
            <p className="text-zinc-500">All ~370 sprites packed into 1 BufferGeometry. Face sprites update vertex positions per-frame via camera right vector.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-orange-400 font-semibold mb-1">Flip Logic</div>
            <p className="text-zinc-500"><Formula>{"flipu = xflip XOR isFloor"}</Formula><br/><Formula>{"flipv = yflip AND NOT isFloor"}</Formula><br/>Floor sprites invert the xflip bit!</p>
          </div>
        </div>
      </section>

      {/* ── Sky ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">08</span> Parallax Sky
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-3">
          <Code>{`         tile+0   tile+1   tile+2   tile+3
        ┌────────┬────────┬────────┬────────┐
        │        │        │        │        │  8-panel
  top   │  sky   │  sky   │  sky   │  sky   │  cylinder
        │        │        │        │        │  centered
  bot   ├────────┼────────┼────────┼────────┤  on camera
        │ tile+4 │ tile+5 │ tile+6 │ tile+7 │
        └────────┴────────┴────────┴────────┘
  Winding: CCW from inside → FrontSide
  depthWrite: false, depthTest: false, renderOrder: -1`}</Code>
        </div>
      </section>

      {/* ── Shading ── */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">09</span> Shading
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-3">
          <div className="flex items-center gap-1 mb-2">
            {Array.from({ length: 16 }, (_, i) => {
              const b = Math.max(0, Math.min(255, Math.round(255 * (1 - i / 15))));
              return <div key={i} className="w-6 h-8 flex items-end justify-center text-[9px]" style={{ backgroundColor: `rgb(${b},${b},${b})` }}>
                <span style={{ color: b > 128 ? "#000" : "#888" }}>{i * 2}</span>
              </div>;
            })}
          </div>
          <Code>{`brightness = clamp(1.0 - shade / 30.0, 0.05, 1.5)

shade  0 → full brightness (outdoors)
shade 15 → half brightness (dim room)
shade 30 → near black (dark corner)
shade -8 → overbright (1.27× brightness)`}</Code>
        </div>
        <p className="text-zinc-400 text-sm">
          Each wall, floor, ceiling, and sprite has its own shade value stored as a per-vertex
          float attribute. The original engine uses a 32-row shade table for indexed color lookup,
          but linear approximation works well for RGB rendering.
        </p>
      </section>

      {/* ── Animation ── */}
      <section className="mb-16">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 flex items-center gap-3">
          <span className="text-orange-500">10</span> Tile Animation
        </h2>
        <div className="bg-zinc-900 border border-zinc-800 p-4 mb-3">
          <Code>{`picanm { animFrames, animType, animSpeed }

Type 1 (oscillate):  0 → 1 → 2 → 3 → 2 → 1 → 0 → 1 ...
Type 2 (forward):    0 → 1 → 2 → 3 → 0 → 1 → 2 → 3 ...
Type 3 (backward):   0 → -1 → -2 → -3 → 0 → -1 ...

Speed: totalClock >> animSpeed  (higher = slower)
Clock: 120 ticks/second (Build engine rate)
Tile:  basePicnum + offset`}</Code>
        </div>
        <p className="text-zinc-400 text-sm">
          All animation frame tiles are pre-loaded into the atlas. Per-frame, the <Formula>{"atlasRect"}</Formula> attribute
          is updated for surfaces with animated tiles, swapping the UV sub-rect to show the current frame.
        </p>
      </section>

      {/* ── Pitfalls ── */}
      <section>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Pitfalls & War Stories</h2>
        <p className="text-zinc-500 text-sm mb-6">
          Hard-won lessons from matching EDuke32's rendering. Each took significant debugging.
        </p>
        <div className="space-y-4">
          {PITFALLS.map((p) => (
            <details key={p.title} className="group border border-zinc-800">
              <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/30">
                <span className="text-red-400 text-lg leading-none group-open:rotate-90 transition-transform">&#9656;</span>
                <span className="text-zinc-200 text-sm font-medium flex-1">{p.title}</span>
                <code className="text-xs text-zinc-600 font-mono">{p.commit}</code>
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50">
                <div className="mb-3">
                  <span className="text-xs font-bold text-red-400/70 uppercase tracking-wider">Bug</span>
                  <p className="text-zinc-400 text-sm mt-1">{p.problem}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-400/70 uppercase tracking-wider">Fix</span>
                  <p className="text-zinc-300 text-sm mt-1">{p.solution}</p>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

const PITFALLS = [
  {
    title: "Sprite Direction Vector Sign (the 45° bug)",
    problem:
      "Wall sprites (fences, ventilator, police line) appeared rotated ~45° from their correct orientation. This was the hardest bug — it only manifested for diagonal angles, making it seem like an offset issue rather than a sign issue.",
    solution:
      "The angle formula for sprites needs a POSITIVE sign: +(angle × 2π/2048) - π/2. Camera rotation uses NEGATIVE because Three.js rotation.y is clockwise. Sprite cos/sin direction vectors follow standard math convention. Verified against the classic engine's get_wallspr_dims().",
    commit: "f1ecf56",
  },
  {
    title: "picanm Signed Offset Parsing",
    problem:
      "Gas bottles, ventilators, and many other sprites were wildly displaced — shifted by hundreds of pixels in random directions. The ART file's picanm xOffset/yOffset are signed int8 (-128 to 127) but were parsed as unsigned (0-255). A centering offset of -20 was read as 236.",
    solution:
      "Sign-extend using ((value & 0xff) << 24 >> 24). JavaScript's bitwise operators work on 32-bit signed ints — shifting left puts the byte's sign bit into position 31, then arithmetic right-shift propagates it back.",
    commit: "f1ecf56",
  },
  {
    title: "Slope Divisor: 4096 vs 256",
    problem:
      "Thatched roofs and ramps appeared nearly flat — 16× too shallow. The slope formula used divisor 4096 instead of 256.",
    solution:
      "Traced through EDuke32's getzsofslopeptr(): dmulscale3 (÷8) and nsqrtasm<<5 (×32) give net divisor 8×32 = 256. The 4096 was a guess that happened to produce 'some' slope — just 16× too little.",
    commit: "383c668",
  },
  {
    title: "Floor Texture Orientation",
    problem:
      "Wood floor planks ran perpendicular to their correct direction. Floor textures appeared rotated vs EDuke32.",
    solution:
      "EDuke32 uses tey = -wal->y (negated Y!) for floor UV computation. Also implemented stat bits: swap XY (bit 2), double expand (bit 3), flip X/Y (bits 4-5), relative-to-first-wall alignment (bit 6).",
    commit: "f1ecf56",
  },
  {
    title: "Invisible Sky",
    problem:
      "The parallax sky (LA night cityscape with buildings) was invisible — just solid black.",
    solution:
      "Two issues: (1) Cylinder triangles wound CW from inside → back-faces invisible with BackSide. Fixed to CCW + FrontSide. (2) Added depthTest:false matching EDuke32 which disables depth test for sky rendering.",
    commit: "f1ecf56",
  },
  {
    title: "Phantom Gray Walls",
    problem:
      "Large gray walls appeared around the rooftop perimeter where EDuke32 showed open sky.",
    solution:
      "Upper wall portions between sectors that both have parallax ceiling should be skipped. EDuke32 polymer_drawwall() line 3654 checks bothParallaxCeil before rendering. Added the same check.",
    commit: "f1ecf56",
  },
  {
    title: "Mirrored Poster Text",
    problem:
      "\"Sister Act III\" poster read backwards. Wall sprite textures were horizontally flipped.",
    solution:
      "With the corrected positive-sign angle formula, TL vertex lands at screen-left from the front face, so normal UV mapping (u=0 at TL) is correct. The old negative formula placed TL at screen-right.",
    commit: "f1ecf56",
  },
  {
    title: "Sprites Half-Sunk in Floor",
    problem:
      "Face-camera sprites were centered on their Z position, half-buried in the ground.",
    solution:
      "Build sprites grow upward from Z (Polymer's vertsprite: y=0→1). PlaneGeometry defaults to centered. Shift up by h/2 unless YCENTER (cstat bit 7) is set.",
    commit: "ae38518",
  },
  {
    title: "Upside-Down Sprites",
    problem:
      "All sprite textures flipped vertically after switching to batched rendering.",
    solution:
      "A leftover V-flip in the sprite shader (from an earlier workaround) double-flipped with explicit UVs. Removed it.",
    commit: "f830e26",
  },
  {
    title: "Wall Texture Over-Tiling",
    problem:
      "Long walls had textures repeating far too many times — massive over-tiling.",
    solution:
      "UV formula multiplied by wall length. EDuke32 Polymer uses dist=0 or dist=1 (not wall length), making uRepeat = xrepeat × 8 / tileWidth, independent of wall size.",
    commit: "acde41f",
  },
  {
    title: "Polymer vs Classic Engine",
    problem:
      "Using Polymer as the sole EDuke32 reference caused mirrored wall sprites. Polymer doesn't reverse the tile column mapping for front-face views like the classic engine does.",
    solution:
      "Use the classic software renderer (engine.cpp, engine_priv.h) as ground truth for sprite geometry. Polymer is still useful for UV/sector formulas but has known sprite mirroring issues.",
    commit: "f1ecf56",
  },
  {
    title: "370 Draw Calls (Performance)",
    problem:
      "Each sprite was a separate React component with useFrame, causing ~370 draw calls and heavy GC from per-frame geometry allocation.",
    solution:
      "Batched all sprites into one BufferGeometry. Face sprites update positions via direct attribute mutation. Draw calls: 370 → 1.",
    commit: "188e47a",
  },
];
