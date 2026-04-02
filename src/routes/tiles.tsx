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
        Pixels stored column-major, 1 byte per pixel (palette index). Index 255 = transparent.
      </p>

      <div className="flex gap-4 mb-6 items-center">
        <select
          value={artFilter ?? "all"}
          onChange={(e) => setArtFilter(e.target.value === "all" ? null : Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-1"
        >
          <option value="all">All ART files</option>
          {artFiles.map((art, i) => (
            <option key={i} value={i}>
              TILES{String(i).padStart(3, "0")}.ART ({art.tiles.filter((t) => t.width > 0).length} tiles)
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
            <h3 className="text-zinc-100 font-semibold mb-3">Tile #{selected}</h3>
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
              <dd className="text-zinc-100 mono">{selectedTile.width}×{selectedTile.height}</dd>
              <dt className="text-zinc-500">Anim frames</dt>
              <dd className="text-zinc-100 mono">{selectedTile.animFrames}</dd>
              <dt className="text-zinc-500">Anim type</dt>
              <dd className="text-zinc-100 mono">{selectedTile.animType}</dd>
              <dt className="text-zinc-500">Offset</dt>
              <dd className="text-zinc-100 mono">{selectedTile.xOffset}, {selectedTile.yOffset}</dd>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
