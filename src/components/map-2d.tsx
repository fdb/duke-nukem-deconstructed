import { useEffect, useRef, useCallback } from "react";
import type { BuildMap } from "../lib/types";

interface Map2DProps {
  map: BuildMap;
  width: number;
  height: number;
  onSectorClick?: (sectorIdx: number) => void;
}

export function Map2D({ map, width, height, onSectorClick }: Map2DProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bounds = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0, scale: 1, offX: 0, offY: 0 });

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = width;
    canvas.height = height;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const w of map.walls) {
      minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x);
      minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y);
    }

    const padding = 20;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const scale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY);
    const offX = padding + ((width - padding * 2) - rangeX * scale) / 2;
    const offY = padding + ((height - padding * 2) - rangeY * scale) / 2;
    bounds.current = { minX, maxX, minY, maxY, scale, offX, offY };

    function tx(x: number) { return offX + (x - minX) * scale; }
    function ty(y: number) { return offY + (y - minY) * scale; }

    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, width, height);

    for (const sector of map.sectors) {
      ctx.beginPath();
      let wallIdx = sector.wallPtr;
      const firstWall = map.walls[wallIdx];
      if (!firstWall) continue;
      ctx.moveTo(tx(firstWall.x), ty(firstWall.y));
      for (let i = 0; i < sector.wallNum; i++) {
        const wall = map.walls[wallIdx];
        const next = map.walls[wall.point2];
        ctx.lineTo(tx(next.x), ty(next.y));
        wallIdx = wall.point2;
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(63, 63, 70, 0.3)";
      ctx.fill();
    }

    for (const wall of map.walls) {
      const next = map.walls[wall.point2];
      if (!next) continue;
      ctx.beginPath();
      ctx.moveTo(tx(wall.x), ty(wall.y));
      ctx.lineTo(tx(next.x), ty(next.y));
      ctx.strokeStyle = wall.nextSector >= 0 ? "#71717a" : "#a1a1aa";
      ctx.lineWidth = wall.nextSector >= 0 ? 0.5 : 1;
      ctx.stroke();
    }

    for (const sprite of map.sprites) {
      ctx.beginPath();
      ctx.arc(tx(sprite.x), ty(sprite.y), 2, 0, Math.PI * 2);
      ctx.fillStyle = "#f97316";
      ctx.fill();
    }

    const ps = map.playerStart;
    ctx.beginPath();
    ctx.arc(tx(ps.x), ty(ps.y), 4, 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();
  }, [map, width, height]);

  useEffect(() => { draw(); }, [draw]);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onSectorClick) return;
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const { minX, minY, scale, offX, offY } = bounds.current;
    const mx = (cx - offX) / scale + minX;
    const my = (cy - offY) / scale + minY;

    for (let si = 0; si < map.sectors.length; si++) {
      const sector = map.sectors[si];
      let inside = false;
      let wi = sector.wallPtr;
      for (let i = 0; i < sector.wallNum; i++) {
        const wall = map.walls[wi];
        const next = map.walls[wall.point2];
        const x1 = wall.x, y1 = wall.y, x2 = next.x, y2 = next.y;
        if ((y1 > my) !== (y2 > my) && mx < ((x2 - x1) * (my - y1)) / (y2 - y1) + x1) {
          inside = !inside;
        }
        wi = wall.point2;
      }
      if (inside) { onSectorClick(si); return; }
    }
  }

  return <canvas ref={ref} className="cursor-crosshair" onClick={handleClick} />;
}
