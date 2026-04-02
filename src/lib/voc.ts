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
    if (blockType === 0) break; // terminator

    const blockSize = bytes[off] | (bytes[off + 1] << 8) | (bytes[off + 2] << 16);
    off += 3;

    if (blockType === 1) {
      // Type 1: original sound data
      const srByte = bytes[off];
      const codec = bytes[off + 1];
      sampleRate = Math.floor(1000000 / (256 - srByte));

      if (codec === 0) {
        pcmChunks.push(bytes.slice(off + 2, off + blockSize));
      }
    } else if (blockType === 9) {
      // Type 9: new format sound data
      const rate = view.getUint32(off, true);
      const bitsPerSample = bytes[off + 4];
      // const channels = bytes[off + 5];
      const codec = view.getUint16(off + 6, true);

      sampleRate = rate;

      if (codec === 0 && bitsPerSample === 8) {
        // 8-bit unsigned PCM — 12 bytes header in the block
        pcmChunks.push(bytes.slice(off + 12, off + blockSize));
      }
      // codec 4 (16-bit ADPCM) and others are unsupported — skip silently
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

/** Encode PCM float32 samples as a WAV file blob */
export function vocToWav(data: VocData): Blob {
  const numSamples = data.samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const enc = new TextEncoder();
  const bytes = new Uint8Array(buffer);

  // RIFF header
  bytes.set(enc.encode("RIFF"), 0);
  view.setUint32(4, 36 + numSamples * 2, true);
  bytes.set(enc.encode("WAVE"), 8);

  // fmt chunk
  bytes.set(enc.encode("fmt "), 12);
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, data.sampleRate, true);
  view.setUint32(28, data.sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  bytes.set(enc.encode("data"), 36);
  view.setUint32(40, numSamples * 2, true);

  // Convert float32 → int16
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, data.samples[i]));
    view.setInt16(44 + i * 2, s * 32767, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
}
