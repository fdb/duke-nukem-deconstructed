import * as THREE from "three";

interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Builds a texture atlas from rendered tile RGBA data.
 * Returns the atlas DataTexture and a lookup from picnum → UV rect (0-1 normalized).
 */
export function buildTextureAtlas(
  picnums: number[],
  renderTile: (picnum: number) => Uint8Array | undefined,
  getTileDims: (picnum: number) => { w: number; h: number } | undefined,
): { texture: THREE.DataTexture; uvLookup: Map<number, TileRect> } {
  const unique = [...new Set(picnums)].filter((p) => {
    const dims = getTileDims(p);
    return dims && dims.w > 0 && dims.h > 0;
  });

  // Simple shelf packing into a power-of-2 atlas
  const ATLAS_SIZE = 2048;
  const atlas = new Uint8Array(ATLAS_SIZE * ATLAS_SIZE * 4);
  const uvLookup = new Map<number, TileRect>();

  let shelfX = 0;
  let shelfY = 0;
  let shelfHeight = 0;

  for (const picnum of unique) {
    const dims = getTileDims(picnum)!;
    const rgba = renderTile(picnum);
    if (!rgba) continue;

    const tw = dims.w;
    const th = dims.h;

    // Wrap to next shelf if needed
    if (shelfX + tw > ATLAS_SIZE) {
      shelfX = 0;
      shelfY += shelfHeight;
      shelfHeight = 0;
    }

    // Out of atlas space
    if (shelfY + th > ATLAS_SIZE) continue;

    // Copy tile into atlas
    for (let row = 0; row < th; row++) {
      const srcOff = row * tw * 4;
      const dstOff = ((shelfY + row) * ATLAS_SIZE + shelfX) * 4;
      atlas.set(rgba.subarray(srcOff, srcOff + tw * 4), dstOff);
    }

    uvLookup.set(picnum, {
      x: shelfX / ATLAS_SIZE,
      y: shelfY / ATLAS_SIZE,
      w: tw / ATLAS_SIZE,
      h: th / ATLAS_SIZE,
    });

    shelfX += tw;
    shelfHeight = Math.max(shelfHeight, th);
  }

  const texture = new THREE.DataTexture(
    atlas,
    ATLAS_SIZE,
    ATLAS_SIZE,
    THREE.RGBAFormat,
  );
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.flipY = false;
  texture.needsUpdate = true;

  return { texture, uvLookup };
}
