import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { buildLevelGeometry, assignAtlasRects } from "./build-geometry";
import { buildTextureAtlas } from "./texture-atlas";
import { FlyCamera } from "./fly-camera";
import type { BuildMap, ArtTile } from "../../lib/types";

interface ViewerSceneProps {
  map: BuildMap;
  wireframe: boolean;
  renderTile: (picnum: number) => Uint8Array | undefined;
  getTile: (picnum: number) => ArtTile | undefined;
  onPositionChange?: (pos: THREE.Vector3) => void;
}

const Z_SCALE = 1 / 8192;
const XY_SCALE = 1 / 512;

/** Custom shader that tiles textures within atlas sub-rects using fract() */
function makeAtlasMaterial(atlas: THREE.DataTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      atlas: { value: atlas },
      ambientIntensity: { value: 0.85 },
    },
    vertexShader: `
      attribute vec4 atlasRect;
      varying vec2 vUv;
      varying vec4 vAtlasRect;
      varying vec3 vNormal;

      void main() {
        vUv = uv;
        vAtlasRect = atlasRect;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D atlas;
      uniform float ambientIntensity;
      varying vec2 vUv;
      varying vec4 vAtlasRect;
      varying vec3 vNormal;

      void main() {
        // Tile within the atlas sub-rect using fract()
        vec2 tiledUV = vAtlasRect.xy + fract(vUv) * vAtlasRect.zw;
        vec4 texColor = texture2D(atlas, tiledUV);

        // Simple directional lighting
        vec3 lightDir = normalize(vec3(0.3, 1.0, 0.5));
        float diff = max(dot(vNormal, lightDir), 0.0) * (1.0 - ambientIntensity);
        float light = ambientIntensity + diff;

        // Discard fully transparent pixels
        if (texColor.a < 0.1) discard;

        gl_FragColor = vec4(texColor.rgb * light, texColor.a);
      }
    `,
    side: THREE.DoubleSide,
  });
}

export function ViewerScene({ map, wireframe, renderTile, getTile, onPositionChange }: ViewerSceneProps) {
  const getDims = useMemo(
    () => (picnum: number) => {
      const t = getTile(picnum);
      return t ? { w: t.width, h: t.height } : undefined;
    },
    [getTile],
  );

  const { geometry, atlasMaterial } = useMemo(() => {
    const geo = buildLevelGeometry(map, getDims);

    const allPicnums = [...geo.wallPicnums, ...geo.floorPicnums, ...geo.ceilingPicnums];

    const { texture, uvLookup } = buildTextureAtlas(allPicnums, renderTile, getDims);

    // Assign atlas rect per-vertex attribute
    assignAtlasRects(geo.walls, geo.wallPicnums, uvLookup);
    assignAtlasRects(geo.floors, geo.floorPicnums, uvLookup);
    assignAtlasRects(geo.ceilings, geo.ceilingPicnums, uvLookup);

    return { geometry: geo, atlasMaterial: makeAtlasMaterial(texture) };
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

      <FlyCamera startPos={startPos} startAngle={map.playerStart.ang} speed={3} onPositionChange={onPositionChange} />
    </Canvas>
  );
}
