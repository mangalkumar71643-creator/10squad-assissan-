import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

useGLTF.preload("/assets/purple-mirage-rifle.glb");

export default function PurpleMirageRifle() {
  const { scene } = useGLTF("/assets/purple-mirage-rifle.glb");
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 1.4 / maxDim;

    groupRef.current.scale.setScalar(scale);
    groupRef.current.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    );

    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.frustumCulled = false;

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        mat.needsUpdate = true;

        const c = mat.color;
        const isPurplish = c.b > 0.4 && c.r > 0.2;
        if (isPurplish) {
          mat.emissive.set("#7722cc");
          mat.emissiveIntensity = 2.2;
        }
        const isBright = c.r + c.g + c.b > 2.0;
        if (isBright) {
          mat.emissive.set("#cc88ff");
          mat.emissiveIntensity = 1.5;
        }
        if (mat.emissiveMap) {
          mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 2.0);
        }
      });
    });
  }, [scene]);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += 0.008;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
