interface HudProps {
  position: { x: number; y: number; z: number } | null;
  wireframe: boolean;
  onToggleWireframe: () => void;
  mapName: string;
}

export function Hud({ position, wireframe, onToggleWireframe, mapName }: HudProps) {
  return (
    <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none flex justify-between items-start">
      <div className="bg-zinc-950/80 border border-zinc-800 px-3 py-2 mono text-xs text-zinc-400">
        <div className="text-orange-500 font-semibold mb-1">{mapName}</div>
        {position && (
          <div>{position.x.toFixed(1)}, {position.y.toFixed(1)}, {position.z.toFixed(1)}</div>
        )}
      </div>
      <div className="flex gap-2 pointer-events-auto">
        <button
          onClick={onToggleWireframe}
          className={`px-3 py-1 text-xs font-semibold border ${
            wireframe
              ? "bg-orange-500 text-zinc-950 border-orange-500"
              : "bg-zinc-950/80 text-zinc-400 border-zinc-700 hover:text-zinc-100"
          }`}
        >
          {wireframe ? "Wireframe" : "Textured"}
        </button>
      </div>
    </div>
  );
}
