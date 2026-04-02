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
  const { getMap, renderTile, getTile } = useGrp();

  const level = LEVELS.find((l) => l.id === mapParam) ?? LEVELS[0];
  const map = getMap(level.file);

  const [wireframe, setWireframe] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number; z: number } | null>(null);

  const handlePos = useCallback((pos: THREE.Vector3) => {
    setPosition({ x: pos.x, y: pos.y, z: pos.z });
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-49px)]">
      <ViewerScene map={map} wireframe={wireframe} renderTile={renderTile} getTile={getTile} onPositionChange={handlePos} />
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
