import * as THREE from "three";
import type { BuildMap, BuildSector, BuildWall } from "../../lib/types";

const Z_SCALE = 1 / 8192;
const XY_SCALE = 1 / 512;

/** Tile dims lookup: returns {w, h} in pixels for a given picnum */
export type GetTileDims = (picnum: number) => { w: number; h: number } | undefined;

/**
 * Compute Z height at a point accounting for sector slope.
 * From EDuke32 engine.cpp getzsofslopeptr() lines 14289-14310:
 *   j = dmulscale3(dx, py-wy, -dy, px-wx)  → perpDist * wallLen / 8
 *   i = nsqrtasm(dx²+dy²) << 5              → wallLen * 32
 *   z_offset = heinum * j / i               → heinum * perpDist / 256
 */
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
  // Perpendicular distance from point to first wall line
  const nx = -dy / len;
  const ny = dx / len;
  const dist = (px - firstWall.x) * nx + (py - firstWall.y) * ny;
  return (baseZ + (heinum * dist) / 256) * Z_SCALE;
}

export interface LevelGeometry {
  walls: THREE.BufferGeometry;
  floors: THREE.BufferGeometry;
  ceilings: THREE.BufferGeometry;
  wallPicnums: number[];
  floorPicnums: number[];
  ceilingPicnums: number[];
  sprites: { x: number; y: number; z: number; picnum: number; ang: number; xRepeat: number; yRepeat: number; xOffset: number; yOffset: number; cstat: number; shade: number }[];
  /** Base picnum for parallax sky (from first parallax ceiling sector), or -1 if none */
  skyPicnum: number;
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
): { positions: number[]; uvs: number[]; picnums: number[]; shades: number[] } {
  const positions: number[] = [];
  const uvs: number[] = [];
  const picnums: number[] = [];
  const shades: number[] = [];
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

    function pushQuad(
      ax1: number, ay1: number, az1: number,
      ax2: number, ay2: number, az2: number,
      bx2: number, by2: number, bz2: number,
      bx1: number, by1: number, bz1: number,
      picnum: number,
      xr: number, yr: number,
      /** Height of this quad in raw Build Z units (abs(topZ - bottomZ)) */
      heightZ: number,
      shade: number = 0,
      xpan: number = 0, ypan: number = 0,
    ) {
      positions.push(
        ax1, ay1, az1,  ax2, ay2, az2,  bx2, by2, bz2,
        ax1, ay1, az1,  bx2, by2, bz2,  bx1, by1, bz1,
      );

      const dims = getDims(picnum);
      const tw = dims?.w || 64;
      const th = dims?.h || 64;

      // From EDuke32 Polymer renderer (polymer.cpp line 3382-3383):
      // u = ((dist * 8 * xrepeat) + xpanning) / tileWidth
      // v = -(yref + vertex_y*16) / (tileHeight * 2048 / yrepeat) + ypancoef
      const uRepeat = (xr || 8) * 8 / tw;
      const vRepeat = heightZ * (yr || 8) / (th * 2048);
      const uOff = xpan / tw;
      const vOff = ypan / (th * 256 / (yr || 8));

      // Two triangles for the quad
      // Tri 1: TL, TR, BR
      uvs.push(uOff, vOff,  uRepeat + uOff, vOff,  uRepeat + uOff, vRepeat + vOff);
      // Tri 2: TL, BR, BL
      uvs.push(uOff, vOff,  uRepeat + uOff, vRepeat + vOff,  uOff, vRepeat + vOff);

      picnums.push(picnum, picnum);
      // 6 vertices per quad, all same shade
      for (let s = 0; s < 6; s++) shades.push(shade);
    }

    if (wall.nextSector < 0) {
      // Solid wall: full height from ceiling to floor
      const heightZ = Math.abs(sector.ceilingZ - sector.floorZ);
      pushQuad(
        x1, -ceilZ1, y1,  x2, -ceilZ2, y2,
        x2, -floorZ2, y2,  x1, -floorZ1, y1,
        wall.picnum, wall.xRepeat, wall.yRepeat, heightZ, wall.shade, wall.xPanning, wall.yPanning,
      );
    } else {
      const adjSector = map.sectors[wall.nextSector];
      const adjFirstWall = map.walls[adjSector.wallPtr];

      const adjCeilZ1 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjCeilZ2 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);
      const adjFloorZ1 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjFloorZ2 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);

      // EDuke32 polymer.cpp lines 3654-3660: skip upper/lower walls
      // when both sectors have parallax ceiling/floor (both open to sky)
      const bothParallaxCeil = (sector.ceilingStat & 1) && (adjSector.ceilingStat & 1);
      const bothParallaxFloor = (sector.floorStat & 1) && (adjSector.floorStat & 1);

      if (!bothParallaxCeil && (ceilZ1 < adjCeilZ1 || ceilZ2 < adjCeilZ2)) {
        // Upper wall: height from our ceiling to adjacent ceiling
        const heightZ = Math.abs(sector.ceilingZ - adjSector.ceilingZ);
        const pic = wall.picnum;
        pushQuad(
          x1, -ceilZ1, y1,  x2, -ceilZ2, y2,
          x2, -adjCeilZ2, y2,  x1, -adjCeilZ1, y1,
          pic, wall.xRepeat, wall.yRepeat, heightZ, wall.shade, wall.xPanning, wall.yPanning,
        );
      }
      if (!bothParallaxFloor && (floorZ1 > adjFloorZ1 || floorZ2 > adjFloorZ2)) {
        // Lower wall: height from adjacent floor to our floor
        const heightZ = Math.abs(adjSector.floorZ - sector.floorZ);
        pushQuad(
          x1, -adjFloorZ1, y1,  x2, -adjFloorZ2, y2,
          x2, -floorZ2, y2,  x1, -floorZ1, y1,
          wall.picnum, wall.xRepeat, wall.yRepeat, heightZ, wall.shade, wall.xPanning, wall.yPanning,
        );
      }

      // Masked wall (cstat bit 4) or 1-way wall (cstat bit 5):
      // render the portal opening with overPicnum
      if (wall.cstat & (16 | 32)) {
        const maskTop1 = Math.max(-adjCeilZ1, -ceilZ1);
        const maskTop2 = Math.max(-adjCeilZ2, -ceilZ2);
        const maskBot1 = Math.min(-adjFloorZ1, -floorZ1);
        const maskBot2 = Math.min(-adjFloorZ2, -floorZ2);
        if (maskTop1 > maskBot1 || maskTop2 > maskBot2) {
          const maskPic = wall.overPicnum || wall.picnum;
          const heightZ = Math.abs(
            Math.max(adjSector.ceilingZ, sector.ceilingZ) -
            Math.min(adjSector.floorZ, sector.floorZ)
          );
          pushQuad(
            x1, maskTop1, y1,  x2, maskTop2, y2,
            x2, maskBot2, y2,  x1, maskBot1, y1,
            maskPic, wall.xRepeat, wall.yRepeat, heightZ, wall.shade, wall.xPanning, wall.yPanning,
          );
        }
      }
    }
  }

  return { positions, uvs, picnums, shades };
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
): { positions: number[]; uvs: number[]; picnum: number; shade: number; triCount: number } {
  const positions: number[] = [];
  const uvs: number[] = [];
  const verts: [number, number, number][] = [];
  // Keep map-unit coords for UV computation
  const mapCoords: [number, number][] = [];
  const firstWall = map.walls[sector.wallPtr];
  const heinum = isCeiling ? sector.ceilingHeinum : sector.floorHeinum;
  const baseZ = isCeiling ? sector.ceilingZ : sector.floorZ;
  const picnum = isCeiling ? sector.ceilingPicnum : sector.floorPicnum;
  const stat = isCeiling ? sector.ceilingStat : sector.floorStat;

  const dims = getDims(picnum);
  const tw = dims?.w || 64;
  const th = dims?.h || 64;

  // Stat bit 3 (8): double expand — use 8 instead of 16 as scale divisor
  const scaleCoef = (stat & 8) ? 8 : 16;

  // Relative alignment (stat bit 6): compute rotation from first wall angle
  // From EDuke32 polymer.cpp lines 2746-2749
  let secAngCos = 0;
  let secAngSin = 0;
  let useRelative = false;
  if (stat & 64) {
    useRelative = true;
    const fw = map.walls[sector.wallPtr];
    const fw2 = map.walls[fw.point2];
    const dx = fw2.x - fw.x;
    const dy = fw2.y - fw.y;
    const arctan = Math.atan2(dy, dx) + Math.PI / 2;
    secAngCos = Math.cos(arctan);
    secAngSin = Math.sin(arctan);
  }

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

      // UV calculation from EDuke32 polymer.cpp lines 2784-2832
      let tex: number;
      let tey: number;

      if (useRelative) {
        // Relative to first wall: rotate coords around first wall position
        const xp = mapCoords[idx][0] - map.walls[sector.wallPtr].x;
        const yp = map.walls[sector.wallPtr].y - mapCoords[idx][1];
        tex = xp * secAngSin + yp * secAngCos;
        tey = xp * secAngCos - yp * secAngSin;
      } else {
        tex = mapCoords[idx][0];
        tey = -mapCoords[idx][1]; // EDuke32: tey = -wal->y
      }

      // Stat bit 2 (4): swap XY axes (90° rotation)
      if (stat & 4) { const tmp = tex; tex = tey; tey = tmp; }

      // Stat bit 4 (16): flip X
      if (stat & 16) tex = -tex;

      // Stat bit 5 (32): flip Y
      if (stat & 32) tey = -tey;

      uvs.push(
        tex / (tw * scaleCoef),
        tey / (th * scaleCoef),
      );
    }
  }

  const triCount = Math.max(0, verts.length - 2);
  const shade = isCeiling ? sector.ceilingShade : sector.floorShade;
  return { positions, uvs, picnum, shade, triCount };
}

export function buildLevelGeometry(map: BuildMap, getDims: GetTileDims): LevelGeometry {
  const allWallPos: number[] = [];
  const allWallUvs: number[] = [];
  const allWallPicnums: number[] = [];
  const allWallShades: number[] = [];
  const allFloorPos: number[] = [];
  const allFloorUvs: number[] = [];
  const allFloorPicnums: number[] = [];
  const allFloorShades: number[] = [];
  const allCeilPos: number[] = [];
  const allCeilUvs: number[] = [];
  const allCeilPicnums: number[] = [];
  const allCeilShades: number[] = [];

  // Find parallax sky tile (first parallax ceiling sector)
  let skyPicnum = -1;
  for (const sector of map.sectors) {
    if ((sector.ceilingStat & 1) && skyPicnum < 0) {
      skyPicnum = sector.ceilingPicnum;
    }
  }

  for (const sector of map.sectors) {
    const wallData = buildSectorWalls(sector, map, getDims);
    allWallPos.push(...wallData.positions);
    allWallUvs.push(...wallData.uvs);
    allWallPicnums.push(...wallData.picnums);
    allWallShades.push(...wallData.shades);

    // Skip parallax sectors — bit 0 of ceilingStat/floorStat means parallax sky
    if (!(sector.floorStat & 1)) {
      const floorData = triangulateSector(sector, map, false, getDims);
      allFloorPos.push(...floorData.positions);
      allFloorUvs.push(...floorData.uvs);
      for (let t = 0; t < floorData.triCount; t++) {
        allFloorPicnums.push(floorData.picnum);
        // 3 vertices per triangle, all same shade
        for (let v = 0; v < 3; v++) allFloorShades.push(floorData.shade);
      }
    }

    if (!(sector.ceilingStat & 1)) {
      const ceilData = triangulateSector(sector, map, true, getDims);
      allCeilPos.push(...ceilData.positions);
      allCeilUvs.push(...ceilData.uvs);
      for (let t = 0; t < ceilData.triCount; t++) {
        allCeilPicnums.push(ceilData.picnum);
        for (let v = 0; v < 3; v++) allCeilShades.push(ceilData.shade);
      }
    }
  }

  function makeGeo(pos: number[], uv: number[], shade: number[]) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    if (uv.length > 0) {
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    }
    if (shade.length > 0) {
      geo.setAttribute("shade", new THREE.Float32BufferAttribute(shade, 1));
    }
    geo.computeVertexNormals();
    return geo;
  }

  const walls = makeGeo(allWallPos, allWallUvs, allWallShades);
  const floors = makeGeo(allFloorPos, allFloorUvs, allFloorShades);
  const ceilings = makeGeo(allCeilPos, allCeilUvs, allCeilShades);

  const sprites = map.sprites.map((s) => ({
    x: s.x * XY_SCALE,
    y: -s.z * Z_SCALE,
    z: s.y * XY_SCALE,
    picnum: s.picnum,
    ang: s.ang,
    xRepeat: s.xRepeat,
    yRepeat: s.yRepeat,
    xOffset: s.xOffset,
    yOffset: s.yOffset,
    cstat: s.cstat,
    shade: s.shade,
  }));

  return { walls, floors, ceilings, wallPicnums: allWallPicnums, floorPicnums: allFloorPicnums, ceilingPicnums: allCeilPicnums, sprites, skyPicnum };
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
