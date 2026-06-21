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

    // Match Nova's visual scale exactly
    const targetHeight = 1.8;
    const scale = targetHeight / size.y;

    pivotRef.current.scale.setScalar(scale);
    // feet at y=0, horizontally centered
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

        // Boost existing emissive maps (glowing armor lines)
        if (mat.emissiveMap) {
          mat.emissiveIntensity = 3.5;
        }

        // Boost already-glowing materials (non-black emissive)
        const emC = mat.emissive;
        if (emC.r + emC.g + emC.b > 0.05) {
          mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 3.0);
        }

        // Detect visor / yellow lens — force strong yellow emissive
        const c = mat.color;
        const isYellowish = c.r > 0.5 && c.g > 0.4 && c.b < 0.3;
        if (isYellowish) {
          mat.emissive.set("#ffcc00");
          mat.emissiveIntensity = 4.0;
        }

        // Detect cyan / neon-blue armor lines
        const isCyanish = c.b > 0.5 && c.r < 0.4 && c.g > 0.4;
        if (isCyanish) {
          mat.emissive.set("#00ccff");
          mat.emissiveIntensity = 3.5;
        }

        // Detect magenta / pink lines
        const isMagenta = c.r > 0.5 && c.b > 0.5 && c.g < 0.3;
        if (isMagenta) {
          mat.emissive.set("#ff00cc");
          mat.emissiveIntensity = 3.0;
        }
      });
    });
  }, [scene]);

  useFrame(() => {
    if (!rootRef.current) return;
    const t = performance.now() / 1000;
    rootRef.current.position.y = Math.sin(t * 1.1) * 0.02;
    rootRef.current.rotation.y = Math.sin(t * 0.35) * 0.05;
  });

  return (
    <group ref={rootRef}>
      <group ref={pivotRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
