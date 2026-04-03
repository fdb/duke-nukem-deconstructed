import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/rendering")({
  component: RenderingPage,
});

const SYSTEMS: { title: string; description: string; details: string[] }[] = [
  {
    title: "Coordinate Mapping",
    description:
      "Build engine uses a left-handed coordinate system with Z pointing down. Three.js uses a right-handed Y-up system. The mapping is: Build X \u2192 Three X, Build Y \u2192 Three Z, Build Z \u2192 -Three Y.",
    details: [
      "XY coordinates are scaled by 1/512 (Build units are ~19x larger than Three.js units)",
      "Z coordinates are scaled by 1/8192 and negated (Build Z increases downward)",
      "This means a wall at Build (10240, 20480) maps to Three.js (20.0, 0, 40.0)",
    ],
  },
  {
    title: "Angle Conversion",
    description:
      "Build angles use 2048 units per full rotation (not 360\u00b0 or 2\u03c0). The conversion differs for camera rotation vs. sprite direction vectors.",
    details: [
      "Camera rotation.y = -(buildAngle \u00d7 2\u03c0 / 2048) - \u03c0/2  [negative sign, clockwise Three.js convention]",
      "Sprite direction = +(buildAngle \u00d7 2\u03c0 / 2048) - \u03c0/2  [positive sign, standard trig]",
      "The -\u03c0/2 offset accounts for the 90\u00b0 coordinate system rotation (Build X=East, Three.js -Z=North)",
      "Getting the sign wrong causes sprites to be rotated 45\u00b0 for diagonal angles \u2014 this was our hardest bug to track down",
    ],
  },
  {
    title: "Texture Atlas",
    description:
      "All game textures are packed into a single 2048\u00d72048 atlas using shelf-packing. Each triangle knows its sub-rect via a per-vertex vec4 attribute.",
    details: [
      "ART tiles are stored column-major (column 0 first, then column 1, etc.) and transposed to row-major during loading",
      "Color index 255 = transparent (alpha = 0)",
      "The palette maps 6-bit RGB values (0-63) to 8-bit by multiplying by 4",
      "The shader tiles within sub-rects using fract(uv) to allow texture repeating",
    ],
  },
  {
    title: "Wall Rendering",
    description:
      "Walls are quads between sector vertices. Portal walls (connecting two sectors) only render the height difference between sectors. Masked walls render the opening with a transparent texture.",
    details: [
      "Solid walls: full height from ceiling to floor",
      "Portal walls: upper portion (our ceiling to adj ceiling) and lower portion (adj floor to our floor)",
      "Both-parallax skip: when both sectors have parallax ceiling, the upper wall is omitted entirely",
      "Masked walls (cstat bit 4/5): render the portal opening with overPicnum and alpha testing",
      "UV formula from EDuke32 polymer.cpp: uRepeat = xrepeat \u00d7 8 / tileWidth, vRepeat = heightZ \u00d7 yrepeat / (tileHeight \u00d7 2048)",
    ],
  },
  {
    title: "Floor & Ceiling Rendering",
    description:
      "Sectors are triangulated with fan triangulation from vertex 0. UV coordinates use world-space tiling with stat-bit transformations.",
    details: [
      "Base UV: u = x / (tileWidth \u00d7 scaleCoef), v = -y / (tileHeight \u00d7 scaleCoef)  [note Y negation!]",
      "Stat bit 2 (4): swap X/Y axes for 90\u00b0 rotation",
      "Stat bit 3 (8): double expand (scaleCoef = 8 instead of 16)",
      "Stat bit 4 (16): flip X, Stat bit 5 (32): flip Y",
      "Stat bit 6 (64): relative alignment to first wall angle",
      "Panning: xPanning/yPanning add UV offset (panning / 256)",
      "Parallax sectors (stat bit 0) skip flat geometry entirely \u2014 the sky replaces them",
    ],
  },
  {
    title: "Slope Calculation",
    description:
      "Sectors can have sloped floors/ceilings controlled by the heinum field. The slope Z offset is computed per-vertex based on perpendicular distance from the first wall.",
    details: [
      "Formula: z_offset = heinum \u00d7 perpDist / 256  (from EDuke32 getzsofslopeptr)",
      "The divisor is 256, NOT 4096 \u2014 using 4096 makes slopes 16x too shallow",
      "perpDist is computed as the signed distance from the point to the first wall's line",
      "The first wall of a sector defines the slope's reference plane",
    ],
  },
  {
    title: "Sprite System",
    description:
      "Sprites come in three alignment types: face-camera (billboards), wall-aligned, and floor-aligned. Each has different positioning and sizing rules.",
    details: [
      "Face sprites: xRatio = xRepeat \u00d7 0.20, yRatio = yRepeat \u00d7 0.25",
      "Wall/floor sprites: xRatio = xRepeat \u00d7 0.25, yRatio = yRepeat \u00d7 0.25",
      "Final size: w = tileWidth \u00d7 ratio / 512, h = tileHeight \u00d7 ratio / 512",
      "All sprites are batched into a single BufferGeometry for performance (~1 draw call)",
      "Face sprites update vertex positions each frame using the camera's right vector",
      "picnum < 11 = engine markers (sector effectors, activators) \u2014 filtered out",
      "cstat & 0x8000 = invisible sprites \u2014 also filtered",
    ],
  },
  {
    title: "Sprite Flip Logic",
    description:
      "The Build engine has a specific flip formula that differs between sprite types. Getting this wrong causes textures to mirror on some sprites but not others.",
    details: [
      "flipu = xflip XOR flooraligned (floor sprites INVERT the xflip bit!)",
      "flipv = yflip AND NOT flooraligned (floor sprites never flip V from yflip)",
      "If flipu: negate xOffset before applying",
      "If yflip and NOT face sprite: negate yOffset",
      "yCentered (cstat bit 7): face sprites subtract h/2 from yOffset, wall sprites use separate centeryoff",
    ],
  },
  {
    title: "Parallax Sky",
    description:
      "The sky is an 8-panel cylinder centered on the camera. It uses sequential tiles (basePicnum + 0..7) arranged in a full circle.",
    details: [
      "Cylinder follows camera position each frame (sky is always at infinity)",
      "Triangles wound CCW from inside = FrontSide rendering",
      "depthWrite: false, depthTest: false (matches EDuke32: sky drawn first with depth test disabled)",
      "renderOrder: -1 ensures sky renders before scene geometry",
    ],
  },
  {
    title: "Per-Surface Shading",
    description:
      "Every wall, floor, ceiling, and sprite has a shade value. Shade 0 is brightest, positive values are darker, negative values are overbright.",
    details: [
      "Shade is stored as a per-vertex float attribute",
      "Fragment shader: brightness = clamp(1.0 - shade/30.0, 0.05, 1.5)",
      "The original engine uses a 32-row shade table for indexed color lookup, but linear approximation works well for RGB rendering",
      "The shade range in practice is roughly -8 to +31",
    ],
  },
  {
    title: "Tile Animation",
    description:
      "Some tiles cycle through animation frames (water, screens, fire effects). The picanm data in ART files controls timing and direction.",
    details: [
      "animType 1 (oscillate): ping-pong between frame 0 and animFrames",
      "animType 2 (forward): loop 0 \u2192 animFrames \u2192 0",
      "animType 3 (backward): loop 0 \u2192 -animFrames \u2192 0 (negative offset from base tile)",
      "Speed: totalClock >> animSpeed (higher speed value = slower animation)",
      "Build engine runs at 120 ticks/second",
      "All animation frame tiles are pre-loaded into the texture atlas",
      "Per-frame: atlasRect attributes are updated for surfaces with animated tiles",
    ],
  },
];

const PITFALLS: { title: string; problem: string; solution: string; commit: string }[] = [
  {
    title: "Sprite Direction Vector Sign",
    problem:
      "Wall sprites (fences, ventilator, police line) appeared rotated ~45\u00b0 from their correct orientation. The angle formula used a negative sign, matching the camera rotation convention, but sprite direction vectors need a positive sign.",
    solution:
      "Changed from -(buildAngle \u00d7 2\u03c0/2048) - \u03c0/2 to +(buildAngle \u00d7 2\u03c0/2048) - \u03c0/2 for sprites. The classic engine's get_wallspr_dims() uses sin(\u03b8) and -cos(\u03b8) directly, which corresponds to the positive-sign formula. Camera rotation is clockwise in Three.js so needs the negative sign, but cos/sin for direction vectors follow standard math convention.",
    commit: "f1ecf56",
  },
  {
    title: "picanm Signed Offset Parsing",
    problem:
      "Gas bottles and many other sprites appeared wildly misplaced \u2014 shifted by hundreds of pixels. The ART file's picanm xOffset/yOffset fields are signed int8 (-128 to 127), but were parsed as unsigned (0-255). A tile centering offset of -20 was read as 236.",
    solution:
      "Sign-extend the byte using JavaScript's bitwise trick: ((value & 0xff) << 24 >> 24). This puts the byte's sign bit into the 32-bit sign position, then arithmetic right-shift propagates it back down.",
    commit: "f1ecf56",
  },
  {
    title: "Slope Divisor (4096 vs 256)",
    problem:
      "Sloped roofs and ramps appeared nearly flat \u2014 16x too shallow. The slope formula divisor was 4096 instead of the correct 256.",
    solution:
      "Traced through EDuke32's getzsofslopeptr() in engine.cpp. The intermediate calculations use dmulscale3 (divide by 8) and nsqrtasm with <<5 (multiply by 32), giving a net divisor of 8\u00d732 = 256, not 4096.",
    commit: "383c668",
  },
  {
    title: "Floor Texture Orientation",
    problem:
      "The wood floor planks ran in the wrong direction. Floor textures looked rotated compared to EDuke32.",
    solution:
      "EDuke32 uses tey = -wal->y (negated Y!) for floor/ceiling UV computation. Our code used the raw Y without negation. Also needed to implement all stat bits: swap XY (bit 2), double expand (bit 3), flip X/Y (bits 4-5), and relative-to-first-wall alignment (bit 6).",
    commit: "f1ecf56",
  },
  {
    title: "Invisible Sky",
    problem:
      "The parallax sky (night cityscape) was completely invisible \u2014 just black where it should be.",
    solution:
      "Two issues: (1) Sky cylinder triangles were wound clockwise from inside, making them back-faces. Changed to CCW winding and FrontSide rendering. (2) Added depthTest:false to match EDuke32's approach of drawing sky with depth testing disabled.",
    commit: "f1ecf56",
  },
  {
    title: "Phantom Gray Walls",
    problem:
      "Large gray walls appeared around the rooftop perimeter where EDuke32 showed open sky with buildings.",
    solution:
      "These were upper wall portions between sectors that both have parallax ceiling. EDuke32's polymer_drawwall() (line 3654) skips upper walls when both sectors are parallaxed. Added the same bothParallaxCeil/bothParallaxFloor checks.",
    commit: "f1ecf56",
  },
  {
    title: "Mirrored Wall Sprite Textures",
    problem:
      "Movie posters had reversed text (\u201cSister Act III\u201d read backwards). Wall sprite textures were horizontally flipped.",
    solution:
      "With the corrected positive-sign angle formula, the TL vertex naturally lands at screen-left when viewed from the sprite's front face, so normal UV mapping (u=0 at TL) produces correct non-mirrored text. The old negative-sign formula placed TL at screen-right, requiring reversed UVs.",
    commit: "f1ecf56",
  },
  {
    title: "Sprites Half-Sunk in Floor",
    problem:
      "All face-camera sprites were vertically centered on their Z position, making them appear half-buried in the floor.",
    solution:
      "Build engine sprites grow upward from their Z position (Polymer's vertsprite base quad goes y=0\u21921). PlaneGeometry defaults to centered. Shifted geometry up by half-height unless YCENTER flag (cstat & 128) is set.",
    commit: "ae38518",
  },
  {
    title: "Upside-Down Sprites",
    problem:
      "All sprite textures were vertically flipped after switching to batched rendering.",
    solution:
      "The V-flip in the sprite shader was from an earlier workaround. After batching with explicit UVs, the extra flip inverted everything. Removed the shader V-flip.",
    commit: "f830e26",
  },
  {
    title: "Wall Texture Over-Tiling",
    problem:
      "Long walls had massively over-tiled textures (repeating far too many times).",
    solution:
      "The UV formula incorrectly multiplied by wall length. EDuke32's Polymer renderer uses dist=0 or dist=1 (not wall length!), making uRepeat = xrepeat \u00d7 8 / tileWidth, independent of physical wall length.",
    commit: "acde41f",
  },
  {
    title: "Polymer vs Classic Engine Discrepancies",
    problem:
      "Using Polymer (EDuke32's OpenGL renderer) as the sole reference led to mirrored wall sprites. Polymer has a known bug: it doesn't reverse the lwall[] column mapping for front-face views like the classic engine does.",
    solution:
      "Switched to using the classic software engine (engine.cpp, engine_priv.h) as ground truth for sprite geometry. Polymer is still useful for UV formulas and sector rendering, but sprite orientation should always be verified against the classic engine's get_wallspr_points().",
    commit: "f1ecf56",
  },
  {
    title: "370 Draw Calls Per Frame",
    problem:
      "Each sprite was a separate React component with its own mesh and useFrame hook, causing ~370 draw calls and heavy GC pressure from per-frame geometry allocation.",
    solution:
      "Batched all sprites into a single BufferGeometry. Face-camera sprites update positions via direct attribute mutation each frame. Reduced draw calls from ~370 to 1 and eliminated React re-render overhead.",
    commit: "188e47a",
  },
];

function RenderingPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-orange-500 mb-2">Rendering</h1>
      <p className="text-zinc-400 mb-8">
        How the Build engine&apos;s 2.5D world is reconstructed in Three.js/WebGL.
        The renderer reads binary MAP and ART data and produces textured geometry
        with per-surface shading, animated tiles, and billboarded sprites.
      </p>

      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-6">Systems</h2>
        <div className="space-y-6">
          {SYSTEMS.map((sys) => (
            <div key={sys.title} className="border border-zinc-800 p-5">
              <h3 className="text-lg font-semibold text-orange-400 mb-1">{sys.title}</h3>
              <p className="text-zinc-400 text-sm mb-3">{sys.description}</p>
              <ul className="space-y-1">
                {sys.details.map((d, i) => (
                  <li key={i} className="text-zinc-500 text-sm pl-4 relative before:content-['\u2022'] before:absolute before:left-0 before:text-zinc-600">
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold text-zinc-100 mb-2">Pitfalls & War Stories</h2>
        <p className="text-zinc-500 text-sm mb-6">
          Lessons learned from getting the renderer to match EDuke32. Each issue
          took significant debugging \u2014 documented here so we never make the same
          mistakes again.
        </p>
        <div className="space-y-5">
          {PITFALLS.map((p) => (
            <div key={p.title} className="border border-zinc-800 p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="text-base font-semibold text-red-400">{p.title}</h3>
                <code className="text-xs text-zinc-600 bg-zinc-800/50 px-2 py-0.5 shrink-0">{p.commit}</code>
              </div>
              <div className="mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Problem</span>
                <p className="text-zinc-400 text-sm mt-0.5">{p.problem}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Fix</span>
                <p className="text-zinc-300 text-sm mt-0.5">{p.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
