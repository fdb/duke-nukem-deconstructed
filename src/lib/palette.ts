import type { Palette, LookupTable } from "./types";

export function parsePalette(buffer: ArrayBuffer): Palette {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  const colors = new Uint8Array(768);
  for (let i = 0; i < 768; i++) {
    colors[i] = Math.min(bytes[i] * 4, 255);
  }

  const numShades = view.getUint16(768, true);
  const shadeTable = new Uint8Array(buffer, 770, numShades * 256);

  return { colors, shadeTable, numShades };
}

export function parseLookupDat(buffer: ArrayBuffer): LookupTable[] {
  const bytes = new Uint8Array(buffer);
  const numTables = bytes[0];
  const tables: LookupTable[] = [];

  let offset = 1;
  for (let i = 0; i < numTables; i++) {
    offset += 1;
    const remap = new Uint8Array(buffer, offset, 256);
    tables.push({ remap: new Uint8Array(remap) });
    offset += 256;
  }

  return tables;
}
