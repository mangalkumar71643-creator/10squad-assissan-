import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

useGLTF.preload("/assets/hacker-girl.glb");

export default function HackerGirlCharacter() {
  const { scene } = useGLTF("/assets/hacker-girl.glb");
  const rootRef = useRef<THREE.Group>(null);
  const pivotRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!pivotRef.current) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const targetHeight = 1.8;
    const scale = targetHeight / size.y;

    pivotRef.current.scale.setScalar(scale);
    pivotRef.current.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale,
    );

    const meshBox = new THREE.Box3();
    const meshSize = new THREE.Vector3();
    const meshCenter = new THREE.Vector3();

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      meshBox.setFromObject(mesh);
      meshBox.getSize(meshSize);
      meshBox.getCenter(meshCenter);

      const meshVolume = meshSize.x * meshSize.y * meshSize.z;
      const isAboveHead = meshCenter.y > box.max.y * 0.92;
      const isTiny = meshVolume < size.x * size.y * size.z * 0.001;

      if (isAboveHead && isTiny) {
        mesh.visible = false;
        return;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
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
      <group ref={pivotRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
