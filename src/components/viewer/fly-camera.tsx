import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";

interface FlyCameraProps {
  startPos: [number, number, number];
  startAngle: number;
  speed?: number;
  onPositionChange?: (pos: THREE.Vector3) => void;
}

export function FlyCamera({ startPos, startAngle, speed = 5, onPositionChange }: FlyCameraProps) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const keys = useRef(new Set<string>());
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    camera.position.set(...startPos);
    const radians = (startAngle * Math.PI * 2) / 2048;
    camera.rotation.set(0, radians, 0);
  }, [startPos, startAngle, camera]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) { keys.current.add(e.code); }
    function onKeyUp(e: KeyboardEvent) { keys.current.delete(e.code); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const posRef = useRef({ x: 0, y: 0, z: 0 });

  useFrame((_, delta) => {
    const k = keys.current;
    const boost = k.has("ShiftLeft") || k.has("ShiftRight") ? 9 : 1;
    const s = speed * boost * delta;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();

    if (k.has("KeyW")) camera.position.addScaledVector(dir, s);
    if (k.has("KeyS")) camera.position.addScaledVector(dir, -s);
    if (k.has("KeyA")) camera.position.addScaledVector(right, -s);
    if (k.has("KeyD")) camera.position.addScaledVector(right, s);
    if (k.has("KeyQ") || k.has("Space")) camera.position.y += s;
    if (k.has("KeyE") || k.has("ControlLeft")) camera.position.y -= s;

    // Only call back if position actually changed (avoids re-render storm)
    const p = camera.position;
    if (
      Math.abs(p.x - posRef.current.x) > 0.01 ||
      Math.abs(p.y - posRef.current.y) > 0.01 ||
      Math.abs(p.z - posRef.current.z) > 0.01
    ) {
      posRef.current = { x: p.x, y: p.y, z: p.z };
      onPositionChange?.(p.clone());
    }
  });

  return <PointerLockControls ref={controlsRef} />;
}
