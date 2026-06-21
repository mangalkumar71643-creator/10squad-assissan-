import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

useGLTF.preload("/assets/hacker-girl.glb");

export default function HackerGirlCharacter() {
  const { scene } = useGLTF("/assets/hacker-girl.glb");
  const rootRef = useRef<THREE.Group>(null);

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  useFrame(() => {
    if (!rootRef.current) return;
    const t = performance.now() / 1000;
    rootRef.current.position.y = Math.sin(t * 1.1) * 0.013;
    rootRef.current.rotation.y = Math.sin(t * 0.35) * 0.06;
  });

  return (
    <group ref={rootRef}>
      <primitive object={scene} />
    </group>
  );
}
