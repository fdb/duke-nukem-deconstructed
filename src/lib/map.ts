import type { BuildMap, BuildSector, BuildWall, BuildSprite } from "./types";

export function parseMap(buffer: ArrayBuffer): BuildMap {
  const view = new DataView(buffer);
  let off = 0;

  const version = view.getUint32(off, true); off += 4;
  if (version !== 7 && version !== 8 && version !== 9) {
    throw new Error(`Unsupported MAP version: ${version}`);
  }

  const posX = view.getInt32(off, true); off += 4;
  const posY = view.getInt32(off, true); off += 4;
  const posZ = view.getInt32(off, true); off += 4;
  const ang = view.getUint16(off, true); off += 2;
  const curSect = view.getUint16(off, true); off += 2;

  const numSectors = view.getUint16(off, true); off += 2;
  const sectors: BuildSector[] = [];
  for (let i = 0; i < numSectors; i++) {
    sectors.push({
      wallPtr: view.getUint16(off, true),
      wallNum: view.getUint16(off + 2, true),
      ceilingZ: view.getInt32(off + 4, true),
      floorZ: view.getInt32(off + 8, true),
      ceilingStat: view.getUint16(off + 12, true),
      floorStat: view.getUint16(off + 14, true),
      ceilingPicnum: view.getInt16(off + 16, true),
      ceilingHeinum: view.getInt16(off + 18, true),
      ceilingShade: view.getInt8(off + 20),
      ceilingPal: view.getUint8(off + 21),
      ceilingXPanning: view.getUint8(off + 22),
      ceilingYPanning: view.getUint8(off + 23),
      floorPicnum: view.getInt16(off + 24, true),
      floorHeinum: view.getInt16(off + 26, true),
      floorShade: view.getInt8(off + 28),
      floorPal: view.getUint8(off + 29),
      floorXPanning: view.getUint8(off + 30),
      floorYPanning: view.getUint8(off + 31),
      visibility: view.getUint8(off + 32),
      loTag: view.getInt16(off + 34, true),
      hiTag: view.getInt16(off + 36, true),
      extra: view.getInt16(off + 38, true),
    });
    off += 40;
  }

  const numWalls = view.getUint16(off, true); off += 2;
  const walls: BuildWall[] = [];
  for (let i = 0; i < numWalls; i++) {
    walls.push({
      x: view.getInt32(off, true),
      y: view.getInt32(off + 4, true),
      point2: view.getUint16(off + 8, true),
      nextWall: view.getInt16(off + 10, true),
      nextSector: view.getInt16(off + 12, true),
      cstat: view.getUint16(off + 14, true),
      picnum: view.getUint16(off + 16, true),
      overPicnum: view.getUint16(off + 18, true),
      shade: view.getInt8(off + 20),
      pal: view.getUint8(off + 21),
      xRepeat: view.getUint8(off + 22),
      yRepeat: view.getUint8(off + 23),
      xPanning: view.getUint8(off + 24),
      yPanning: view.getUint8(off + 25),
      loTag: view.getInt16(off + 26, true),
      hiTag: view.getInt16(off + 28, true),
      extra: view.getInt16(off + 30, true),
    });
    off += 32;
  }

  const numSprites = view.getUint16(off, true); off += 2;
  const sprites: BuildSprite[] = [];
  for (let i = 0; i < numSprites; i++) {
    sprites.push({
      x: view.getInt32(off, true),
      y: view.getInt32(off + 4, true),
      z: view.getInt32(off + 8, true),
      cstat: view.getUint16(off + 12, true),
      picnum: view.getUint16(off + 14, true),
      shade: view.getInt8(off + 16),
      pal: view.getUint8(off + 17),
      clipDist: view.getUint8(off + 18),
      xRepeat: view.getUint8(off + 20),
      yRepeat: view.getUint8(off + 21),
      xOffset: view.getInt8(off + 22),
      yOffset: view.getInt8(off + 23),
      sectNum: view.getUint16(off + 24, true),
      statNum: view.getUint16(off + 26, true),
      ang: view.getUint16(off + 28, true),
      owner: view.getUint16(off + 30, true),
      xVel: view.getInt16(off + 32, true),
      yVel: view.getInt16(off + 34, true),
      zVel: view.getInt16(off + 36, true),
      loTag: view.getInt16(off + 38, true),
      hiTag: view.getInt16(off + 40, true),
      extra: view.getInt16(off + 42, true),
    });
    off += 44;
  }

  return {
    version,
    playerStart: { x: posX, y: posY, z: posZ, ang, sector: curSect },
    sectors,
    walls,
    sprites,
  };
}
