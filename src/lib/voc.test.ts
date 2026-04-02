import { describe, it, expect } from "vitest";
import { parseVoc } from "./voc";

function makeVoc(sampleRateByte: number, samples: number[]): ArrayBuffer {
  const header = "Creative Voice File\x1a";
  const dataOffset = 26;
  const blockSize = 2 + samples.length;
  const totalSize = dataOffset + 1 + 3 + blockSize + 1;
  const buf = new ArrayBuffer(totalSize);
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);

  const enc = new TextEncoder();
  bytes.set(enc.encode(header), 0);
  view.setUint16(20, dataOffset, true);
  view.setUint16(22, 0x010a, true);
  view.setUint16(24, 0x1129, true);

  let off = dataOffset;
  bytes[off++] = 1;
  bytes[off++] = blockSize & 0xff;
  bytes[off++] = (blockSize >> 8) & 0xff;
  bytes[off++] = (blockSize >> 16) & 0xff;
  bytes[off++] = sampleRateByte;
  bytes[off++] = 0;

  for (const s of samples) bytes[off++] = s;
  bytes[off] = 0;

  return buf;
}

describe("parseVoc", () => {
  it("decodes 8-bit unsigned PCM to float32", () => {
    const result = parseVoc(makeVoc(128, [128, 0, 255]));
    expect(result.sampleRate).toBe(7812);
    expect(result.samples).toHaveLength(3);
    expect(Math.abs(result.samples[0])).toBeLessThan(0.01);
    expect(result.samples[1]).toBeCloseTo(-1.0, 1);
    expect(result.samples[2]).toBeCloseTo(1.0, 1);
  });

  it("throws on invalid header", () => {
    const buf = new ArrayBuffer(26);
    expect(() => parseVoc(buf)).toThrow("Invalid VOC");
  });
});
