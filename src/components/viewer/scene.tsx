import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildLevelGeometry, assignAtlasRects } from "./build-geometry";
import { buildTextureAtlas } from "./texture-atlas";
import { FlyCamera } from "./fly-camera";
import { Sprites } from "./sprites";
import { Sky } from "./sky";
import type { BuildMap, ArtTile } from "../../lib/types";

interface ViewerSceneProps {
  map: BuildMap;
  wireframe: boolean;
  showSprites: boolean;
  renderTile: (picnum: number) => Uint8Array | undefined;
  getTile: (picnum: number) => ArtTile | undefined;
  onPositionChange?: (pos: THREE.Vector3) => void;
}

const Z_SCALE = 1 / 8192;
const XY_SCALE = 1 / 512;

/** Custom shader that tiles textures within atlas sub-rects using fract() */
/** Shader that tiles textures within atlas sub-rects and applies Build engine shade */
function makeAtlasMaterial(atlas: THREE.DataTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      atlas: { value: atlas },
    },
    vertexShader: `
      attribute vec4 atlasRect;
      attribute float shade;
      varying vec2 vUv;
      varying vec4 vAtlasRect;
      varying float vShade;

      void main() {
        vUv = uv;
        vAtlasRect = atlasRect;
        vShade = shade;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D atlas;
      varying vec2 vUv;
      varying vec4 vAtlasRect;
      varying float vShade;

      void main() {
        vec2 tiledUV = vAtlasRect.xy + fract(vUv) * vAtlasRect.zw;
        vec4 texColor = texture2D(atlas, tiledUV);

        if (texColor.a < 0.1) discard;

        // Build engine shade: 0 = brightest, positive = darker, negative = overbright
        // numShades is typically 32, shade range is roughly -8 to 31
        float brightness = clamp(1.0 - vShade / 30.0, 0.05, 1.5);
        gl_FragColor = vec4(texColor.rgb * brightness, texColor.a);
      }
    `,
    side: THREE.DoubleSide,
  });
}

/**
 * Compute animated tile picnum offset using Build engine formula.
 * From EDuke32 engine.cpp animateoffs():
 *   OSC (1): ping-pong between 0 and num
 *   FWD (2): loop 0 to num
 *   BACK (3): loop 0 to -num
 */
function animateoffs(animFrames: number, animType: number, animSpeed: number, totalClock: number): number {
  if (animFrames <= 0 || animType === 0) return 0;
  const i = (totalClock >> animSpeed) >>> 0;
  switch (animType) {
    case 1: { // oscillate
      const k = i % (animFrames * 2);
      return k < animFrames ? k : animFrames * 2 - k;
    }
    case 2: return i % (animFrames + 1); // forward
    case 3: return -(i % (animFrames + 1)); // backward
    default: return 0;
  }
}

/** Component that updates atlas rects for animated tiles each frame */
function AnimatedGeometry({
  geometry, picnums, uvLookup, material, getTile,
}: {
  geometry: THREE.BufferGeometry;
  picnums: number[];
  uvLookup: Map<number, { x: number; y: number; w: number; h: number }>;
  material: THREE.Material;
  getTile: (picnum: number) => ArtTile | undefined;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const clockRef = useRef(0);

  // Find which triangles have animated tiles
  const animInfo = useMemo(() => {
    const info: { triIdx: number; basePicnum: number; tile: ArtTile }[] = [];
    for (let tri = 0; tri < picnums.length; tri++) {
      const tile = getTile(picnums[tri]);
      if (tile && tile.animFrames > 0 && tile.animType !== 0) {
        info.push({ triIdx: tri, basePicnum: picnums[tri], tile });
      }
    }
    return info;
  }, [picnums, getTile]);

  useFrame((_, delta) => {
    if (!meshRef.current || animInfo.length === 0) return;
    // Build engine runs at 120 ticks/sec
    clockRef.current += delta * 120;
    const totalClock = Math.floor(clockRef.current);

    const atlasRect = meshRef.current.geometry.getAttribute("atlasRect") as THREE.BufferAttribute;
    let changed = false;

    for (const { triIdx, basePicnum, tile } of animInfo) {
      const offs = animateoffs(tile.animFrames, tile.animType, tile.animSpeed, totalClock);
      const animPicnum = basePicnum + offs;
      const rect = uvLookup.get(animPicnum);
      if (!rect) continue;

      for (let v = 0; v < 3; v++) {
        const vi = triIdx * 3 + v;
        atlasRect.setXYZW(vi, rect.x, rect.y, rect.w, rect.h);
      }
      changed = true;
    }

    if (changed) atlasRect.needsUpdate = true;
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}

export function ViewerScene({ map, wireframe, showSprites, renderTile, getTile, onPositionChange }: ViewerSceneProps) {
  const getDims = useMemo(
    () => (picnum: number) => {
      const t = getTile(picnum);
      return t ? { w: t.width, h: t.height } : undefined;
    },
    [getTile],
  );

  const { geometry, atlasMaterial, atlasTexture, uvLookup, skyPicnum } = useMemo(() => {
    const geo = buildLevelGeometry(map, getDims);

    // Collect all picnums including sprites, sky tiles, and animation frames
    const spritePicnums = geo.sprites.map((s) => s.picnum);
    const skyPicnums: number[] = [];
    if (geo.skyPicnum >= 0) {
      for (let i = 0; i < 8; i++) skyPicnums.push(geo.skyPicnum + i);
    }
    const basePicnums = [
      ...geo.wallPicnums,
      ...geo.floorPicnums,
      ...geo.ceilingPicnums,
      ...spritePicnums,
      ...skyPicnums,
    ];

    // Add all animation frame picnums to ensure they're in the atlas
    const animPicnums: number[] = [];
    for (const picnum of new Set(basePicnums)) {
      const tile = getTile(picnum);
      if (tile && tile.animFrames > 0 && tile.animType !== 0) {
        for (let f = -tile.animFrames; f <= tile.animFrames; f++) {
          if (f !== 0) animPicnums.push(picnum + f);
        }
      }
    }
    const allPicnums = [...basePicnums, ...animPicnums];

    const { texture, uvLookup: lookup } = buildTextureAtlas(allPicnums, renderTile, getDims);

    assignAtlasRects(geo.walls, geo.wallPicnums, lookup);
    assignAtlasRects(geo.floors, geo.floorPicnums, lookup);
    assignAtlasRects(geo.ceilings, geo.ceilingPicnums, lookup);

    return {
      geometry: geo,
      atlasMaterial: makeAtlasMaterial(texture),
      atlasTexture: texture,
      uvLookup: lookup,
      skyPicnum: geo.skyPicnum,
    };
  }, [map, renderTile, getDims]);

  const wireframeMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#f97316", wireframe: true }),
    [],
  );

  const material = wireframe ? wireframeMaterial : atlasMaterial;

  const startPos = useMemo<[number, number, number]>(
    () => [
      map.playerStart.x * XY_SCALE,
      -map.playerStart.z * Z_SCALE,
      map.playerStart.y * XY_SCALE,
    ],
    [map],
  );

  return (
    <Canvas
      className="!absolute inset-0"
      camera={{ fov: 75, near: 0.1, far: 5000 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#09090b"]} />
      {wireframe ? (
        <>
          <mesh geometry={geometry.walls} material={material} />
          <mesh geometry={geometry.floors} material={material} />
          <mesh geometry={geometry.ceilings} material={material} />
        </>
      ) : (
        <>
          <AnimatedGeometry geometry={geometry.walls} picnums={geometry.wallPicnums} uvLookup={uvLookup} material={atlasMaterial} getTile={getTile} />
          <AnimatedGeometry geometry={geometry.floors} picnums={geometry.floorPicnums} uvLookup={uvLookup} material={atlasMaterial} getTile={getTile} />
          <AnimatedGeometry geometry={geometry.ceilings} picnums={geometry.ceilingPicnums} uvLookup={uvLookup} material={atlasMaterial} getTile={getTile} />
        </>
      )}

      {skyPicnum >= 0 && !wireframe && (
        <Sky skyPicnum={skyPicnum} atlas={atlasTexture} uvLookup={uvLookup} />
      )}

      {showSprites && (
        <Sprites
          sprites={geometry.sprites}
          atlas={atlasTexture}
          uvLookup={uvLookup}
          wireframe={wireframe}
          getTile={getTile}
        />
      )}

      <FlyCamera startPos={startPos} startAngle={map.playerStart.ang} speed={3} onPositionChange={onPositionChange} />
    </Canvas>
  );
}
