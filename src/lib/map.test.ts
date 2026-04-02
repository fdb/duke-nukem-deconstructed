import { describe, it, expect } from "vitest";
import { parseMap } from "./map";

function makeMap(opts: { sectors: number; walls: number; sprites: number }): ArrayBuffer {
  const headerSize = 22;
  const sectorSize = opts.sectors * 40;
  const wallSize = 2 + opts.walls * 32;
  const spriteSize = 2 + opts.sprites * 44;
  const buf = new ArrayBuffer(headerSize + sectorSize + wallSize + spriteSize);
  const view = new DataView(buf);

  view.setUint32(0, 7, true);
  view.setInt32(4, 1000, true);
  view.setInt32(8, 2000, true);
  view.setInt32(12, 3000, true);
  view.setUint16(16, 512, true);
  view.setUint16(18, 0, true);
  view.setUint16(20, opts.sectors, true);

  let off = headerSize + sectorSize;
  view.setUint16(off, opts.walls, true);
  off += 2 + opts.walls * 32;
  view.setUint16(off, opts.sprites, true);

  return buf;
}

describe("parseMap", () => {
  it("parses header and counts", () => {
    const map = parseMap(makeMap({ sectors: 2, walls: 5, sprites: 3 }));
    expect(map.version).toBe(7);
    expect(map.playerStart).toEqual({ x: 1000, y: 2000, z: 3000, ang: 512, sector: 0 });
    expect(map.sectors).toHaveLength(2);
    expect(map.walls).toHaveLength(5);
    expect(map.sprites).toHaveLength(3);
  });

  it("throws on unsupported version", () => {
    const buf = new ArrayBuffer(22);
    const view = new DataView(buf);
    view.setUint32(0, 99, true);
    expect(() => parseMap(buf)).toThrow("Unsupported MAP version");
  });
});
