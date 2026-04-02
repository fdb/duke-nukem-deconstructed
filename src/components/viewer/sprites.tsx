import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LevelGeometry } from "./build-geometry";

interface SpritesProps {
  sprites: LevelGeometry["sprites"];
  atlas: THREE.DataTexture;
  uvLookup: Map<number, { x: number; y: number; w: number; h: number }>;
  wireframe: boolean;
}

// From EDuke32 polymer.cpp lines 3982-3999:
// Face-camera: xratio = xrepeat * 0.20, yratio = yrepeat * 0.25
// Wall/floor:  xratio = xrepeat * 0.25, yratio = yrepeat * 0.25
// World size = tileSize * ratio, then convert to our Three.js scale (/512)

const CSTAT_ALIGNMENT_MASK = (1 << 4) | (1 << 5);
const CSTAT_WALL = 1 << 4;
const CSTAT_FLOOR = 1 << 5;

/** Custom shader for sprites — samples atlas rect, no tiling needed */
function makeSpriteMaterial(atlas: THREE.DataTexture) {
  return new THREE.ShaderMaterial({
    uniforms: {
      atlas: { value: atlas },
    },
    vertexShader: `
      attribute vec4 atlasRect;
      varying vec2 vUv;
      varying vec4 vAtlasRect;

      void main() {
        vUv = uv;
        vAtlasRect = atlasRect;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D atlas;
      varying vec2 vUv;
      varying vec4 vAtlasRect;

      void main() {
        vec2 texUV = vAtlasRect.xy + vUv * vAtlasRect.zw;
        vec4 texColor = texture2D(atlas, texUV);
        if (texColor.a < 0.1) discard;
        gl_FragColor = texColor;
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
}

function SpriteQuad({
  sprite,
  uvRect,
  tileDims,
  material,
}: {
  sprite: LevelGeometry["sprites"][0];
  uvRect: { x: number; y: number; w: number; h: number };
  tileDims: { w: number; h: number };
  material: THREE.ShaderMaterial;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const alignment = sprite.cstat & CSTAT_ALIGNMENT_MASK;
  const isFacing = alignment === 0;

  // Compute size from EDuke32 Polymer formulas
  const xRatio = isFacing ? sprite.xRepeat * 0.20 : sprite.xRepeat * 0.25;
  const yRatio = sprite.yRepeat * 0.25;
  const worldW = (tileDims.w * xRatio) / 512;
  const worldH = (tileDims.h * yRatio) / 512;

  // Face-camera sprites rotate to face the camera each frame
  useFrame(({ camera }) => {
    if (!meshRef.current || !isFacing) return;
    meshRef.current.quaternion.copy(camera.quaternion);
  });

  // Build engine sprites: bottom edge at Z position by default,
  // centered if cstat & 128 (YCENTER). From Polymer vertsprite: y goes 0→1 (bottom→top).
  const yCentered = !!(sprite.cstat & 128);

  // Build geometry with atlas rect as attribute
  const geometry = new THREE.PlaneGeometry(worldW, worldH);

  // Shift geometry so bottom edge is at y=0 (not centered)
  // Unless YCENTER flag is set, then keep centered
  if (!yCentered && alignment !== CSTAT_FLOOR) {
    geometry.translate(0, worldH / 2, 0);
  }

  const rectAttr = new Float32Array(4 * 4); // 4 vertices × vec4
  for (let i = 0; i < 4; i++) {
    rectAttr[i * 4] = uvRect.x;
    rectAttr[i * 4 + 1] = uvRect.y;
    rectAttr[i * 4 + 2] = uvRect.w;
    rectAttr[i * 4 + 3] = uvRect.h;
  }
  geometry.setAttribute("atlasRect", new THREE.Float32BufferAttribute(rectAttr, 4));

  // Position and rotation
  const pos: [number, number, number] = [sprite.x, sprite.y, sprite.z];

  if (alignment === CSTAT_FLOOR) {
    // Floor-aligned: rotate to lie flat
    const ang = ((sprite.ang + 1024) & 2047) * (Math.PI * 2) / 2048;
    return (
      <mesh
        ref={meshRef}
        position={pos}
        rotation={[-Math.PI / 2, 0, -ang]}
        geometry={geometry}
        material={material}
      />
    );
  }

  if (alignment === CSTAT_WALL) {
    // Wall-aligned: rotate by sprite angle
    const ang = ((sprite.ang + 1024) & 2047) * (Math.PI * 2) / 2048;
    return (
      <mesh
        ref={meshRef}
        position={pos}
        rotation={[0, -ang, 0]}
        geometry={geometry}
        material={material}
      />
    );
  }

  // Face-camera (default)
  return (
    <mesh
      ref={meshRef}
      position={pos}
      geometry={geometry}
      material={material}
    />
  );
}

export function Sprites({ sprites, atlas, uvLookup, wireframe }: SpritesProps) {
  const material = new THREE.ShaderMaterial(makeSpriteMaterial(atlas));

  const wireframeMat = new THREE.MeshBasicMaterial({
    color: "#f97316",
    wireframe: true,
    side: THREE.DoubleSide,
  });

  return (
    <>
      {sprites.map((sprite, i) => {
        const rect = uvLookup.get(sprite.picnum);
        if (!rect) return null;

        // Get tile dims from atlas rect and atlas size (2048)
        const tileDims = {
          w: Math.round(rect.w * 2048),
          h: Math.round(rect.h * 2048),
        };
        if (tileDims.w === 0 || tileDims.h === 0) return null;

        if (wireframe) {
          const alignment = sprite.cstat & CSTAT_ALIGNMENT_MASK;
          const xRatio = alignment === 0 ? sprite.xRepeat * 0.20 : sprite.xRepeat * 0.25;
          const yRatio = sprite.yRepeat * 0.25;
          const w = (tileDims.w * xRatio) / 512;
          const h = (tileDims.h * yRatio) / 512;
          return (
            <mesh key={i} position={[sprite.x, sprite.y, sprite.z]}>
              <planeGeometry args={[w, h]} />
              <primitive object={wireframeMat} attach="material" />
            </mesh>
          );
        }

        return (
          <SpriteQuad
            key={i}
            sprite={sprite}
            uvRect={rect}
            tileDims={tileDims}
            material={material}
          />
        );
      })}
    </>
  );
}
