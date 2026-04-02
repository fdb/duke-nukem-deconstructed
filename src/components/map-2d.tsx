import { useEffect, useRef, useCallback, useState } from "react";
import type { BuildMap } from "../lib/types";

interface Map2DProps {
  map: BuildMap;
  width: number;
  height: number;
  onSectorClick?: (sectorIdx: number) => void;
}

export function Map2D({ map, width, height, onSectorClick }: Map2DProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanning = useRef(false);
  const didPan = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const baseBounds = useRef({ minX: 0, maxX: 0, minY: 0, maxY: 0 });

  // Reset zoom/pan when map changes
  useEffect(() => { setZoom(1); setPanX(0); setPanY(0); }, [map]);

  // Native wheel listener to prevent page scroll (React onWheel is passive)
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    function onWheel(e: WheelEvent) { e.preventDefault(); }
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

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
    baseBounds.current = { minX, maxX, minY, maxY };

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 20;
    const baseScale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY);
    const scale = baseScale * zoom;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    function lx(x: number) { return width / 2 + (x - centerX) * scale + panX; }
    function ly(y: number) { return height / 2 + (y - centerY) * scale + panY; }

    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, width, height);

    for (const sector of map.sectors) {
      ctx.beginPath();
      let wallIdx = sector.wallPtr;
      const firstWall = map.walls[wallIdx];
      if (!firstWall) continue;
      ctx.moveTo(lx(firstWall.x), ly(firstWall.y));
      for (let i = 0; i < sector.wallNum; i++) {
        const wall = map.walls[wallIdx];
        const next = map.walls[wall.point2];
        ctx.lineTo(lx(next.x), ly(next.y));
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
      ctx.moveTo(lx(wall.x), ly(wall.y));
      ctx.lineTo(lx(next.x), ly(next.y));
      ctx.strokeStyle = wall.nextSector >= 0 ? "#71717a" : "#a1a1aa";
      ctx.lineWidth = wall.nextSector >= 0 ? 0.5 : 1;
      ctx.stroke();
    }

    const spriteRadius = Math.max(1.5, 2 * Math.min(zoom, 3));
    for (const sprite of map.sprites) {
      ctx.beginPath();
      ctx.arc(lx(sprite.x), ly(sprite.y), spriteRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#f97316";
      ctx.fill();
    }

    const ps = map.playerStart;
    ctx.beginPath();
    ctx.arc(lx(ps.x), ly(ps.y), Math.max(3, 4 * Math.min(zoom, 3)), 0, Math.PI * 2);
    ctx.fillStyle = "#22c55e";
    ctx.fill();
  }, [map, width, height, zoom, panX, panY]);

  useEffect(() => { draw(); }, [draw]);

  function canvasToMap(clientX: number, clientY: number) {
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = (clientX - rect.left) * (canvas.width / rect.width);
    const cy = (clientY - rect.top) * (canvas.height / rect.height);
    const { minX, maxX, minY, maxY } = baseBounds.current;
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 20;
    const baseScale = Math.min((width - padding * 2) / rangeX, (height - padding * 2) / rangeY);
    const scale = baseScale * zoom;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const mx = (cx - width / 2 - panX) / scale + centerX;
    const my = (cy - height / 2 - panY) / scale + centerY;
    return { mx, my };
  }

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!onSectorClick || didPan.current) return;
    const { mx, my } = canvasToMap(e.clientX, e.clientY);

    for (let si = 0; si < map.sectors.length; si++) {
      const sector = map.sectors[si];
      let inside = false;
      let wi = sector.wallPtr;
      for (let i = 0; i < sector.wallNum; i++) {
        const wall = map.walls[wi];
        const next = map.walls[wall.point2];
        if ((wall.y > my) !== (next.y > my) && mx < ((next.x - wall.x) * (my - wall.y)) / (next.y - wall.y) + wall.x) {
          inside = !inside;
        }
        wi = wall.point2;
      }
      if (inside) { onSectorClick(si); return; }
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    e.stopPropagation();
    const factor = e.deltaY < 0 ? 1.03 : 1 / 1.03;
    const newZoom = Math.max(0.1, Math.min(50, zoom * factor));

    // Zoom towards mouse position
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top) * (canvas.height / rect.height);
    const dx = cx - width / 2;
    const dy = cy - height / 2;
    const ratio = 1 - newZoom / zoom;

    setPanX((p) => p + (dx - p) * ratio);
    setPanY((p) => p + (dy - p) * ratio);
    setZoom(newZoom);
  }

  function handleMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (e.button === 0) {
      isPanning.current = true;
      didPan.current = false;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didPan.current = true;
    setPanX((p) => p + dx);
    setPanY((p) => p + dy);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }

  function handleMouseUp() { isPanning.current = false; }

  return (
    <canvas
      ref={ref}
      className="cursor-crosshair"
      onClick={handleClick}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
