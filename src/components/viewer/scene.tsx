import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { buildLevelGeometry } from "./build-geometry";
import { FlyCamera } from "./fly-camera";
import type { BuildMap } from "../../lib/types";

interface ViewerSceneProps {
  map: BuildMap;
  wireframe: boolean;
  onPositionChange?: (pos: THREE.Vector3) => void;
}

const Z_SCALE = 1 / 8192;
const XY_SCALE = 1 / 512;

export function ViewerScene({ map, wireframe, onPositionChange }: ViewerSceneProps) {
  const geometry = useMemo(() => buildLevelGeometry(map), [map]);

  const material = useMemo(
    () =>
      wireframe
        ? new THREE.MeshBasicMaterial({ color: "#f97316", wireframe: true })
        : new THREE.MeshStandardMaterial({ color: "#a1a1aa", side: THREE.DoubleSide, roughness: 0.9 }),
    [wireframe],
  );

  const startPos: [number, number, number] = [
    map.playerStart.x * XY_SCALE,
    -map.playerStart.z * Z_SCALE,
    map.playerStart.y * XY_SCALE,
  ];

  return (
    <Canvas
      className="!absolute inset-0"
      camera={{ fov: 75, near: 0.1, far: 5000 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#09090b"]} />
      {!wireframe && (
        <>
          <ambientLight intensity={0.6} />
          <directionalLight position={[50, 100, 50]} intensity={0.8} />
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
