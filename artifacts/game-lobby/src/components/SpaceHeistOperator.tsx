/**
 * SpaceHeistOperator
 *
 * Loads the Space Heist Operator skeleton FBX (bones + walking animation).
 * Detects RightHand bone and parents the purple rifle to it.
 * The rifle moves with the hand during every frame of the animation.
 *
 * NOTE: The supplied FBX is "without_skin" — it contains only the armature
 * and animation channels, no visible mesh.  Once the user provides the base
 * character GLB (from Meshy AI), swap the path in CHAR_MODEL_URL and the
 * visible character body will appear.  The gun attachment logic requires NO
 * changes — it will continue to track RightHand perfectly.
 *
 * ── WEAPON SOCKET TUNING (hand-bone LOCAL space) ───────────────────────
 *  GRIP_POS   – offset from bone origin into the palm  (FBX cm units)
 *  GRIP_ROT   – Euler XYZ — rotate rifle so barrel (+X) points forward
 *  GRIP_SCALE is computed automatically to produce RIFLE_WORLD_M metres
 *  in world space regardless of the FBX unit system.
 * ────────────────────────────────────────────────────────────────────────
 */
import { useRef, useEffect } from "react";
import { useLoader, useFrame } from "@react-three/fiber";
import { useGLTF }            from "@react-three/drei";
import { FBXLoader }          from "three/examples/jsm/loaders/FBXLoader.js";
import * as THREE             from "three";

// ── File paths ────────────────────────────────────────────────────────────
const CHAR_FBX_URL   = "/assets/space-heist-operator.fbx";
const RIFLE_GLTF_URL = "/assets/purple-mirage-rifle.glb";

useGLTF.preload(RIFLE_GLTF_URL);

// ── Bone search order ────────────────────────────────────────────────────
const RIGHT_HAND_NAMES = [
  "RightHand",            // ← confirmed present in this FBX
  "mixamorigRightHand",
  "Hand_R",
  "Bip001_R_Hand",
  "hand_r",
  "HandRight",
];

// ── Weapon socket — tune if grip position feels off ──────────────────────
const GRIP_POS       = new THREE.Vector3(0, 0, -8);   // cm in bone-local space; negative Z = into palm
const GRIP_ROT       = new THREE.Euler(0, Math.PI / 2, 0, "XYZ"); // barrel (rifle +X) → forward
const RIFLE_WORLD_M  = 0.55;   // desired rifle length in world metres

// ── Character display height ──────────────────────────────────────────────
const TARGET_HEIGHT_M = 1.92;

export default function SpaceHeistOperator() {
  const fbx                    = useLoader(FBXLoader, CHAR_FBX_URL);
  const { scene: rifleScene }  = useGLTF(RIFLE_GLTF_URL);

  const mixerRef    = useRef<THREE.AnimationMixer | null>(null);
  const attachedRef = useRef(false);
  const rootRef     = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!fbx || !rifleScene || attachedRef.current) return;

    // ── 1. Measure FBX in its native units ───────────────────────────────
    const bbox   = new THREE.Box3().setFromObject(fbx);
    const fbxSize = new THREE.Vector3();
    bbox.getSize(fbxSize);

    const charScale = TARGET_HEIGHT_M / fbxSize.y;  // world units per FBX unit
    fbx.scale.setScalar(charScale);

    // Re-measure after scale → set feet at world y = 0
    const scaledBox = new THREE.Box3().setFromObject(fbx);
    fbx.position.y  = -scaledBox.min.y;

    // ── 2. Find RightHand bone ────────────────────────────────────────────
    let handBone: THREE.Bone | null = null;
    const allBones: string[] = [];

    fbx.traverse((child) => {
      if (child instanceof THREE.Bone) {
        allBones.push(child.name);
        if (!handBone && RIGHT_HAND_NAMES.includes(child.name)) {
          handBone = child;
        }
      }
    });

    if (!handBone) {
      console.error(
        "❌ SpaceHeistOperator: no hand bone found.\n" +
        "   Searched for:", RIGHT_HAND_NAMES.join(", "), "\n" +
        "   Available bones:", allBones.join(", ")
      );
      return;
    }

    console.log(
      `✅ SpaceHeistOperator: hand bone "${(handBone as THREE.Bone).name}" found.\n` +
      `   charScale=${charScale.toFixed(5)}, FBX height=${fbxSize.y.toFixed(1)} units`
    );

    // ── 3. Size rifle relative to world space ────────────────────────────
    //   The hand bone lives inside fbx whose scale = charScale.
    //   To get RIFLE_WORLD_M metres in world space:
    //     rifle_world = rifleLocalScale * rifleModelLength * charScale
    //   → rifleLocalScale = RIFLE_WORLD_M / (rifleModelLength * charScale)
    const rifleBbox        = new THREE.Box3().setFromObject(rifleScene);
    const rifleSize        = new THREE.Vector3();
    rifleBbox.getSize(rifleSize);
    const rifleModelLength = rifleSize.x;   // barrel axis is X
    const rifleLocalScale  = RIFLE_WORLD_M / (rifleModelLength * charScale);

    // ── 4. Clone rifle and parent to hand bone ───────────────────────────
    const rifleClone = rifleScene.clone(true);

    // Centre the rifle model so its geometric centre sits at the grip point
    const rifleCtr = new THREE.Vector3();
    rifleBbox.getCenter(rifleCtr);

    const gripGroup = new THREE.Group();
    gripGroup.name = "WeaponSocket";
    gripGroup.position.copy(GRIP_POS);   // offset in bone cm-space
    gripGroup.rotation.copy(GRIP_ROT);
    gripGroup.scale.setScalar(rifleLocalScale);

    // Centre rifle model inside grip group
    rifleClone.position.set(-rifleCtr.x, -rifleCtr.y, -rifleCtr.z);
    gripGroup.add(rifleClone);
    (handBone as THREE.Bone).add(gripGroup);
    attachedRef.current = true;

    // ── 5. Style rifle materials ─────────────────────────────────────────
    rifleClone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow    = true;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        mat.needsUpdate = true;
        const c = mat.color;
        if (c.b > 0.4 && c.r > 0.2) { mat.emissive.set("#7722cc"); mat.emissiveIntensity = 2.2; }
        if (c.r + c.g + c.b > 2.0)  { mat.emissive.set("#cc88ff"); mat.emissiveIntensity = 1.5; }
        if (mat.emissiveMap)          mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 2.0);
      });
    });

    // ── 6. Start walk animation ──────────────────────────────────────────
    if (fbx.animations.length > 0) {
      const mixer  = new THREE.AnimationMixer(fbx);
      const action = mixer.clipAction(fbx.animations[0]);
      action.play();
      mixerRef.current = mixer;
      console.log(`✅ Animation playing: "${fbx.animations[0].name}"`);
    } else {
      console.warn("⚠️  No animations in FBX — skeleton is static.");
    }

    // ── 7. Character mesh materials (when full model is provided) ────────
    fbx.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    });

  }, [fbx, rifleScene]);

  // ── Animation + idle bob ──────────────────────────────────────────────
  useFrame((_, delta) => {
    mixerRef.current?.update(delta);

    if (rootRef.current) {
      const t = performance.now() / 1000;
      rootRef.current.position.y = Math.sin(t * 1.1) * 0.018;
      rootRef.current.rotation.y = Math.sin(t * 0.32) * 0.06;
    }
  });

  return (
    <group ref={rootRef}>
      <primitive object={fbx} />
    </group>
  );
}
