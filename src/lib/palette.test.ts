import { describe, it, expect } from "vitest";
import { parsePalette, parseLookupDat } from "./palette";

function makePaletteDat(): ArrayBuffer {
  const size = 768 + 2 + 8192;
  const buf = new ArrayBuffer(size);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);

  bytes[0] = 10; bytes[1] = 20; bytes[2] = 30;
  bytes[3] = 63; bytes[4] = 0; bytes[5] = 0;

  view.setUint16(768, 32, true);
  bytes[770] = 5;

  return buf;
}

describe("parsePalette", () => {
  it("reads 256 RGB colors and scales from 0-63 to 0-255", () => {
    const buf = makePaletteDat();
    const pal = parsePalette(buf);
    expect(pal.colors[0]).toBe(40);
    expect(pal.colors[1]).toBe(80);
    expect(pal.colors[2]).toBe(120);
    expect(pal.colors[3]).toBe(252);
  });

  it("reads shade table", () => {
    const buf = makePaletteDat();
    const pal = parsePalette(buf);
    expect(pal.numShades).toBe(32);
    expect(pal.shadeTable[0]).toBe(5);
  });
});

describe("parseLookupDat", () => {
  it("reads remap tables", () => {
    const buf = new ArrayBuffer(1 + 1 + 256);
    const bytes = new Uint8Array(buf);
    bytes[0] = 1;
    bytes[1] = 0;
    bytes[2 + 0] = 42;
    const tables = parseLookupDat(buf);
    expect(tables).toHaveLength(1);
    expect(tables[0].remap[0]).toBe(42);
  });
});
