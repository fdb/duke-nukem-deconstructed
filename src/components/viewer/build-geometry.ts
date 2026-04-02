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
  sprites: { x: number; y: number; z: number; picnum: number; xRepeat: number; yRepeat: number; cstat: number }[];
}

function buildSectorWalls(
  sector: BuildSector,
  map: BuildMap,
): number[] {
  const positions: number[] = [];
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
      // Solid wall — full quad (2 triangles)
      positions.push(
        x1, -ceilZ1, y1,  x2, -ceilZ2, y2,  x2, -floorZ2, y2,
        x1, -ceilZ1, y1,  x2, -floorZ2, y2,  x1, -floorZ1, y1,
      );
    } else {
      const adjSector = map.sectors[wall.nextSector];
      const adjFirstWall = map.walls[adjSector.wallPtr];

      const adjCeilZ1 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjCeilZ2 = getSlopeZ(adjSector.ceilingZ, adjSector.ceilingHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);
      const adjFloorZ1 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, wall.x, wall.y, adjFirstWall, map.walls);
      const adjFloorZ2 = getSlopeZ(adjSector.floorZ, adjSector.floorHeinum, nextWall.x, nextWall.y, adjFirstWall, map.walls);

      // Upper wall
      if (ceilZ1 < adjCeilZ1 || ceilZ2 < adjCeilZ2) {
        positions.push(
          x1, -ceilZ1, y1,  x2, -ceilZ2, y2,  x2, -adjCeilZ2, y2,
          x1, -ceilZ1, y1,  x2, -adjCeilZ2, y2,  x1, -adjCeilZ1, y1,
        );
      }
      // Lower wall
      if (floorZ1 > adjFloorZ1 || floorZ2 > adjFloorZ2) {
        positions.push(
          x1, -adjFloorZ1, y1,  x2, -adjFloorZ2, y2,  x2, -floorZ2, y2,
          x1, -adjFloorZ1, y1,  x2, -floorZ2, y2,  x1, -floorZ1, y1,
        );
      }
    }
  }

  return positions;
}

function triangulateSector(
  sector: BuildSector,
  map: BuildMap,
  isCeiling: boolean,
): number[] {
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

  return positions;
}

export function buildLevelGeometry(map: BuildMap): LevelGeometry {
  const allWallPos: number[] = [];
  const allFloorPos: number[] = [];
  const allCeilPos: number[] = [];

  for (const sector of map.sectors) {
    allWallPos.push(...buildSectorWalls(sector, map));
    allFloorPos.push(...triangulateSector(sector, map, false));
    allCeilPos.push(...triangulateSector(sector, map, true));
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

  return { walls, floors, ceilings, sprites };
}
