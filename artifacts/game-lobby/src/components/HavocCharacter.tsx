import { useMemo, useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";

const CHAR_URL = "/characters/havoc-idle.glb";

useGLTF.preload(CHAR_URL);

export default function HavocCharacter() {
  const { scene: origScene, animations } = useGLTF(CHAR_URL);
  const charScene = useMemo(() => skeletonClone(origScene), [origScene]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const rootRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!charScene) return;

    // Same skinned-mesh gotcha as NeonRunnerCharacter: the export already
    // bakes the correct real-world scale into the armature node transform,
    // so no bbox-based auto-fit is needed here either — render as-is.
    charScene.traverse((obj: THREE.Object3D) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
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
