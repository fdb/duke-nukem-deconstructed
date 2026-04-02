import type { ArtFile, ArtTile } from "./types";

export function parseArt(buffer: ArrayBuffer): ArtFile {
  const view = new DataView(buffer);

  const firstTile = view.getUint32(8, true);
  const lastTile = view.getUint32(12, true);
  const count = lastTile - firstTile + 1;

  let offset = 16;
  const widths = new Int16Array(count);
  for (let i = 0; i < count; i++) {
    widths[i] = view.getInt16(offset, true);
    offset += 2;
  }

  const heights = new Int16Array(count);
  for (let i = 0; i < count; i++) {
    heights[i] = view.getInt16(offset, true);
    offset += 2;
  }

  const picanms = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    picanms[i] = view.getUint32(offset, true);
    offset += 4;
  }

  const tiles: ArtTile[] = [];
  for (let i = 0; i < count; i++) {
    const w = Math.max(0, widths[i]);
    const h = Math.max(0, heights[i]);
    const pixelCount = w * h;
    const pixels = pixelCount > 0
      ? new Uint8Array(buffer, offset, pixelCount)
      : new Uint8Array(0);
    offset += pixelCount;

    const p = picanms[i];
    const animFrames = p & 0x3f;
    const animType = (p >> 6) & 0x3;
    const xOffset = (p >> 8) & 0xff;
    const yOffset = (p >> 16) & 0xff;
    const animSpeed = (p >> 24) & 0xf;

    tiles.push({ width: w, height: h, pixels: new Uint8Array(pixels), animFrames, animType, xOffset, yOffset, animSpeed });
  }

  return { firstTile, lastTile, tiles };
}

export function renderTileToRGBA(
  tile: Pick<ArtTile, "width" | "height" | "pixels">,
  paletteColors: Uint8Array,
): Uint8Array {
  const { width, height, pixels } = tile;
  const rgba = new Uint8Array(width * height * 4);

  for (let col = 0; col < width; col++) {
    for (let row = 0; row < height; row++) {
      const srcIdx = col * height + row;
      const dstIdx = (row * width + col) * 4;
      const colorIdx = pixels[srcIdx];

      if (colorIdx === 255) {
        rgba[dstIdx + 3] = 0;
      } else {
        rgba[dstIdx] = paletteColors[colorIdx * 3];
        rgba[dstIdx + 1] = paletteColors[colorIdx * 3 + 1];
        rgba[dstIdx + 2] = paletteColors[colorIdx * 3 + 2];
        rgba[dstIdx + 3] = 255;
      }
    }
  }

  return rgba;
}
