import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/rendering")({
  component: RenderingPage,
});

function Formula({ children }: { children: string }) {
  return <code className="bg-zinc-800 text-orange-300 px-1.5 py-0.5 text-sm font-mono">{children}</code>;
}

function Tag({ color, children }: { color: "blue" | "green" | "red"; children: string }) {
  const colors = {
    blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    green: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    red: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return <span className={`text-xs font-mono px-2 py-0.5 border ${colors[color]}`}>{children}</span>;
}

/** Interactive coordinate mapping diagram */
function CoordDiagram() {
  const [hover, setHover] = useState<"x" | "y" | "z" | null>(null);
  const axes = [
    { id: "x" as const, build: "X (East)", three: "X", color: "#ef4444", bx: 70, by: 0, tx: 70, ty: 0 },
    { id: "y" as const, build: "Y (South)", three: "Z", color: "#22c55e", bx: 0, by: 70, tx: 0, ty: 70 },
    { id: "z" as const, build: "Z (Down)", three: "-Y", color: "#3b82f6", bx: -40, by: -40, tx: 40, ty: -40 },
  ];
  return (
    <div className="grid grid-cols-2 gap-6 my-4">
      {[{ label: "Build Engine", side: "b" as const }, { label: "Three.js", side: "t" as const }].map(({ label, side }) => (
        <div key={label} className="bg-zinc-900 border border-zinc-800 p-4 flex flex-col items-center">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">{label}</div>
          <svg width="180" height="180" viewBox="-90 -90 180 180" className="overflow-visible">
            {axes.map((a) => {
              const x2 = side === "b" ? a.bx : a.tx;
              const y2 = side === "b" ? a.by : a.ty;
              const active = hover === a.id;
              return (
                <g key={a.id}
                  onMouseEnter={() => setHover(a.id)}
                  onMouseLeave={() => setHover(null)}
                  className="cursor-pointer"
                >
                  <line x1={0} y1={0} x2={x2} y2={y2} stroke={a.color} strokeWidth={active ? 3 : 2} strokeOpacity={active ? 1 : 0.6} />
                  <polygon
                    points={arrowHead(x2, y2)}
                    fill={a.color}
                    fillOpacity={active ? 1 : 0.6}
                  />
                  <text x={x2 * 1.25} y={y2 * 1.25} fill={a.color} fontSize="12" fontFamily="monospace" textAnchor="middle" dominantBaseline="middle" fillOpacity={active ? 1 : 0.7}>
                    {side === "b" ? a.build : `${a.three} = Build.${a.build[0]}`}
                  </text>
                </g>
              );
            })}
            <circle cx={0} cy={0} r={3} fill="#a1a1aa" />
          </svg>
          <div className="text-zinc-600 text-[10px] mt-2">{side === "b" ? "Y down, Z down" : "Y up, Z = Build.Y"}</div>
        </div>
      ))}
    </div>
  );
}

function arrowHead(x: number, y: number): string {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return "0,0";
  const dx = x / len, dy = y / len;
  const px = -dy * 4, py = dx * 4;
  const tip = `${x},${y}`;
  const l = `${x - dx * 10 + px},${y - dy * 10 + py}`;
  const r = `${x - dx * 10 - px},${y - dy * 10 - py}`;
  return `${tip} ${l} ${r}`;
}

/** Interactive angle diagram */
function AngleDiagram() {
  const [angle, setAngle] = useState(0);
  const buildAngle = Math.round(angle * 2048 / 360);
  const cameraRad = -(buildAngle * Math.PI * 2 / 2048) - Math.PI / 2;
  const spriteRad = (buildAngle * Math.PI * 2 / 2048) - Math.PI / 2;
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 my-4">
      <div className="flex items-center gap-3 mb-4">
        <label className="text-zinc-500 text-sm">Build angle:</label>
        <input type="range" min={0} max={2047} value={buildAngle} onChange={(e) => setAngle(+e.target.value * 360 / 2048)}
          className="flex-1 accent-orange-500" />
        <span className="text-orange-400 font-mono text-sm w-16 text-right">{buildAngle}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Camera", rad: cameraRad, color: "#3b82f6", tag: "blue" as const, formula: `-(${buildAngle} * 2π/2048) - π/2` },
          { label: "Sprite dir", rad: spriteRad, color: "#22c55e", tag: "green" as const, formula: `+(${buildAngle} * 2π/2048) - π/2` },
        ].map(({ label, rad, color, tag, formula }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-2">
              <Tag color={tag}>{label}</Tag>
            </div>
            <svg width="120" height="120" viewBox="-60 -60 120 120">
              <circle cx={0} cy={0} r={45} fill="none" stroke="#27272a" strokeWidth={1} />
              <line x1={0} y1={0} x2={Math.cos(rad) * 45} y2={Math.sin(rad) * 45} stroke={color} strokeWidth={2} />
              <circle cx={Math.cos(rad) * 45} cy={Math.sin(rad) * 45} r={4} fill={color} />
              <text x={0} y={0} fill="#a1a1aa" fontSize="8" fontFamily="monospace" textAnchor="middle" dominantBaseline="middle">N</text>
              <text x={50} y={3} fill="#71717a" fontSize="8" fontFamily="monospace">E</text>
              <text x={-50} y={3} fill="#71717a" fontSize="8" fontFamily="monospace" textAnchor="end">W</text>
              <text x={0} y={55} fill="#71717a" fontSize="8" fontFamily="monospace" textAnchor="middle">S</text>
              <text x={0} y={-52} fill="#71717a" fontSize="8" fontFamily="monospace" textAnchor="middle">N</text>
            </svg>
            <div className="text-zinc-600 font-mono text-[10px] mt-1">{formula}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Atlas visual with colored rects */
function AtlasDiagram() {
  const tiles = [
    { x: 0, y: 0, w: 64, h: 64, c: "#ef4444" },
    { x: 68, y: 0, w: 128, h: 64, c: "#f97316" },
    { x: 200, y: 0, w: 40, h: 40, c: "#eab308" },
    { x: 244, y: 0, w: 100, h: 80, c: "#22c55e" },
    { x: 0, y: 68, w: 80, h: 80, c: "#3b82f6" },
    { x: 84, y: 68, w: 64, h: 64, c: "#8b5cf6" },
    { x: 152, y: 68, w: 96, h: 64, c: "#ec4899" },
    { x: 252, y: 84, w: 48, h: 48, c: "#06b6d4" },
  ];
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 my-4 flex justify-center">
      <svg width="380" height="200" viewBox="-10 -10 380 200">
        <rect x={0} y={0} width={360} height={180} fill="none" stroke="#3f3f46" strokeWidth={1} strokeDasharray="4 2" rx={2} />
        <text x={180} y={-2} fill="#52525b" fontSize="10" fontFamily="monospace" textAnchor="middle">2048 px atlas</text>
        {tiles.map((t, i) => (
          <g key={i}>
            <rect x={t.x + 4} y={t.y + 4} width={t.w - 4} height={t.h - 4} fill={t.c} fillOpacity={0.15} stroke={t.c} strokeOpacity={0.5} strokeWidth={1} rx={1} />
            <text x={t.x + t.w / 2 + 2} y={t.y + t.h / 2 + 2} fill={t.c} fontSize="9" fontFamily="monospace" textAnchor="middle" dominantBaseline="middle" fillOpacity={0.8}>
              {t.w - 4}x{t.h - 4}
            </text>
          </g>
        ))}
        <text x={320} y={140} fill="#52525b" fontSize="18" fontFamily="monospace" textAnchor="middle">...</text>
      </svg>
    </div>
  );
}

/** Wall types diagram with SVG */
function WallDiagram() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 my-4 flex justify-center">
      <svg width="520" height="160" viewBox="0 0 520 160" className="overflow-visible">
        {/* Solid wall */}
        <rect x={10} y={10} width={130} height={120} fill="#78716c" fillOpacity={0.3} stroke="#a8a29e" strokeWidth={1.5} />
        <text x={75} y={75} fill="#d6d3d1" fontSize="11" fontFamily="monospace" textAnchor="middle">picnum</text>
        <line x1={10} y1={10} x2={140} y2={10} stroke="#f97316" strokeWidth={1.5} />
        <line x1={10} y1={130} x2={140} y2={130} stroke="#f97316" strokeWidth={1.5} />
        <text x={75} y={7} fill="#f97316" fontSize="9" fontFamily="monospace" textAnchor="middle">ceiling</text>
        <text x={75} y={143} fill="#f97316" fontSize="9" fontFamily="monospace" textAnchor="middle">floor</text>
        <text x={75} y={155} fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Solid</text>

        {/* Portal wall */}
        <rect x={190} y={10} width={130} height={30} fill="#78716c" fillOpacity={0.3} stroke="#a8a29e" strokeWidth={1} />
        <rect x={190} y={100} width={130} height={30} fill="#78716c" fillOpacity={0.3} stroke="#a8a29e" strokeWidth={1} />
        <rect x={190} y={40} width={130} height={60} fill="none" stroke="#3f3f46" strokeWidth={1} strokeDasharray="4 2" />
        <text x={255} y={27} fill="#d6d3d1" fontSize="9" fontFamily="monospace" textAnchor="middle">upper</text>
        <text x={255} y={118} fill="#d6d3d1" fontSize="9" fontFamily="monospace" textAnchor="middle">lower</text>
        <text x={255} y={73} fill="#52525b" fontSize="9" fontFamily="monospace" textAnchor="middle">portal</text>
        <text x={255} y={155} fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Portal</text>

        {/* Masked wall */}
        <rect x={370} y={10} width={130} height={120} fill="none" stroke="#3f3f46" strokeWidth={1} strokeDasharray="4 2" />
        {[30, 50, 70, 90, 110].map((y) => (
          <g key={y}>
            {[385, 405, 425, 445, 465, 485].map((x) => (
              <line key={x} x1={x} y1={y - 8} x2={x + 10} y2={y + 2} stroke="#22c55e" strokeWidth={1} strokeOpacity={0.5} />
            ))}
          </g>
        ))}
        <text x={435} y={73} fill="#22c55e" fontSize="9" fontFamily="monospace" textAnchor="middle">overPicnum</text>
        <text x={435} y={85} fill="#22c55e" fontSize="8" fontFamily="monospace" textAnchor="middle" fillOpacity={0.6}>(alpha test)</text>
        <text x={435} y={155} fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Masked</text>
      </svg>
    </div>
  );
}

/** Animated shade gradient */
function ShadeGradient() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 my-4">
      <div className="flex gap-px mb-2">
        {Array.from({ length: 32 }, (_, i) => {
          const b = Math.max(0, Math.min(255, Math.round(255 * (1 - i / 30))));
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-10" style={{ backgroundColor: `rgb(${b},${b},${b})` }} />
              {i % 4 === 0 && <span className="text-[9px] text-zinc-600 font-mono">{i}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
        <span>shade 0 (bright)</span>
        <span>shade 15 (dim)</span>
        <span>shade 30 (dark)</span>
      </div>
    </div>
  );
}

/** Animation type visualizer */
function AnimVisualizer() {
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const id = setInterval(() => {
      frameRef.current++;
      setFrame(frameRef.current);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const numFrames = 5;
  const oscFrame = (() => { const k = frame % (numFrames * 2); return k < numFrames ? k : numFrames * 2 - k; })();
  const fwdFrame = frame % (numFrames + 1);
  const backFrame = -(frame % (numFrames + 1));

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 my-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Oscillate", frame: oscFrame, color: "#f97316" },
          { label: "Forward", frame: fwdFrame, color: "#3b82f6" },
          { label: "Backward", frame: backFrame, color: "#22c55e" },
        ].map(({ label, frame: f, color }) => (
          <div key={label} className="flex flex-col items-center">
            <div className="text-xs text-zinc-500 mb-2">{label}</div>
            <div className="flex gap-1 mb-2">
              {Array.from({ length: numFrames + 1 }, (_, i) => (
                <div key={i} className="w-7 h-7 border flex items-center justify-center text-[10px] font-mono transition-colors duration-100"
                  style={{
                    borderColor: (f < 0 ? -f : f) === i ? color : "#3f3f46",
                    backgroundColor: (f < 0 ? -f : f) === i ? color + "30" : "transparent",
                    color: (f < 0 ? -f : f) === i ? color : "#52525b",
                  }}
                >
                  {f < 0 ? -i : i}
                </div>
              ))}
            </div>
            <div className="text-zinc-600 font-mono text-[10px]">offset: {f}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Sprite types diagram */
function SpriteDiagram() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 my-4 flex justify-center">
      <svg width="480" height="130" viewBox="0 0 480 130">
        {/* Face sprite */}
        <g>
          <rect x={30} y={20} width={60} height={80} fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={1.5} rx={2} />
          <circle cx={60} cy={50} r={8} fill="none" stroke="#3b82f6" strokeWidth={1.5} />
          <path d="M 55 58 Q 60 64 65 58" fill="none" stroke="#3b82f6" strokeWidth={1} />
          <text x={60} y={75} fill="#3b82f6" fontSize="8" fontFamily="monospace" textAnchor="middle">face cam</text>
          {/* Rotation arrows */}
          <path d="M 95 50 A 10 10 0 0 1 95 30" fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="2 2" />
          <text x={105} y={38} fill="#52525b" fontSize="8" fontFamily="monospace">billboard</text>
          <text x={60} y={118} fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Face</text>
          <text x={60} y={8} fill="#52525b" fontSize="8" fontFamily="monospace" textAnchor="middle">xR * 0.20</text>
        </g>
        {/* Wall sprite */}
        <g>
          <rect x={190} y={20} width={60} height={80} fill="#22c55e" fillOpacity={0.15} stroke="#22c55e" strokeWidth={1.5} rx={2} />
          <line x1={210} y1={35} x2={210} y2={85} stroke="#22c55e" strokeWidth={1} strokeOpacity={0.5} />
          <line x1={230} y1={35} x2={230} y2={85} stroke="#22c55e" strokeWidth={1} strokeOpacity={0.5} />
          <text x={220} y={60} fill="#22c55e" fontSize="8" fontFamily="monospace" textAnchor="middle">rotated</text>
          <text x={220} y={72} fill="#22c55e" fontSize="8" fontFamily="monospace" textAnchor="middle">by ang</text>
          <text x={220} y={118} fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Wall</text>
          <text x={220} y={8} fill="#52525b" fontSize="8" fontFamily="monospace" textAnchor="middle">xR * 0.25</text>
        </g>
        {/* Floor sprite */}
        <g transform="translate(380, 60)">
          <path d="M -40,-15 L 40,-15 L 30,25 L -50,25 Z" fill="#f97316" fillOpacity={0.15} stroke="#f97316" strokeWidth={1.5} />
          <text x={-5} y={10} fill="#f97316" fontSize="8" fontFamily="monospace" textAnchor="middle">flat XZ</text>
          <text x={-5} y={58} fill="#a1a1aa" fontSize="10" fontFamily="monospace" textAnchor="middle">Floor</text>
          <text x={-5} y={-52} fill="#52525b" fontSize="8" fontFamily="monospace" textAnchor="middle">xR * 0.25</text>
        </g>
      </svg>
    </div>
  );
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

      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-3 flex items-center gap-3">
          <span className="text-orange-500">01</span> Coordinate Mapping
        </h2>
        <p className="text-zinc-400 text-sm mb-2">
          Build engine uses a left-handed coordinate system with Z pointing down. Three.js uses
          right-handed Y-up. Hover over axes to see the mapping.
        </p>
        <CoordDiagram />
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-3 text-center">
            <div className="text-red-400 font-mono font-bold">X</div>
            <div className="text-zinc-500">scale <Formula>{"/ 512"}</Formula></div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3 text-center">
            <div className="text-green-400 font-mono font-bold">Y &rarr; Z</div>
            <div className="text-zinc-500">scale <Formula>{"/ 512"}</Formula></div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3 text-center">
            <div className="text-blue-400 font-mono font-bold">Z &rarr; -Y</div>
            <div className="text-zinc-500">scale <Formula>{"/ 8192"}</Formula></div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-3 flex items-center gap-3">
          <span className="text-orange-500">02</span> Angle Conversion
        </h2>
        <p className="text-zinc-400 text-sm mb-2">
          Build uses 2048 units per rotation. Camera rotation and sprite direction vectors need
          <strong className="text-red-400"> different signs</strong>. Drag the slider to see how both respond.
        </p>
        <AngleDiagram />
        <p className="text-zinc-500 text-sm">
          The <Formula>{"-π/2"}</Formula> offset accounts for the 90° coordinate rotation
          (Build X=East, Three.js -Z=North). Getting the sign wrong caused sprites to appear 45° tilted.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-3 flex items-center gap-3">
          <span className="text-orange-500">03</span> Texture Atlas
        </h2>
        <p className="text-zinc-400 text-sm mb-2">
          All game textures are shelf-packed into a single 2048x2048 atlas. Each vertex carries
          a <Formula>{"vec4 atlasRect"}</Formula> telling the shader where to sample.
        </p>
        <AtlasDiagram />
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-orange-400 font-semibold text-sm mb-1">Shelf Packing</div>
            <p className="text-zinc-500 text-xs">Left-to-right, wrap to new row. One draw call per geometry type.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-orange-400 font-semibold text-sm mb-1">Column-Major ART</div>
            <p className="text-zinc-500 text-xs">Tiles stored column-first, transposed to row-major on load. Index 255 = transparent.</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-3">
            <div className="text-orange-400 font-semibold text-sm mb-1">Tiled Shader</div>
            <p className="text-zinc-500 text-xs"><Formula>{"fract(uv)"}</Formula> for seamless repeating within atlas sub-rects.</p>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-3 flex items-center gap-3">
          <span className="text-orange-500">04</span> Wall Rendering
        </h2>
        <p className="text-zinc-400 text-sm mb-2">
          Three wall types: solid (no portal), portal (height-difference only), and masked (transparent
          <Formula>{"overPicnum"}</Formula> with alpha test). Both-parallax portals skip upper/lower walls.
        </p>
        <WallDiagram />
        <div className="bg-zinc-900 border border-zinc-800 p-3 text-sm">
          <span className="text-zinc-500">UV: </span>
          <Formula>{"uRepeat = xrepeat * 8 / tileWidth"}</Formula>
          <span className="text-zinc-600 mx-2">|</span>
          <Formula>{"vRepeat = heightZ * yrepeat / (tileHeight * 2048)"}</Formula>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-3 flex items-center gap-3">
          <span className="text-orange-500">05</span> Floors & Ceilings
        </h2>
        <p className="text-zinc-400 text-sm mb-3">
          World-space tiled UVs with stat-bit transforms. The V coordinate uses <strong className="text-red-400">-Y</strong> (negated!).
        </p>
        <div className="grid grid-cols-3 gap-2 text-xs mb-3">
          {[
            { bit: "bit 0", val: "1", label: "Parallax (use sky)" },
            { bit: "bit 2", val: "4", label: "Swap X/Y (90° rot)" },
            { bit: "bit 3", val: "8", label: "Double expand" },
            { bit: "bit 4", val: "16", label: "Flip X" },
            { bit: "bit 5", val: "32", label: "Flip Y" },
            { bit: "bit 6", val: "64", label: "Align to 1st wall" },
          ].map(({ bit, val, label }) => (
            <div key={bit} className="bg-zinc-900 border border-zinc-800 px-3 py-2 flex items-center gap-2">
              <span className="text-orange-400 font-mono">{val}</span>
              <span className="text-zinc-400">{label}</span>
            </div>
          ))}
        </div>
        <p className="text-zinc-500 text-sm">
          Slopes use <Formula>{"z = heinum * perpDist / 256"}</Formula> — the divisor is 256, not 4096.
          Using 4096 makes roofs 16x too shallow.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-3 flex items-center gap-3">
          <span className="text-orange-500">06</span> Sprites
        </h2>
        <p className="text-zinc-400 text-sm mb-2">
          Three alignment types, all batched into a single BufferGeometry (~1 draw call for ~370 sprites).
        </p>
        <SpriteDiagram />
        <div className="bg-zinc-900 border border-zinc-800 p-3 text-sm">
          <span className="text-zinc-500">Flip: </span>
          <Formula>{"flipu = xflip XOR isFloor"}</Formula>
          <span className="text-zinc-600 mx-2">|</span>
          <Formula>{"flipv = yflip AND NOT isFloor"}</Formula>
          <span className="text-zinc-500 ml-2">(floor inverts xflip!)</span>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-3 flex items-center gap-3">
          <span className="text-orange-500">07</span> Shading
        </h2>
        <p className="text-zinc-400 text-sm mb-2">
          Per-surface shade values. 0 = brightest, positive = darker, negative = overbright.
        </p>
        <ShadeGradient />
        <div className="bg-zinc-900 border border-zinc-800 p-3 text-sm">
          <Formula>{"brightness = clamp(1.0 - shade / 30.0, 0.05, 1.5)"}</Formula>
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-xl font-bold text-zinc-100 mb-3 flex items-center gap-3">
          <span className="text-orange-500">08</span> Tile Animation
        </h2>
        <p className="text-zinc-400 text-sm mb-2">
          Tiles cycle through frames controlled by <Formula>{"picanm"}</Formula> data.
          Speed: <Formula>{"clock >> animSpeed"}</Formula> at 120 ticks/sec.
        </p>
        <AnimVisualizer />
      </section>

      <section>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Pitfalls & War Stories</h2>
        <p className="text-zinc-500 text-sm mb-6">
          Hard-won lessons from matching EDuke32. Click to expand.
        </p>
        <div className="space-y-2">
          {PITFALLS.map((p) => (
            <details key={p.title} className="group border border-zinc-800">
              <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/30 select-none">
                <svg className="w-3 h-3 text-red-400 transition-transform group-open:rotate-90 shrink-0" viewBox="0 0 12 12"><path d="M4 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
                <span className="text-zinc-200 text-sm font-medium flex-1">{p.title}</span>
                <code className="text-[10px] text-zinc-600 font-mono">{p.commit}</code>
              </summary>
              <div className="px-4 pb-4 pt-1 border-t border-zinc-800/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Tag color="red">Bug</Tag>
                  <p className="text-zinc-400 text-sm mt-2">{p.problem}</p>
                </div>
                <div>
                  <Tag color="green">Fix</Tag>
                  <p className="text-zinc-300 text-sm mt-2">{p.solution}</p>
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
    title: "The 45° Sprite Bug (direction vector sign)",
    problem: "Fences, ventilators, and police tape appeared rotated ~45° from correct. Only manifested at diagonal angles, making it seem like an offset issue.",
    solution: "Sprites need POSITIVE angle sign: +(ang * 2π/2048) - π/2. Camera uses NEGATIVE. Verified against classic engine's get_wallspr_dims().",
    commit: "f1ecf56",
  },
  {
    title: "picanm Signed Offset Parsing",
    problem: "Gas bottles displaced by hundreds of pixels. picanm offsets are signed int8 but were parsed unsigned. -20 was read as 236.",
    solution: "Sign-extend: ((val & 0xff) << 24 >> 24). JS bitwise ops use 32-bit signed ints.",
    commit: "f1ecf56",
  },
  {
    title: "Slope Divisor: 4096 vs 256",
    problem: "Thatched roofs appeared nearly flat — 16x too shallow.",
    solution: "EDuke32's getzsofslopeptr() uses dmulscale3 (÷8) + nsqrtasm<<5 (×32) = net ÷256.",
    commit: "383c668",
  },
  {
    title: "Floor Texture Orientation",
    problem: "Wood planks ran perpendicular to correct direction.",
    solution: "EDuke32 uses tey = -wal->y (negated Y!). Also implemented all 6 stat bits.",
    commit: "f1ecf56",
  },
  {
    title: "Invisible Sky",
    problem: "Parallax sky (LA cityscape) was completely invisible — just black.",
    solution: "Cylinder wound CW (backfaces from inside). Fixed to CCW + FrontSide + depthTest:false.",
    commit: "f1ecf56",
  },
  {
    title: "Phantom Gray Walls",
    problem: "Solid walls appeared where open sky should be at rooftop edges.",
    solution: "Skip upper walls when both sectors have parallax ceiling (EDuke32 line 3654).",
    commit: "f1ecf56",
  },
  {
    title: "Mirrored Movie Poster",
    problem: "\"Sister Act III\" text read backwards on wall sprites.",
    solution: "Corrected angle sign puts TL at screen-left, making normal UVs correct.",
    commit: "f1ecf56",
  },
  {
    title: "Sprites Sunk in Floor",
    problem: "Face sprites centered on Z position — half-buried.",
    solution: "Build sprites grow upward (y=0→1). Shift up by h/2 unless YCENTER.",
    commit: "ae38518",
  },
  {
    title: "Wall Texture Over-Tiling",
    problem: "Long walls had textures repeating hundreds of times.",
    solution: "UV used wall length. EDuke32 uses dist=0|1: uRepeat = xrepeat*8/tileWidth.",
    commit: "acde41f",
  },
  {
    title: "Polymer vs Classic Engine",
    problem: "Using Polymer as sole reference caused mirrored wall sprites.",
    solution: "Classic engine (engine_priv.h) is ground truth for sprites. Polymer has known mirroring bug.",
    commit: "f1ecf56",
  },
  {
    title: "370 Draw Calls (Performance)",
    problem: "Each sprite was a separate React mesh+useFrame. Heavy GC + re-renders.",
    solution: "Batched all sprites into 1 BufferGeometry. Draw calls: 370 → 1.",
    commit: "188e47a",
  },
];
