import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

useGLTF.preload("/assets/ninja-x.glb");
useGLTF.preload("/assets/purple-mirage-rifle.glb");

const HAND_BONE_EXACT = [
  "mixamorigRightHand",
  "mixamorigRightHandMiddle1",
  "RightHand",
  "Hand_R",
  "Bip01 R Hand",
  "right_hand",
  "RightHandMiddle1",
];

export default function NinjaXWithRifle() {
  const { scene: charScene } = useGLTF("/assets/ninja-x.glb");
  const { scene: rifleScene } = useGLTF("/assets/purple-mirage-rifle.glb");

  const rootRef = useRef<THREE.Group>(null);
  const charPivotRef = useRef<THREE.Group>(null);
  const riflePivotRef = useRef<THREE.Group>(null);
  const rifleInnerRef = useRef<THREE.Group>(null);

  const handBoneRef = useRef<THREE.Object3D | null>(null);
  const tempVec = useRef(new THREE.Vector3());
  const basePosRef = useRef<THREE.Vector3 | null>(null);
  const boneFoundRef = useRef(false);

  useEffect(() => {
    if (!charPivotRef.current) return;

    const box = new THREE.Box3().setFromObject(charScene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const targetHeight = 1.92;
    const scale = targetHeight / size.y;

    charPivotRef.current.scale.setScalar(scale);
    charPivotRef.current.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale,
    );

    const totalVolume = size.x * size.y * size.z;
    const meshBox = new THREE.Box3();
    const meshSize = new THREE.Vector3();
    const meshCenter = new THREE.Vector3();

    charScene.traverse((child) => {
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
        if (mat.emissiveMap) mat.emissiveIntensity = 3.5;
        const emC = mat.emissive;
        if (emC.r + emC.g + emC.b > 0.05) mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 3.0);
        const c = mat.color;
        if (c.b > 0.5 && c.r < 0.4 && c.g > 0.4) { mat.emissive.set("#00ccff"); mat.emissiveIntensity = 3.5; }
        if (c.b > 0.5 && c.r > 0.3 && c.g < 0.3) { mat.emissive.set("#aa44ff"); mat.emissiveIntensity = 3.0; }
        if (c.g > 0.6 && c.r < 0.3 && c.b < 0.3) { mat.emissive.set("#00ff88"); mat.emissiveIntensity = 3.5; }
      });
    });

    for (const name of HAND_BONE_EXACT) {
      const bone = charScene.getObjectByName(name);
      if (bone) {
        handBoneRef.current = bone;
        boneFoundRef.current = true;
        break;
      }
    }

    if (!boneFoundRef.current) {
      charScene.traverse((obj) => {
        if (boneFoundRef.current) return;
        const n = obj.name.toLowerCase();
        const isRightHand = (n.includes("right") && n.includes("hand")) || n === "hand_r" || n === "r_hand";
        if (isRightHand) {
          handBoneRef.current = obj;
          boneFoundRef.current = true;
        }
      });
    }
  }, [charScene]);

  useEffect(() => {
    if (!rifleInnerRef.current) return;

    const box = new THREE.Box3().setFromObject(rifleScene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.62 / maxDim;

    rifleInnerRef.current.scale.setScalar(scale);
    rifleInnerRef.current.position.set(
      -center.x * scale,
      -center.y * scale,
      -center.z * scale,
    );

    rifleScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.frustumCulled = false;

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        mat.needsUpdate = true;
        const c = mat.color;
        if (c.b > 0.4 && c.r > 0.2) { mat.emissive.set("#7722cc"); mat.emissiveIntensity = 2.2; }
        if (c.r + c.g + c.b > 2.0) { mat.emissive.set("#cc88ff"); mat.emissiveIntensity = 1.5; }
        if (mat.emissiveMap) mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 2.0);
      });
    });
  }, [rifleScene]);

  useFrame(() => {
    if (!rootRef.current) return;
    const t = performance.now() / 1000;
    // Bob and sway the whole group — character + rifle move together
    rootRef.current.position.y = Math.sin(t * 1.1) * 0.018;
    rootRef.current.rotation.y = Math.sin(t * 0.32) * 0.06;

    if (!riflePivotRef.current) return;

    if (boneFoundRef.current && handBoneRef.current) {
      // Bone world pos already includes rootRef's bob, worldToLocal removes it
      // so riflePivotRef.position is constant in rootRef's local space → bobs with char
      handBoneRef.current.getWorldPosition(tempVec.current);
      rootRef.current.worldToLocal(tempVec.current);
      riflePivotRef.current.position.set(
        tempVec.current.x + 0.06,
        tempVec.current.y + 0.04,
        tempVec.current.z + 0.14,
      );
    } else {
      // Fallback: fixed local position — rootRef's bob carries the rifle naturally
      riflePivotRef.current.position.set(0.22, 1.22, 0.20);
    }
  });

  return (
    <group ref={rootRef}>
      <group ref={charPivotRef}>
        <primitive object={charScene} />
      </group>
      <group ref={riflePivotRef} rotation={[0.08, 0.22, 0.05]}>
        <group ref={rifleInnerRef}>
          <primitive object={rifleScene} />
        </group>
      </group>
    </group>
  );
}
