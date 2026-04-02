import * as THREE from "three";
import type { BuildMap, BuildSector, BuildWall } from "../../lib/types";

const Z_SCALE = 1 / 8192;
const XY_SCALE = 1 / 512;

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
  /** Picnum per triangle (2 triangles per wall quad) */
  wallPicnums: number[];
  floorPicnums: number[];
  ceilingPicnums: number[];
  sprites: { x: number; y: number; z: number; picnum: number; xRepeat: number; yRepeat: number; cstat: number }[];
}

function buildSectorWalls(
  sector: BuildSector,
  map: BuildMap,
): { positions: number[]; picnums: number[] } {
  const positions: number[] = [];
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

    if (wall.nextSector < 0) {
      positions.push(
        x1, -ceilZ1, y1,  x2, -ceilZ2, y2,  x2, -floorZ2, y2,
        x1, -ceilZ1, y1,  x2, -floorZ2, y2,  x1, -floorZ1, y1,
      );
      picnums.push(wall.picnum, wall.picnum);
    } else {
      const adjSector = map.sectors[wall.nextSector];
      const adjFirstWall = map.walls[adjSector.wallPtr];

      const adjCeilZ1 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjCeilZ2 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);
      const adjFloorZ1 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjFloorZ2 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);

      if (ceilZ1 < adjCeilZ1 || ceilZ2 < adjCeilZ2) {
        positions.push(
          x1, -ceilZ1, y1,  x2, -ceilZ2, y2,  x2, -adjCeilZ2, y2,
          x1, -ceilZ1, y1,  x2, -adjCeilZ2, y2,  x1, -adjCeilZ1, y1,
        );
        const pic = wall.overPicnum || wall.picnum;
        picnums.push(pic, pic);
      }
      if (floorZ1 > adjFloorZ1 || floorZ2 > adjFloorZ2) {
        positions.push(
          x1, -adjFloorZ1, y1,  x2, -adjFloorZ2, y2,  x2, -floorZ2, y2,
          x1, -adjFloorZ1, y1,  x2, -floorZ2, y2,  x1, -floorZ1, y1,
        );
        picnums.push(wall.picnum, wall.picnum);
      }
    }
  }

  return { positions, picnums };
}

function triangulateSector(
  sector: BuildSector,
  map: BuildMap,
  isCeiling: boolean,
): { positions: number[]; picnum: number; triCount: number } {
  const positions: number[] = [];
  const verts: [number, number, number][] = [];
  const firstWall = map.walls[sector.wallPtr];
  const heinum = isCeiling ? sector.ceilingHeinum : sector.floorHeinum;
  const baseZ = isCeiling ? sector.ceilingZ : sector.floorZ;

  for (let i = 0; i < sector.wallNum; i++) {
    const wall = map.walls[sector.wallPtr + i];
    const z = getSlopeZ(baseZ, heinum, wall.x, wall.y, firstWall, map.walls);
    verts.push([wall.x * XY_SCALE, -z, wall.y * XY_SCALE]);
  }

  for (let i = 1; i < verts.length - 1; i++) {
    if (isCeiling) {
      positions.push(...verts[0], ...verts[i + 1], ...verts[i]);
    } else {
      positions.push(...verts[0], ...verts[i], ...verts[i + 1]);
    }
  }

  const triCount = Math.max(0, verts.length - 2);
  const picnum = isCeiling ? sector.ceilingPicnum : sector.floorPicnum;

  return { positions, picnum, triCount };
}

export function buildLevelGeometry(map: BuildMap): LevelGeometry {
  const allWallPos: number[] = [];
  const allWallPicnums: number[] = [];
  const allFloorPos: number[] = [];
  const allFloorPicnums: number[] = [];
  const allCeilPos: number[] = [];
  const allCeilPicnums: number[] = [];

  for (const sector of map.sectors) {
    const wallData = buildSectorWalls(sector, map);
    allWallPos.push(...wallData.positions);
    allWallPicnums.push(...wallData.picnums);

    const floorData = triangulateSector(sector, map, false);
    allFloorPos.push(...floorData.positions);
    for (let t = 0; t < floorData.triCount; t++) allFloorPicnums.push(floorData.picnum);

    const ceilData = triangulateSector(sector, map, true);
    allCeilPos.push(...ceilData.positions);
    for (let t = 0; t < ceilData.triCount; t++) allCeilPicnums.push(ceilData.picnum);
  }

  const walls = new THREE.BufferGeometry();
  walls.setAttribute("position", new THREE.Float32BufferAttribute(allWallPos, 3));
  walls.computeVertexNormals();

  const floors = new THREE.BufferGeometry();
  floors.setAttribute("position", new THREE.Float32BufferAttribute(allFloorPos, 3));
  floors.computeVertexNormals();

  const ceilings = new THREE.BufferGeometry();
  ceilings.setAttribute("position", new THREE.Float32BufferAttribute(allCeilPos, 3));
  ceilings.computeVertexNormals();

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
 * Assign UV coordinates to a geometry based on per-triangle picnums
 * and an atlas UV lookup table.
 */
export function assignAtlasUVs(
  geometry: THREE.BufferGeometry,
  triPicnums: number[],
  uvLookup: Map<number, { x: number; y: number; w: number; h: number }>,
  mode: "wall" | "flat",
) {
  const posAttr = geometry.getAttribute("position");
  const vertCount = posAttr.count;
  const uvs = new Float32Array(vertCount * 2);

  for (let tri = 0; tri < triPicnums.length; tri++) {
    const picnum = triPicnums[tri];
    const rect = uvLookup.get(picnum);
    if (!rect) {
      // No texture — map to a tiny corner (will appear dark)
      for (let v = 0; v < 3; v++) {
        uvs[(tri * 3 + v) * 2] = 0;
        uvs[(tri * 3 + v) * 2 + 1] = 0;
      }
      continue;
    }

    if (mode === "wall") {
      // Wall quads: triangles come in pairs (2 tris per quad)
      // Tri 0: top-left, top-right, bottom-right → (0,0), (1,0), (1,1)
      // Tri 1: top-left, bottom-right, bottom-left → (0,0), (1,1), (0,1)
      const isFirst = tri % 2 === 0;
      const baseVert = tri * 3;
      if (isFirst) {
        uvs[baseVert * 2] = rect.x;                  uvs[baseVert * 2 + 1] = rect.y;
        uvs[(baseVert + 1) * 2] = rect.x + rect.w;   uvs[(baseVert + 1) * 2 + 1] = rect.y;
        uvs[(baseVert + 2) * 2] = rect.x + rect.w;   uvs[(baseVert + 2) * 2 + 1] = rect.y + rect.h;
      } else {
        uvs[baseVert * 2] = rect.x;                  uvs[baseVert * 2 + 1] = rect.y;
        uvs[(baseVert + 1) * 2] = rect.x + rect.w;   uvs[(baseVert + 1) * 2 + 1] = rect.y + rect.h;
        uvs[(baseVert + 2) * 2] = rect.x;             uvs[(baseVert + 2) * 2 + 1] = rect.y + rect.h;
      }
    } else {
      // Flat (floor/ceiling): use world-space XZ projected into the tile rect
      // Get the triangle's vertex positions and map them
      const baseVert = tri * 3;
      for (let v = 0; v < 3; v++) {
        const vi = baseVert + v;
        const wx = posAttr.getX(vi); // world X
        const wz = posAttr.getZ(vi); // world Z
        // Tile every ~4 world units (adjustable)
        const u = ((wx % 4) / 4 + 1) % 1;
        const vCoord = ((wz % 4) / 4 + 1) % 1;
        uvs[vi * 2] = rect.x + u * rect.w;
        uvs[vi * 2 + 1] = rect.y + vCoord * rect.h;
      }
    }
  }

  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
}
