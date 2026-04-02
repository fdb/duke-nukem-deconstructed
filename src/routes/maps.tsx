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
          onChange={(e) => { setLevelIdx(Number(e.target.value)); setSelectedSector(null); }}
          className="bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm px-3 py-1"
        >
          {LEVELS.map((l, i) => (
            <option key={l.file} value={i}>{l.file} — {l.name}</option>
          ))}
        </select>
        <span className="text-zinc-500 text-sm">
          {map.sectors.length} sectors · {map.walls.length} walls · {map.sprites.length} sprites
        </span>
        {/* Link to viewer will be active once Task 17 adds the route */}
        <Link
          to={"/viewer/$map" as "/maps"}
          params={{ map: level.file.replace(".MAP", "") } as Record<string, never>}
          className="ml-auto text-sm bg-orange-500 text-zinc-950 px-4 py-1 font-semibold no-underline hover:bg-orange-400"
        >
          Open in 3D →
        </Link>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 border border-zinc-800 bg-zinc-950">
          <Map2D map={map} width={800} height={600} onSectorClick={setSelectedSector} />
        </div>

        <div className="w-64 flex-shrink-0">
          {sector && selectedSector !== null ? (
            <div className="border border-zinc-800 bg-zinc-950 p-4">
              <h3 className="text-zinc-100 font-semibold mb-3">Sector #{selectedSector}</h3>
              <dl className="text-sm grid grid-cols-2 gap-y-1.5">
                <dt className="text-zinc-500">Ceiling Z</dt>
                <dd className="text-zinc-100 mono">{sector.ceilingZ}</dd>
                <dt className="text-zinc-500">Floor Z</dt>
                <dd className="text-zinc-100 mono">{sector.floorZ}</dd>
                <dt className="text-zinc-500">Ceiling tex</dt>
                <dd><Link to="/tiles" className="mono text-sm">#{sector.ceilingPicnum}</Link></dd>
                <dt className="text-zinc-500">Floor tex</dt>
                <dd><Link to="/tiles" className="mono text-sm">#{sector.floorPicnum}</Link></dd>
                <dt className="text-zinc-500">Ceiling slope</dt>
                <dd className="text-zinc-100 mono">{sector.ceilingHeinum}</dd>
                <dt className="text-zinc-500">Floor slope</dt>
                <dd className="text-zinc-100 mono">{sector.floorHeinum}</dd>
                <dt className="text-zinc-500">Walls</dt>
                <dd className="text-zinc-100 mono">{sector.wallNum}</dd>
                <dt className="text-zinc-500">Visibility</dt>
                <dd className="text-zinc-100 mono">{sector.visibility}</dd>
                <dt className="text-zinc-500">Lo/Hi tag</dt>
                <dd className="text-zinc-100 mono">{sector.loTag}/{sector.hiTag}</dd>
              </dl>
            </div>
          ) : (
            <div className="text-zinc-600 text-sm">Click a sector on the map to inspect it.</div>
          )}
        </div>
      </div>
    </div>
  );
}
