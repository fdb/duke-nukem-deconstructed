export interface VocData {
  sampleRate: number;
  samples: Float32Array;
}

const VOC_MAGIC = "Creative Voice File\x1a";

export function parseVoc(buffer: ArrayBuffer): VocData {
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder("ascii");

  const magic = decoder.decode(bytes.slice(0, 20));
  if (magic !== VOC_MAGIC) {
    throw new Error("Invalid VOC: bad header");
  }

  const view = new DataView(buffer);
  const dataOffset = view.getUint16(20, true);

  const pcmChunks: Uint8Array[] = [];
  let sampleRate = 11025;
  let off = dataOffset;

  while (off < buffer.byteLength) {
    const blockType = bytes[off++];
    if (blockType === 0) break;

    const blockSize = bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16);
    off += 3;

    if (blockType === 1) {
      const srByte = bytes[off];
      const codec = bytes[off + 1];
      sampleRate = Math.floor(1000000 / (256 - srByte));

      if (codec === 0) {
        pcmChunks.push(bytes.slice(off + 2, off + blockSize));
      }
    }

    off += blockSize;
  }

  const totalSamples = pcmChunks.reduce((s, c) => s + c.length, 0);
  const samples = new Float32Array(totalSamples);
  let idx = 0;
  for (const chunk of pcmChunks) {
    for (let i = 0; i < chunk.length; i++) {
      samples[idx++] = (chunk[i] - 128) / 128;
    }
  }

  return { sampleRate, samples };
}
