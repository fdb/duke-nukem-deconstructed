import type { GrpArchive, GrpEntry } from "./types";

const MAGIC = "KenSilverman";

export function parseGrp(buffer: ArrayBuffer): GrpArchive {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("ascii");

  const magic = decoder.decode(bytes.slice(0, 12));
  if (magic !== MAGIC) {
    throw new Error("Invalid GRP: bad magic");
  }

  const fileCount = view.getUint32(12, true);
  const files: GrpEntry[] = [];
  let dataOffset = 16 + fileCount * 16;

  for (let i = 0; i < fileCount; i++) {
    const entryOffset = 16 + i * 16;
    const nameBytes = bytes.slice(entryOffset, entryOffset + 12);
    const nullIdx = nameBytes.indexOf(0);
    const name = decoder.decode(nameBytes.slice(0, nullIdx === -1 ? 12 : nullIdx));
    const size = view.getUint32(entryOffset + 12, true);
    files.push({ name, size, offset: dataOffset });
    dataOffset += size;
  }

  return {
    files,
    buffer,
    getFile(name: string): ArrayBuffer {
      const entry = files.find((f) => f.name === name);
      if (!entry) throw new Error(`File not found in GRP: ${name}`);
      return buffer.slice(entry.offset, entry.offset + entry.size);
    },
    getFileBytes(name: string): Uint8Array {
      const entry = files.find((f) => f.name === name);
      if (!entry) throw new Error(`File not found in GRP: ${name}`);
      return new Uint8Array(buffer, entry.offset, entry.size);
    },
  };
}
