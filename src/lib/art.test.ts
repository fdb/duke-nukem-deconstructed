import { describe, it, expect } from "vitest";
import { parseArt, renderTileToRGBA } from "./art";

function makeArt(
  firstTile: number,
  tiles: { w: number; h: number; pixels: number[] }[],
): ArrayBuffer {
  const n = tiles.length;
  const lastTile = firstTile + n - 1;
  const headerSize = 16 + n * 2 + n * 2 + n * 4;
  const pixelSize = tiles.reduce((s, t) => s + t.w * t.h, 0);
  const buf = new ArrayBuffer(headerSize + pixelSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  view.setUint32(0, 1, true);
  view.setUint32(4, 0, true);
  view.setUint32(8, firstTile, true);
  view.setUint32(12, lastTile, true);

  let off = 16;
  for (const t of tiles) { view.setInt16(off, t.w, true); off += 2; }
  for (const t of tiles) { view.setInt16(off, t.h, true); off += 2; }
  off += n * 4;

  for (const t of tiles) {
    for (const p of t.pixels) bytes[off++] = p;
  }

  return buf;
}

describe("parseArt", () => {
  it("parses tile dimensions and pixels", () => {
    const art = parseArt(makeArt(0, [{ w: 2, h: 3, pixels: [1, 2, 3, 4, 5, 6] }]));
    expect(art.firstTile).toBe(0);
    expect(art.tiles).toHaveLength(1);
    expect(art.tiles[0].width).toBe(2);
    expect(art.tiles[0].height).toBe(3);
    expect(art.tiles[0].pixels).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });

  it("handles empty tiles (0x0)", () => {
    const art = parseArt(makeArt(10, [{ w: 0, h: 0, pixels: [] }]));
    expect(art.tiles[0].width).toBe(0);
    expect(art.tiles[0].height).toBe(0);
    expect(art.tiles[0].pixels).toHaveLength(0);
  });
});

describe("renderTileToRGBA", () => {
  it("converts indexed pixels to RGBA using palette", () => {
    const tile = {
      width: 1, height: 2, pixels: new Uint8Array([0, 1]),
      animFrames: 0, animType: 0, xOffset: 0, yOffset: 0, animSpeed: 0,
    };
    const colors = new Uint8Array(768);
    colors[0] = 255; colors[1] = 0; colors[2] = 0;
    colors[3] = 0; colors[4] = 255; colors[5] = 0;

    const rgba = renderTileToRGBA(tile, colors);
    expect(rgba[0]).toBe(255);
    expect(rgba[1]).toBe(0);
    expect(rgba[2]).toBe(0);
    expect(rgba[3]).toBe(255);
    expect(rgba[4]).toBe(0);
    expect(rgba[5]).toBe(255);
    expect(rgba[6]).toBe(0);
    expect(rgba[7]).toBe(255);
  });

  it("treats index 255 as transparent", () => {
    const tile = {
      width: 1, height: 1, pixels: new Uint8Array([255]),
      animFrames: 0, animType: 0, xOffset: 0, yOffset: 0, animSpeed: 0,
    };
    const colors = new Uint8Array(768);
    const rgba = renderTileToRGBA(tile, colors);
    expect(rgba[3]).toBe(0);
  });
});
