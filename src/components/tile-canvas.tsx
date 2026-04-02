import { useEffect, useRef } from "react";

interface TileCanvasProps {
  rgba: Uint8Array;
  width: number;
  height: number;
  scale?: number;
  className?: string;
}

export function TileCanvas({ rgba, width, height, scale = 1, className = "" }: TileCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || width === 0 || height === 0) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const clamped = new Uint8ClampedArray(rgba.length);
    clamped.set(rgba);
    const img = new ImageData(clamped, width, height);
    ctx.putImageData(img, 0, 0);
  }, [rgba, width, height]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{
        width: width * scale,
        height: height * scale,
        imageRendering: "pixelated",
      }}
    />
  );
}
