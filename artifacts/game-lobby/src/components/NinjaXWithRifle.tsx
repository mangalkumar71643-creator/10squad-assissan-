/**
 * NinjaXWithRifle
 *
 * NOTE: ninja-x.glb is a static mesh — it has no armature, no skin, no bones.
 * Bone attachment (bone.add) is impossible. The rifle is positioned in the
 * character's right-hand area using accurate geometry derived from the GLB bounds.
 *
 * Character mesh (model space, before normalisation):
 *   X: -0.397 → +0.401   (right arm tip at +0.40)
 *   Y: -0.953 → +0.953   (height 1.906 → scaled to 1.92 world units)
 *   Z: -0.268 → +0.268
 *
 * Rifle mesh (purple-mirage-rifle.glb, model space):
 *   X: -0.959 → +0.959   ← barrel runs along X-axis
 *   Y: -0.282 → +0.282
 *   Z: -0.074 → +0.074
 *
 * ── WEAPON SOCKET TUNING ─────────────────────────────────────────────────
 *   SOCKET_POS  – world-space right-hand position (rootRef local space).
 *                 x=right, y=up from feet, z=forward toward camera.
 *   SOCKET_ROT  – Euler XYZ (radians).
 *                 rotation.y = π/2  → barrel (rifle +X) points +Z (toward camera / forward).
 *                 rotation.x = tilt down, rotation.z = roll for natural grip.
 *   SOCKET_SCALE – extra size multiplier (1 = auto-fitted world size).
 * ─────────────────────────────────────────────────────────────────────────
 */

import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

useGLTF.preload("/assets/ninja-x.glb");
useGLTF.preload("/assets/purple-mirage-rifle.glb");

// ── Weapon socket — tune until the grip sits in the palm ─────────────────
//  Character is 1.92 world units tall (feet = 0, head = 1.92).
//  Right arm reaches to world x ≈ +0.40.
//  Adjust SOCKET_POS_Y upward if gun still appears too low.
const SOCKET_POS   = new THREE.Vector3(0.18, 1.02, 0.16);
// Barrel is along rifle's +X.  rotation.y = π/2 rotates +X → +Z (toward viewer).
// rotation.x tilts the barrel slightly downward.
// rotation.z rolls the grip (right-hand natural tilt).
const SOCKET_ROT   = new THREE.Euler(0.12, Math.PI / 2, -0.18, "XYZ");
const SOCKET_SCALE = 1.0;

// Desired rifle length in world units (relative to 1.92 m character)
const RIFLE_WORLD_LENGTH = 0.58;

export default function NinjaXWithRifle() {
  const { scene: charScene }  = useGLTF("/assets/ninja-x.glb");
  const { scene: rifleScene } = useGLTF("/assets/purple-mirage-rifle.glb");

  const rootRef      = useRef<THREE.Group>(null);
  const charPivotRef = useRef<THREE.Group>(null);
  const rifleInnerRef = useRef<THREE.Group>(null);

  // ── Character normalisation ─────────────────────────────────────────────
  useEffect(() => {
    if (!charPivotRef.current) return;

    const box  = new THREE.Box3().setFromObject(charScene);
    const size = new THREE.Vector3();
    const ctr  = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(ctr);

    const TARGET_HEIGHT = 1.92;
    const charScale = TARGET_HEIGHT / size.y;

    charPivotRef.current.scale.setScalar(charScale);
    charPivotRef.current.position.set(
      -ctr.x * charScale,
      -box.min.y * charScale,   // feet at world y = 0
      -ctr.z * charScale,
    );

    // Material + shadow pass
    const totalVol = size.x * size.y * size.z;
    const mBox = new THREE.Box3();
    const mSz  = new THREE.Vector3();
    const mCtr = new THREE.Vector3();

    charScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      mBox.setFromObject(mesh); mBox.getSize(mSz); mBox.getCenter(mCtr);
      const vol = mSz.x * mSz.y * mSz.z;
      if (mCtr.y > box.max.y * 0.92 && vol < totalVol * 0.001) { mesh.visible = false; return; }

      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        mat.needsUpdate = true;
        if (mat.emissiveMap) mat.emissiveIntensity = 3.5;
        if (mat.emissive.r + mat.emissive.g + mat.emissive.b > 0.05)
          mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 3.0);
        const c = mat.color;
        if (c.b > 0.5 && c.r < 0.4 && c.g > 0.4) { mat.emissive.set("#00ccff"); mat.emissiveIntensity = 3.5; }
        if (c.b > 0.5 && c.r > 0.3 && c.g < 0.3) { mat.emissive.set("#aa44ff"); mat.emissiveIntensity = 3.0; }
        if (c.g > 0.6 && c.r < 0.3 && c.b < 0.3) { mat.emissive.set("#00ff88"); mat.emissiveIntensity = 3.5; }
      });
    });
  }, [charScene]);

  // ── Rifle setup ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rifleInnerRef.current) return;

    const box  = new THREE.Box3().setFromObject(rifleScene);
    const size = new THREE.Vector3();
    const ctr  = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(ctr);

    // Barrel runs along X — use X-dimension as the "length"
    const rifleScale = (RIFLE_WORLD_LENGTH / size.x) * SOCKET_SCALE;

    rifleInnerRef.current.scale.setScalar(rifleScale);
    // Centre the rifle model so its geometric centre sits at the socket origin
    rifleInnerRef.current.position.set(
      -ctr.x * rifleScale,
      -ctr.y * rifleScale,
      -ctr.z * rifleScale,
    );

    rifleScene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow    = true;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        mat.needsUpdate = true;
        const c = mat.color;
        if (c.b > 0.4 && c.r > 0.2)  { mat.emissive.set("#7722cc"); mat.emissiveIntensity = 2.2; }
        if (c.r + c.g + c.b > 2.0)    { mat.emissive.set("#cc88ff"); mat.emissiveIntensity = 1.5; }
        if (mat.emissiveMap) mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 2.0);
      });
    });
  }, [rifleScene]);

  // ── Idle animation — whole group (char + rifle) bobs together ───────────
  useFrame(() => {
    if (!rootRef.current) return;
    const t = performance.now() / 1000;
    rootRef.current.position.y = Math.sin(t * 1.1) * 0.018;
    rootRef.current.rotation.y = Math.sin(t * 0.32) * 0.06;
  });

  return (
    <group ref={rootRef}>
      {/* Character mesh */}
      <group ref={charPivotRef}>
        <primitive object={charScene} />
      </group>

      {/*
        Rifle socket — SOCKET_POS is in rootRef-local space (same coords as
        character world space: feet=0, head=1.92).
        rootRef's idle bob carries both character and rifle together.
        Adjust SOCKET_POS / SOCKET_ROT at the top of this file to tune.
      */}
      <group position={SOCKET_POS.toArray()} rotation={SOCKET_ROT}>
        <group ref={rifleInnerRef}>
          <primitive object={rifleScene} />
        </group>
      </group>
    </group>
  );
}
