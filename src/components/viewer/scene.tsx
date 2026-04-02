import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { buildLevelGeometry, assignAtlasUVs } from "./build-geometry";
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

export function ViewerScene({ map, wireframe, renderTile, getTile, onPositionChange }: ViewerSceneProps) {
  const { geometry, atlas } = useMemo(() => {
    const geo = buildLevelGeometry(map);

    // Collect all unique picnums
    const allPicnums = [
      ...geo.wallPicnums,
      ...geo.floorPicnums,
      ...geo.ceilingPicnums,
    ];

    const { texture, uvLookup } = buildTextureAtlas(
      allPicnums,
      renderTile,
      (picnum) => {
        const t = getTile(picnum);
        return t ? { width: t.width, height: t.height } : undefined;
      },
    );

    // Assign UVs to each geometry
    assignAtlasUVs(geo.walls, geo.wallPicnums, uvLookup, "wall");
    assignAtlasUVs(geo.floors, geo.floorPicnums, uvLookup, "flat");
    assignAtlasUVs(geo.ceilings, geo.ceilingPicnums, uvLookup, "flat");

    return { geometry: geo, atlas: texture };
  }, [map, renderTile, getTile]);

  const texturedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: atlas,
        side: THREE.DoubleSide,
        roughness: 0.9,
      }),
    [atlas],
  );

  const wireframeMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#f97316", wireframe: true }),
    [],
  );

  const material = wireframe ? wireframeMaterial : texturedMaterial;

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
      {!wireframe && (
        <>
          <ambientLight intensity={0.8} />
          <directionalLight position={[50, 100, 50]} intensity={0.5} />
        </>
      )}
      <mesh geometry={geometry.walls} material={material} />
      <mesh geometry={geometry.floors} material={material} />
      <mesh geometry={geometry.ceilings} material={material} />

      {geometry.sprites.map((sprite, i) => (
        <mesh key={i} position={[sprite.x, sprite.y, sprite.z]}>
          <planeGeometry args={[(sprite.xRepeat / 32) * 2, (sprite.yRepeat / 32) * 2]} />
          <meshBasicMaterial color="#f97316" wireframe={wireframe} transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}

      <FlyCamera startPos={startPos} startAngle={map.playerStart.ang} speed={8} onPositionChange={onPositionChange} />
    </Canvas>
  );
}
