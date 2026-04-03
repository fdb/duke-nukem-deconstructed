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
  { to: "/rendering", label: "Rendering" },
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
