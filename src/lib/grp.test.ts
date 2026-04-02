import { describe, it, expect } from "vitest";
import { parseGrp } from "./grp";

function makeGrp(files: { name: string; data: Uint8Array }[]): ArrayBuffer {
  const magic = new TextEncoder().encode("KenSilverman");
  const dirSize = 16 * files.length;
  const dataSize = files.reduce((s, f) => s + f.data.length, 0);
  const buf = new ArrayBuffer(12 + 4 + dirSize + dataSize);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  bytes.set(magic, 0);
  view.setUint32(12, files.length, true);

  let offset = 16;
  for (const f of files) {
    const nameBytes = new TextEncoder().encode(f.name);
    bytes.set(nameBytes.slice(0, 12), offset);
    view.setUint32(offset + 12, f.data.length, true);
    offset += 16;
  }
  for (const f of files) {
    bytes.set(f.data, offset);
    offset += f.data.length;
  }
  return buf;
}

describe("parseGrp", () => {
  it("parses magic and file count", () => {
    const grp = makeGrp([
      { name: "TEST.TXT", data: new Uint8Array([72, 73]) },
    ]);
    const archive = parseGrp(grp);
    expect(archive.files).toHaveLength(1);
    expect(archive.files[0].name).toBe("TEST.TXT");
    expect(archive.files[0].size).toBe(2);
  });

  it("extracts file data correctly", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const grp = makeGrp([{ name: "DATA.BIN", data }]);
    const archive = parseGrp(grp);
    const extracted = new Uint8Array(archive.getFile("DATA.BIN"));
    expect(extracted).toEqual(data);
  });

  it("handles multiple files", () => {
    const grp = makeGrp([
      { name: "A.TXT", data: new Uint8Array([65]) },
      { name: "B.TXT", data: new Uint8Array([66, 67]) },
    ]);
    const archive = parseGrp(grp);
    expect(archive.files).toHaveLength(2);
    expect(new Uint8Array(archive.getFile("A.TXT"))).toEqual(new Uint8Array([65]));
    expect(new Uint8Array(archive.getFile("B.TXT"))).toEqual(new Uint8Array([66, 67]));
  });

  it("throws on invalid magic", () => {
    const buf = new ArrayBuffer(16);
    expect(() => parseGrp(buf)).toThrow("Invalid GRP");
  });
});
