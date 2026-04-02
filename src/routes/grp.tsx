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
      <h1 className="text-3xl font-bold text-orange-500 mb-2">GRP Container</h1>
      <p className="text-zinc-400 mb-8">
        Ken Silverman's group file format — a flat archive with a 12-byte magic
        signature, file count, and sequential directory entries.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Header Structure</h2>
        <div className="bg-zinc-950 border border-zinc-800 p-4 overflow-x-auto">
          <HexView
            data={headerBytes}
            highlights={[
              [0, 12, "#f97316"],
              [12, 16, "#22c55e"],
              [16, 32, "#3b82f6"],
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
          <h2 className="text-xl font-semibold text-zinc-100">Files ({archive.files.length})</h2>
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
                      <Link to={route} className="text-orange-500 hover:text-orange-400">{f.name}</Link>
                    ) : (
                      <span className="text-zinc-100">{f.name}</span>
                    )}
                  </td>
                  <td className="py-1.5 mono text-zinc-400 text-right">{f.size.toLocaleString()}</td>
                  <td className="py-1.5 mono text-zinc-600 text-right">0x{f.offset.toString(16)}</td>
                  <td className="py-1.5 text-zinc-500 pl-4">{fileTypeLabel(f.name)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
