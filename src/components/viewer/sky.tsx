import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SkyProps {
  skyPicnum: number;
  atlas: THREE.DataTexture;
  uvLookup: Map<number, { x: number; y: number; w: number; h: number }>;
}

const SKY_PANELS = 8;
const SKY_RADIUS = 200;
const SKY_HEIGHT = 120;

/**
 * Renders a parallax sky as an 8-panel cylinder that follows the camera.
 * Build engine skies use sequential tiles (base + 0..7) arranged in a circle.
 */
export function Sky({ skyPicnum, atlas, uvLookup }: SkyProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, material } = useMemo(() => {
    // Build the cylinder from 8 panels, each mapped to a sequential tile
    const positions: number[] = [];
    const uvs: number[] = [];
    const atlasRects: number[] = [];

    for (let i = 0; i < SKY_PANELS; i++) {
      const tileNum = skyPicnum + i;
      const rect = uvLookup.get(tileNum);
      if (!rect) continue;

      // Two angles defining this panel's arc
      const a0 = (i / SKY_PANELS) * Math.PI * 2;
      const a1 = ((i + 1) / SKY_PANELS) * Math.PI * 2;

      const x0 = Math.cos(a0) * SKY_RADIUS;
      const z0 = Math.sin(a0) * SKY_RADIUS;
      const x1 = Math.cos(a1) * SKY_RADIUS;
      const z1 = Math.sin(a1) * SKY_RADIUS;

      const yTop = SKY_HEIGHT / 2;
      const yBot = -SKY_HEIGHT / 2;

      // Two triangles per panel (facing inward — wound CCW from inside)
      // Tri 1: TL, TR, BL
      positions.push(x0, yTop, z0, x1, yTop, z1, x0, yBot, z0);
      // Tri 2: TR, BR, BL
      positions.push(x1, yTop, z1, x1, yBot, z1, x0, yBot, z0);

      // UVs: match new vertex order (TL, TR, BL) (TR, BR, BL)
      uvs.push(0, 0, 1, 0, 0, 1);
      uvs.push(1, 0, 1, 1, 0, 1);

      // Atlas rect for all 6 vertices
      for (let v = 0; v < 6; v++) {
        atlasRects.push(rect.x, rect.y, rect.w, rect.h);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("atlasRect", new THREE.Float32BufferAttribute(atlasRects, 4));

    const mat = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: atlas } },
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
          gl_FragColor = texColor;
        }
      `,
      side: THREE.FrontSide,
      depthWrite: false,
      depthTest: false,
    });

    return { geometry: geo, material: mat };
  }, [skyPicnum, atlas, uvLookup]);

  // Follow camera position each frame (sky is always centered on viewer)
  useFrame(({ camera }) => {
    if (meshRef.current) {
      meshRef.current.position.copy(camera.position);
    }
  });

  return <mesh ref={meshRef} geometry={geometry} material={material} renderOrder={-1} />;
}
