import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
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

    // Collect all picnums including sprites and sky tiles for the atlas
    const spritePicnums = geo.sprites.map((s) => s.picnum);
    const skyPicnums: number[] = [];
    if (geo.skyPicnum >= 0) {
      for (let i = 0; i < 8; i++) skyPicnums.push(geo.skyPicnum + i);
    }
    const allPicnums = [
      ...geo.wallPicnums,
      ...geo.floorPicnums,
      ...geo.ceilingPicnums,
      ...spritePicnums,
      ...skyPicnums,
    ];

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
      <mesh geometry={geometry.walls} material={material} />
      <mesh geometry={geometry.floors} material={material} />
      <mesh geometry={geometry.ceilings} material={material} />

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
