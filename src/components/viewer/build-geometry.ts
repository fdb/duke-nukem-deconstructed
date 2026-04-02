import * as THREE from "three";
import type { BuildMap, BuildSector, BuildWall } from "../../lib/types";

const Z_SCALE = 1 / 8192;
const XY_SCALE = 1 / 512;

/** Tile dims lookup: returns {w, h} in pixels for a given picnum */
export type GetTileDims = (picnum: number) => { w: number; h: number } | undefined;

function getSlopeZ(
  baseZ: number,
  heinum: number,
  px: number,
  py: number,
  firstWall: BuildWall,
  walls: BuildWall[],
): number {
  if (heinum === 0) return baseZ * Z_SCALE;
  const nextWall = walls[firstWall.point2];
  const dx = nextWall.x - firstWall.x;
  const dy = nextWall.y - firstWall.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return baseZ * Z_SCALE;
  const nx = -dy / len;
  const ny = dx / len;
  const dist = (px - firstWall.x) * nx + (py - firstWall.y) * ny;
  return (baseZ + (heinum * dist) / 4096) * Z_SCALE;
}

export interface LevelGeometry {
  walls: THREE.BufferGeometry;
  floors: THREE.BufferGeometry;
  ceilings: THREE.BufferGeometry;
  wallPicnums: number[];
  floorPicnums: number[];
  ceilingPicnums: number[];
  sprites: { x: number; y: number; z: number; picnum: number; xRepeat: number; yRepeat: number; cstat: number }[];
}

/**
 * Build wall quads for a sector. Returns positions and per-quad tiled UVs.
 * UV formula: u = dist_along_wall * xrepeat / (tileWidth * 16)
 *             v = vertical_pos * yrepeat / (tileHeight * 16)
 */
function buildSectorWalls(
  sector: BuildSector,
  map: BuildMap,
  getDims: GetTileDims,
): { positions: number[]; uvs: number[]; picnums: number[] } {
  const positions: number[] = [];
  const uvs: number[] = [];
  const picnums: number[] = [];
  const firstWall = map.walls[sector.wallPtr];

  for (let i = 0; i < sector.wallNum; i++) {
    const wallIdx = sector.wallPtr + i;
    const wall = map.walls[wallIdx];
    const nextWall = map.walls[wall.point2];

    const x1 = wall.x * XY_SCALE;
    const y1 = wall.y * XY_SCALE;
    const x2 = nextWall.x * XY_SCALE;
    const y2 = nextWall.y * XY_SCALE;

    const ceilZ1 = getSlopeZ(sector.ceilingZ, sector.ceilingHeinum, wall.x, wall.y, firstWall, map.walls);
    const ceilZ2 = getSlopeZ(sector.ceilingZ, sector.ceilingHeinum, nextWall.x, nextWall.y, firstWall, map.walls);
    const floorZ1 = getSlopeZ(sector.floorZ, sector.floorHeinum, wall.x, wall.y, firstWall, map.walls);
    const floorZ2 = getSlopeZ(sector.floorZ, sector.floorHeinum, nextWall.x, nextWall.y, firstWall, map.walls);

    // Wall length in map units
    const dx = nextWall.x - wall.x;
    const dy = nextWall.y - wall.y;
    const wallLen = Math.sqrt(dx * dx + dy * dy);

    function pushQuad(
      ax1: number, ay1: number, az1: number,
      ax2: number, ay2: number, az2: number,
      bx2: number, by2: number, bz2: number,
      bx1: number, by1: number, bz1: number,
      picnum: number,
      xr: number, yr: number,
    ) {
      positions.push(
        ax1, ay1, az1,  ax2, ay2, az2,  bx2, by2, bz2,
        ax1, ay1, az1,  bx2, by2, bz2,  bx1, by1, bz1,
      );

      const dims = getDims(picnum);
      const tw = dims?.w || 64;
      const th = dims?.h || 64;

      // Height of the quad in map units (approximate from Three.js coords)
      const topY = Math.min(ay1, ay2);   // ceiling (more negative = higher in Build coords)
      const botY = Math.max(by1, by2);   // floor
      const wallHeight = (botY - topY) / Z_SCALE * -1; // back to map units, roughly

      const uRepeat = wallLen * (xr || 8) / (tw * 16);
      const vRepeat = Math.abs(wallHeight) * (yr || 8) / (th * 256);

      // Two triangles for the quad
      // Tri 1: TL, TR, BR
      uvs.push(0, 0,  uRepeat, 0,  uRepeat, vRepeat);
      // Tri 2: TL, BR, BL
      uvs.push(0, 0,  uRepeat, vRepeat,  0, vRepeat);

      picnums.push(picnum, picnum);
    }

    if (wall.nextSector < 0) {
      pushQuad(
        x1, -ceilZ1, y1,  x2, -ceilZ2, y2,
        x2, -floorZ2, y2,  x1, -floorZ1, y1,
        wall.picnum, wall.xRepeat, wall.yRepeat,
      );
    } else {
      const adjSector = map.sectors[wall.nextSector];
      const adjFirstWall = map.walls[adjSector.wallPtr];

      const adjCeilZ1 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjCeilZ2 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);
      const adjFloorZ1 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjFloorZ2 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);

      if (ceilZ1 < adjCeilZ1 || ceilZ2 < adjCeilZ2) {
        const pic = wall.overPicnum || wall.picnum;
        pushQuad(
          x1, -ceilZ1, y1,  x2, -ceilZ2, y2,
          x2, -adjCeilZ2, y2,  x1, -adjCeilZ1, y1,
          pic, wall.xRepeat, wall.yRepeat,
        );
      }
      if (floorZ1 > adjFloorZ1 || floorZ2 > adjFloorZ2) {
        pushQuad(
          x1, -adjFloorZ1, y1,  x2, -adjFloorZ2, y2,
          x2, -floorZ2, y2,  x1, -floorZ1, y1,
          wall.picnum, wall.xRepeat, wall.yRepeat,
        );
      }
    }
  }

  return { positions, uvs, picnums };
}

/**
 * Triangulate a sector's floor or ceiling polygon.
 * UVs are world-space tiled: uv = worldPos_mapUnits / (tileDim * 16)
 */
function triangulateSector(
  sector: BuildSector,
  map: BuildMap,
  isCeiling: boolean,
  getDims: GetTileDims,
): { positions: number[]; uvs: number[]; picnum: number; triCount: number } {
  const positions: number[] = [];
  const uvs: number[] = [];
  const verts: [number, number, number][] = [];
  // Keep map-unit coords for UV computation
  const mapCoords: [number, number][] = [];
  const firstWall = map.walls[sector.wallPtr];
  const heinum = isCeiling ? sector.ceilingHeinum : sector.floorHeinum;
  const baseZ = isCeiling ? sector.ceilingZ : sector.floorZ;
  const picnum = isCeiling ? sector.ceilingPicnum : sector.floorPicnum;

  const dims = getDims(picnum);
  const tw = dims?.w || 64;
  const th = dims?.h || 64;

  for (let i = 0; i < sector.wallNum; i++) {
    const wall = map.walls[sector.wallPtr + i];
    const z = getSlopeZ(baseZ, heinum, wall.x, wall.y, firstWall, map.walls);
    verts.push([wall.x * XY_SCALE, -z, wall.y * XY_SCALE]);
    mapCoords.push([wall.x, wall.y]);
  }

  for (let i = 1; i < verts.length - 1; i++) {
    const idxs = isCeiling ? [0, i + 1, i] : [0, i, i + 1];
    for (const idx of idxs) {
      positions.push(...verts[idx]);
      // World-space tiled UVs
      uvs.push(
        mapCoords[idx][0] / (tw * 16),
        mapCoords[idx][1] / (th * 16),
      );
    }
  }

  const triCount = Math.max(0, verts.length - 2);
  return { positions, uvs, picnum, triCount };
}

export function buildLevelGeometry(map: BuildMap, getDims: GetTileDims): LevelGeometry {
  const allWallPos: number[] = [];
  const allWallUvs: number[] = [];
  const allWallPicnums: number[] = [];
  const allFloorPos: number[] = [];
  const allFloorUvs: number[] = [];
  const allFloorPicnums: number[] = [];
  const allCeilPos: number[] = [];
  const allCeilUvs: number[] = [];
  const allCeilPicnums: number[] = [];

  for (const sector of map.sectors) {
    const wallData = buildSectorWalls(sector, map, getDims);
    allWallPos.push(...wallData.positions);
    allWallUvs.push(...wallData.uvs);
    allWallPicnums.push(...wallData.picnums);

    const floorData = triangulateSector(sector, map, false, getDims);
    allFloorPos.push(...floorData.positions);
    allFloorUvs.push(...floorData.uvs);
    for (let t = 0; t < floorData.triCount; t++) allFloorPicnums.push(floorData.picnum);

    const ceilData = triangulateSector(sector, map, true, getDims);
    allCeilPos.push(...ceilData.positions);
    allCeilUvs.push(...ceilData.uvs);
    for (let t = 0; t < ceilData.triCount; t++) allCeilPicnums.push(ceilData.picnum);
  }

  function makeGeo(pos: number[], uv: number[]) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    if (uv.length > 0) {
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    }
    geo.computeVertexNormals();
    return geo;
  }

  const walls = makeGeo(allWallPos, allWallUvs);
  const floors = makeGeo(allFloorPos, allFloorUvs);
  const ceilings = makeGeo(allCeilPos, allCeilUvs);

  const sprites = map.sprites.map((s) => ({
    x: s.x * XY_SCALE,
    y: -s.z * Z_SCALE,
    z: s.y * XY_SCALE,
    picnum: s.picnum,
    xRepeat: s.xRepeat,
    yRepeat: s.yRepeat,
    cstat: s.cstat,
  }));

  return { walls, floors, ceilings, wallPicnums: allWallPicnums, floorPicnums: allFloorPicnums, ceilingPicnums: allCeilPicnums, sprites };
}

/**
 * Assign per-vertex atlas rect (vec4: x, y, w, h) as a buffer attribute.
 * This tells the shader where in the atlas each vertex's tile lives.
 */
export function assignAtlasRects(
  geometry: THREE.BufferGeometry,
  triPicnums: number[],
  uvLookup: Map<number, { x: number; y: number; w: number; h: number }>,
) {
  const vertCount = geometry.getAttribute("position").count;
  const rects = new Float32Array(vertCount * 4);

  for (let tri = 0; tri < triPicnums.length; tri++) {
    const rect = uvLookup.get(triPicnums[tri]);
    for (let v = 0; v < 3; v++) {
      const vi = tri * 3 + v;
      if (rect) {
        rects[vi * 4] = rect.x;
        rects[vi * 4 + 1] = rect.y;
        rects[vi * 4 + 2] = rect.w;
        rects[vi * 4 + 3] = rect.h;
      }
    }
  }

  geometry.setAttribute("atlasRect", new THREE.Float32BufferAttribute(rects, 4));
}
