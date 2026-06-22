import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

useGLTF.preload("/assets/ninja-x.glb");

export default function NinjaXCharacter() {
  const { scene } = useGLTF("/assets/ninja-x.glb");
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

    const totalVolume = size.x * size.y * size.z;
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
      const isTiny = meshVolume < totalVolume * 0.001;
      if (isAboveHead && isTiny) {
        mesh.visible = false;
        return;
      }

      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        mat.needsUpdate = true;

        if (mat.emissiveMap) {
          mat.emissiveIntensity = 3.5;
        }

        const emC = mat.emissive;
        if (emC.r + emC.g + emC.b > 0.05) {
          mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 3.0);
        }

        const c = mat.color;

        const isCyanish = c.b > 0.5 && c.r < 0.4 && c.g > 0.4;
        if (isCyanish) {
          mat.emissive.set("#00ccff");
          mat.emissiveIntensity = 3.5;
        }

        const isPurplish = c.b > 0.5 && c.r > 0.3 && c.g < 0.3;
        if (isPurplish) {
          mat.emissive.set("#aa44ff");
          mat.emissiveIntensity = 3.0;
        }

        const isNeonGreen = c.g > 0.6 && c.r < 0.3 && c.b < 0.3;
        if (isNeonGreen) {
          mat.emissive.set("#00ff88");
          mat.emissiveIntensity = 3.5;
        }
      });
    });
  }, [scene]);

  useFrame(() => {
    if (!rootRef.current) return;
    const t = performance.now() / 1000;
    rootRef.current.position.y = Math.sin(t * 1.1) * 0.018;
    rootRef.current.rotation.y = Math.sin(t * 0.32) * 0.06;
  });

  return (
    <group ref={rootRef}>
      <group ref={pivotRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
