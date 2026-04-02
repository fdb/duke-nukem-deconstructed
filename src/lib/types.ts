export interface GrpEntry {
  name: string;
  size: number;
  offset: number;
}

export interface GrpArchive {
  files: GrpEntry[];
  getFile(name: string): ArrayBuffer;
  getFileBytes(name: string): Uint8Array;
  buffer: ArrayBuffer;
}

export interface Palette {
  colors: Uint8Array;
  shadeTable: Uint8Array;
  numShades: number;
}

export interface LookupTable {
  remap: Uint8Array;
}

export interface ArtTile {
  width: number;
  height: number;
  animFrames: number;
  animType: number;
  xOffset: number;
  yOffset: number;
  animSpeed: number;
  pixels: Uint8Array;
}

export interface ArtFile {
  firstTile: number;
  lastTile: number;
  tiles: ArtTile[];
}

export interface BuildSector {
  wallPtr: number;
  wallNum: number;
  ceilingZ: number;
  floorZ: number;
  ceilingStat: number;
  floorStat: number;
  ceilingPicnum: number;
  ceilingHeinum: number;
  ceilingShade: number;
  ceilingPal: number;
  ceilingXPanning: number;
  ceilingYPanning: number;
  floorPicnum: number;
  floorHeinum: number;
  floorShade: number;
  floorPal: number;
  floorXPanning: number;
  floorYPanning: number;
  visibility: number;
  loTag: number;
  hiTag: number;
  extra: number;
}

export interface BuildWall {
  x: number;
  y: number;
  point2: number;
  nextWall: number;
  nextSector: number;
  cstat: number;
  picnum: number;
  overPicnum: number;
  shade: number;
  pal: number;
  xRepeat: number;
  yRepeat: number;
  xPanning: number;
  yPanning: number;
  loTag: number;
  hiTag: number;
  extra: number;
}

export interface BuildSprite {
  x: number;
  y: number;
  z: number;
  cstat: number;
  picnum: number;
  shade: number;
  pal: number;
  clipDist: number;
  xRepeat: number;
  yRepeat: number;
  xOffset: number;
  yOffset: number;
  sectNum: number;
  statNum: number;
  ang: number;
  owner: number;
  xVel: number;
  yVel: number;
  zVel: number;
  loTag: number;
  hiTag: number;
  extra: number;
}

export interface BuildMap {
  version: number;
  playerStart: { x: number; y: number; z: number; ang: number; sector: number };
  sectors: BuildSector[];
  walls: BuildWall[];
  sprites: BuildSprite[];
}
