import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

useGLTF.preload("/assets/purple-mirage-rifle.glb");

const BASE_Y = 1.22;

export default function RifleInHands() {
  const { scene } = useGLTF("/assets/purple-mirage-rifle.glb");
  const pivotRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!innerRef.current) return;

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.62 / maxDim;

    innerRef.current.scale.setScalar(scale);
    innerRef.current.position.set(
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
        if (c.b > 0.4 && c.r > 0.2) {
          mat.emissive.set("#7722cc");
          mat.emissiveIntensity = 2.2;
        }
        if (c.r + c.g + c.b > 2.0) {
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
    if (!pivotRef.current) return;
    const t = performance.now() / 1000;
    pivotRef.current.position.y = BASE_Y + Math.sin(t * 1.1) * 0.018;
    pivotRef.current.rotation.y = Math.sin(t * 0.32) * 0.06;
  });

  return (
    <group
      ref={pivotRef}
      position={[0.12, BASE_Y, 0.26]}
      rotation={[-0.12, -0.42, 0.12]}
    >
      <group ref={innerRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
