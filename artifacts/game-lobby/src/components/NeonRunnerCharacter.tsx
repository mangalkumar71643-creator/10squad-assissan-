import { useMemo, useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

const CHAR_URL = "/characters/neon-striker-idle.glb";

useGLTF.preload(CHAR_URL);

const TARGET_HEIGHT = 1.85;

export default function NeonRunnerCharacter() {
  const { scene: origScene, animations } = useGLTF(CHAR_URL);
  const charScene = useMemo(() => skeletonClone(origScene), [origScene]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const rootRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!charScene) return;

    const bbox = new THREE.Box3().setFromObject(charScene);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const nativeHeight = size.y;
    const scale = nativeHeight > 0 ? TARGET_HEIGHT / nativeHeight : 1;
    charScene.scale.setScalar(scale);

    const bbox2 = new THREE.Box3().setFromObject(charScene);
    charScene.position.y = -bbox2.min.y;

    charScene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        mat.needsUpdate = true;
        const col = mat.color;
        if (col.r < 0.15 && col.g > 0.5 && col.b > 0.8) {
          mat.emissive.set("#00e5ff");
          mat.emissiveIntensity = 1.8;
        }
        if (col.r > 0.6 && col.g < 0.2 && col.b > 0.6) {
          mat.emissive.set("#ff00cc");
          mat.emissiveIntensity = 2.0;
        }
      });
    });

    if (animations.length > 0) {
      const mixer = new THREE.AnimationMixer(charScene);
      const clip = animations[0];
      mixer.clipAction(clip).play();
      mixerRef.current = mixer;
    }
  }, [charScene, animations]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
    if (rootRef.current) {
      const t = performance.now() / 1000;
      rootRef.current.position.y = Math.sin(t * 1.1) * 0.012;
    }
  });

  return (
    <group ref={rootRef}>
      <primitive object={charScene} />
    </group>
  );
}
