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
      <h1 className="text-3xl font-bold text-orange-500 mb-2">Palette & Shade Tables</h1>
      <p className="text-zinc-400 mb-8">
        Duke3D uses a 256-color indexed palette. Every pixel in the game is a
        single byte — an index into this palette. Shade tables darken colors for
        distance-based lighting.
      </p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">256-Color Palette</h2>
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
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">Shade Table — Color #{selectedColor}</h2>
          <p className="text-zinc-400 text-sm mb-4">
            {palette.numShades} shade levels. Level 0 is full brightness, level{" "}
            {palette.numShades - 1} is darkest.
          </p>
          <div className="flex gap-px">
            {Array.from({ length: palette.numShades }, (_, shade) => {
              const remapped = palette.shadeTable[shade * 256 + selectedColor];
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
              <option key={i} value={i}>Table {i}</option>
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
