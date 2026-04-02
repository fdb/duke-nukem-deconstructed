import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { LevelGeometry } from "./build-geometry";
import type { ArtTile } from "../../lib/types";

interface SpritesProps {
  sprites: LevelGeometry["sprites"];
  atlas: THREE.DataTexture;
  uvLookup: Map<number, { x: number; y: number; w: number; h: number }>;
  wireframe: boolean;
  getTile?: (picnum: number) => ArtTile | undefined;
}

const CSTAT_ALIGNMENT_MASK = (1 << 4) | (1 << 5);
const CSTAT_WALL = 1 << 4;
const CSTAT_FLOOR = 1 << 5;

/**
 * Batch all sprites into a single BufferGeometry for performance.
 * Face-camera sprites get updated each frame via the position attribute.
 */
export function Sprites({ sprites, atlas, uvLookup, wireframe, getTile }: SpritesProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, facingIndices } = useMemo(() => {
    // Filter visible sprites
    const visible = sprites.filter((s) => {
      if (s.cstat & 0x8000) return false;
      if (s.picnum < 11) return false;
      if (!uvLookup.has(s.picnum)) return false;
      const rect = uvLookup.get(s.picnum)!;
      return Math.round(rect.w * 2048) > 0 && Math.round(rect.h * 2048) > 0;
    });

    const positions: number[] = [];
    const uvs: number[] = [];
    const atlasRects: number[] = [];
    const facing: number[] = []; // indices of face-camera quads for billboard update

    for (let si = 0; si < visible.length; si++) {
      const sprite = visible[si];
      const rect = uvLookup.get(sprite.picnum)!;
      const tw = Math.round(rect.w * 2048);
      const th = Math.round(rect.h * 2048);
      const alignment = sprite.cstat & CSTAT_ALIGNMENT_MASK;
      const isFacing = alignment === 0;
      const isFloor = !!(alignment & CSTAT_FLOOR);
      const yCentered = !!(sprite.cstat & 128);

      // Flip bits from EDuke32 polymer.cpp lines 4034-4053
      const xflip = !!(sprite.cstat & 4);
      const yflip = !!(sprite.cstat & 8);
      const flipu = xflip !== isFloor; // XOR: floor sprites invert xflip
      const flipv = yflip && !isFloor; // floor sprites never flip V

      // Size from EDuke32 Polymer formulas
      const xRatio = isFacing ? sprite.xRepeat * 0.20 : sprite.xRepeat * 0.25;
      const yRatio = sprite.yRepeat * 0.25;
      const w = (tw * xRatio) / 512;
      const h = (th * yRatio) / 512;
      const halfW = w / 2;

      // picanm offsets + sprite offsets (EDuke32 polymer.cpp lines 4001-4013)
      const tile = getTile?.(sprite.picnum);
      const tileXOff = (tile?.xOffset ?? 0) + sprite.xOffset;
      const tileYOff = (tile?.yOffset ?? 0) + sprite.yOffset;
      let xOff = (tileXOff * xRatio) / 512;
      let yOff_picanm = (tileYOff * yRatio) / 512;

      // EDuke32: if flipu, negate xoff; if yflip && !face, negate yoff
      if (flipu) xOff = -xOff;
      if (yflip && !isFacing) yOff_picanm = -yOff_picanm;

      // Base position
      const px = sprite.x;
      const py = sprite.y;
      const pz = sprite.z;

      // Vertical offset: bottom at position unless YCENTER
      // EDuke32: yCentered face sprites adjust yoff, wall sprites use centeryoff
      let yOff = 0;
      let centeryoff = 0;
      if (yCentered && !isFloor) {
        if (isFacing) {
          yOff_picanm -= h / 2;
        } else {
          centeryoff = h / 2;
        }
      } else if (!isFloor) {
        yOff = h / 2;
      }

      if (alignment === CSTAT_FLOOR) {
        // Floor-aligned: quad lies flat in XZ plane
        // Sprite direction vector: positive sign (not negated like camera rotation.y)
        const ang = (sprite.ang * Math.PI * 2) / 2048 - Math.PI / 2;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);
        const halfH = h / 2;

        // Apply picanm offset in rotated space for floor sprites
        const floorPx = px - xOff * cos + yOff_picanm * sin;
        const floorPz = pz - xOff * sin - yOff_picanm * cos;

        // 4 corners rotated by ang in XZ plane
        const corners = [
          [-halfW, -halfH], [halfW, -halfH], [halfW, halfH], [-halfW, halfH],
        ];
        const rotated = corners.map(([cx, cz]) => [
          floorPx + cx * cos - cz * sin,
          py,
          floorPz + cx * sin + cz * cos,
        ]);

        // Two triangles
        for (const tri of [[0, 1, 2], [0, 2, 3]]) {
          for (const vi of tri) {
            positions.push(rotated[vi][0], rotated[vi][1], rotated[vi][2]);
          }
        }
        // UVs: apply flipu/flipv for floor sprites
        const fu0 = flipu ? 1 : 0, fu1 = flipu ? 0 : 1;
        const fv0 = flipv ? 1 : 0, fv1 = flipv ? 0 : 1;
        const uvCorners = [[fu0, fv1], [fu1, fv1], [fu1, fv0], [fu0, fv0]];
        for (const tri of [[0, 1, 2], [0, 2, 3]]) {
          for (const vi of tri) {
            uvs.push(uvCorners[vi][0], uvCorners[vi][1]);
          }
        }
      } else if (alignment === CSTAT_WALL) {
        // Wall-aligned: vertical quad rotated by sprite angle
        // Sprite direction = (sin(θ), -cos(θ)) in Build coords (engine_priv.h:384-385)
        // Using POSITIVE sign (not negated like camera rotation.y)
        const ang = (sprite.ang * Math.PI * 2) / 2048 - Math.PI / 2;
        const cos = Math.cos(ang);
        const sin = Math.sin(ang);

        // Apply picanm offset after rotation (EDuke32: glTranslatef(-xoff, yoff - centeryoff, 0) after glRotatef)
        const offPx = px - xOff * cos;
        const offPz = pz - xOff * sin;
        const offPy = py + yOff_picanm - centeryoff;

        // 4 corners of vertical quad, rotated around Y
        const bl = [offPx - halfW * cos, offPy + yOff - h / 2, offPz - halfW * sin];
        const br = [offPx + halfW * cos, offPy + yOff - h / 2, offPz + halfW * sin];
        const tr = [offPx + halfW * cos, offPy + yOff + h / 2, offPz + halfW * sin];
        const tl = [offPx - halfW * cos, offPy + yOff + h / 2, offPz - halfW * sin];

        // Two triangles
        for (const v of [tl, tr, br, tl, br, bl]) {
          positions.push(v[0], v[1], v[2]);
        }
        // UVs: With correct angle formula (positive sign), TL is at screen-LEFT
        // from the front view, so normal UV mapping (u=0 at TL) is correct.
        const u0 = flipu ? 1 : 0, u1 = flipu ? 0 : 1;
        const v0 = flipv ? 1 : 0, v1 = flipv ? 0 : 1;
        uvs.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
      } else {
        // Face-camera: initially oriented as a vertical quad facing -Z
        // Will be reoriented each frame
        const baseIdx = positions.length / 3;
        facing.push(baseIdx); // Track for billboard update

        // Apply picanm offset in world space (approximation — Polymer applies
        // in camera space via billboarding-as-wall-sprite, but our billboard
        // approach is different enough that world-space works better)
        const fpx = px - xOff;
        const fpy = py + yOff_picanm;

        const bl = [fpx - halfW, fpy + yOff - h / 2, pz];
        const br = [fpx + halfW, fpy + yOff - h / 2, pz];
        const tr = [fpx + halfW, fpy + yOff + h / 2, pz];
        const tl = [fpx - halfW, fpy + yOff + h / 2, pz];

        for (const v of [tl, tr, br, tl, br, bl]) {
          positions.push(v[0], v[1], v[2]);
        }
        // UVs: apply flipu/flipv for face sprites
        const fu0 = flipu ? 1 : 0, fu1 = flipu ? 0 : 1;
        const fv0 = flipv ? 1 : 0, fv1 = flipv ? 0 : 1;
        uvs.push(fu0, fv0, fu1, fv0, fu1, fv1, fu0, fv0, fu1, fv1, fu0, fv1);
      }

      // Atlas rect for all 6 vertices of this quad
      for (let v = 0; v < 6; v++) {
        atlasRects.push(rect.x, rect.y, rect.w, rect.h);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute("atlasRect", new THREE.Float32BufferAttribute(atlasRects, 4));

    // Store sprite data for billboard updates
    const facingData = facing.map((baseIdx) => {
      // Reconstruct center from tl and br (indices 0 and 2 of the 6 verts)
      const tlX = positions[baseIdx * 3];
      const tlY = positions[baseIdx * 3 + 1];
      const tlZ = positions[baseIdx * 3 + 2];
      const brX = positions[(baseIdx + 2) * 3];
      const brY = positions[(baseIdx + 2) * 3 + 1];
      const brZ = positions[(baseIdx + 2) * 3 + 2];
      return {
        baseIdx,
        cx: (tlX + brX) / 2,
        cy: (tlY + brY) / 2,
        cz: (tlZ + brZ) / 2,
        halfW: (brX - tlX) / 2,
        halfH: (tlY - brY) / 2,
      };
    });

    return { geometry: geo, facingIndices: facingData };
  }, [sprites, uvLookup, getTile]);

  // Update face-camera sprites each frame
  useFrame(({ camera }) => {
    if (!meshRef.current || facingIndices.length === 0) return;
    const posAttr = meshRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;

    // Get camera right and up vectors
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    right.crossVectors(forward, up).normalize();

    for (const { baseIdx, cx, cy, cz, halfW, halfH } of facingIndices) {
      // Quad verts: tl, tr, br, tl, br, bl (6 verts)
      const rx = right.x, rz = right.z;

      // Tri 1: TL, TR, BR — Tri 2: TL, BR, BL
      posAttr.setXYZ(baseIdx,     cx - halfW * rx, cy + halfH, cz - halfW * rz); // TL
      posAttr.setXYZ(baseIdx + 1, cx + halfW * rx, cy + halfH, cz + halfW * rz); // TR
      posAttr.setXYZ(baseIdx + 2, cx + halfW * rx, cy - halfH, cz + halfW * rz); // BR
      posAttr.setXYZ(baseIdx + 3, cx - halfW * rx, cy + halfH, cz - halfW * rz); // TL
      posAttr.setXYZ(baseIdx + 4, cx + halfW * rx, cy - halfH, cz + halfW * rz); // BR
      posAttr.setXYZ(baseIdx + 5, cx - halfW * rx, cy - halfH, cz - halfW * rz); // BL
    }

    posAttr.needsUpdate = true;
  });

  const material = useMemo(() => {
    if (wireframe) {
      return new THREE.MeshBasicMaterial({ color: "#f97316", wireframe: true, side: THREE.DoubleSide });
    }
    return new THREE.ShaderMaterial({
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
          if (texColor.a < 0.1) discard;
          gl_FragColor = texColor;
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -4,
    });
  }, [atlas, wireframe]);

  return <mesh ref={meshRef} geometry={geometry} material={material} />;
}
