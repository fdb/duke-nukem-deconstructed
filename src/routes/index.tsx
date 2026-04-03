import { createFileRoute, Link } from "@tanstack/react-router";

const SECTIONS = [
  { to: "/archive", title: "The Archive", desc: "SHR self-extracting ZIP — how shareware was distributed in 1996" },
  { to: "/grp", title: "GRP Container", desc: 'Ken Silverman\'s group file format — "KenSilverman" magic and 215 packed files' },
  { to: "/palette", title: "Palette & Shading", desc: "256-color palette, 32 shade levels, lookup remapping tables" },
  { to: "/tiles", title: "ART Tiles", desc: "Textures, sprites, and UI art — column-major indexed pixels" },
  { to: "/maps", title: "MAP Format", desc: "Sectors, walls, and sprites — the 2.5D geometry of Build engine levels" },
  { to: "/scripts", title: "CON Scripts", desc: "The game scripting language — actors, AI, weapons, and game logic" },
  { to: "/audio", title: "Audio", desc: "Creative Voice files and MIDI music — Duke's one-liners and GRABBAG" },
  { to: "/rendering", title: "Rendering", desc: "How the 2.5D world is reconstructed in WebGL — systems, formulas, and war stories" },
] as const;

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16">
      <h1 className="text-5xl font-bold text-orange-500 mb-4">Duke Nukem 3D</h1>
      <p className="text-xl text-zinc-400 mb-2">Reverse Engineering the Shareware Version</p>
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
            <h2 className="text-zinc-100 font-semibold text-lg mb-2">{s.title}</h2>
            <p className="text-zinc-500 text-sm">{s.desc}</p>
          </Link>
        ))}
        <Link
          to="/viewer/$map"
          params={{ map: "E1L1" }}
          className="bg-zinc-900 p-6 no-underline hover:bg-zinc-800/80 transition-colors"
        >
          <h2 className="text-zinc-100 font-semibold text-lg mb-2">3D Viewer</h2>
          <p className="text-zinc-500 text-sm">Walk through Hollywood Holocaust in textured or wireframe 3D</p>
        </Link>
      </div>
    </div>
  );
}
