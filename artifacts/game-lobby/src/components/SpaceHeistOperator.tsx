/**
 * SpaceHeistOperator — rigged character with rifle parented to RightHand bone.
 *
 * GLB facts (confirmed by binary inspection):
 *   Character height  : Y 0 → 1.700 m (already in metres, no unit conversion needed)
 *   Skeleton joints   : 24  (Hips → Spine → … → RightHand ← gun attaches here)
 *   Animation         : "Armature|walking_man|baselayer"
 *   Rifle barrel axis : +X  (rifle model X: -0.959 → +0.959)
 *
 * ── TUNING KNOBS ─────────────────────────────────────────────────────────
 *   All values are in the RightHand bone's LOCAL coordinate space (metres,
 *   relative to the UNSCALED 1.7 m character).
 *
 *   GRIP_POS  – translate rifle so the grip sits in the palm.
 *               +X = thumb direction, +Y = toward fingertips, +Z = out of palm.
 *   GRIP_ROT  – rotate rifle so barrel points forward (character's +Z world).
 *               Start: Y=π/2 turns rifle +X → scene +Z. Adjust X/Z for tilt.
 *   RIFLE_LEN_M – desired rifle world length in metres (scales rifle to match).
 * ─────────────────────────────────────────────────────────────────────────
 */
import { useMemo, useRef, useEffect } from "react";
import { useGLTF }                    from "@react-three/drei";
import { useFrame }                   from "@react-three/fiber";
import { clone as skeletonClone }     from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE                     from "three";

// ── Asset paths ───────────────────────────────────────────────────────────
const CHAR_URL  = "/assets/space-heist-operator-walk.glb";
const RIFLE_URL = "/assets/purple-mirage-rifle.glb";

useGLTF.preload(CHAR_URL);
useGLTF.preload(RIFLE_URL);

// ── Bone name search list ─────────────────────────────────────────────────
const RIGHT_HAND_NAMES = ["RightHand", "mixamorigRightHand", "Hand_R", "Bip001_R_Hand"];

// ── Weapon socket — tune here ─────────────────────────────────────────────
const GRIP_POS   = new THREE.Vector3(0.04, 0.06, 0.02);   // hand-bone local metres
const GRIP_ROT   = new THREE.Euler(Math.PI * 0.05, Math.PI / 2, -Math.PI * 0.08, "XYZ");
const RIFLE_LEN_M = 0.52;   // desired rifle length in world metres

// ── Character display ────────────────────────────────────────────────────
const CHAR_HEIGHT_M = 1.700;   // native GLB height (from accessor bounds)
const TARGET_HEIGHT = 1.92;    // desired world height
const CHAR_SCALE    = TARGET_HEIGHT / CHAR_HEIGHT_M;   // ≈ 1.129

// ── Animation ────────────────────────────────────────────────────────────
const WALK_ANIM = "Armature|walking_man|baselayer";

export default function SpaceHeistOperator() {
  const { scene: origChar, animations } = useGLTF(CHAR_URL);
  const { scene: rifleScene }           = useGLTF(RIFLE_URL);

  // Clone so multiple renders / HMR don't share the same SkinnedMesh
  const charScene = useMemo(() => skeletonClone(origChar), [origChar]);

  const mixerRef  = useRef<THREE.AnimationMixer | null>(null);
  const rootRef   = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!charScene || !rifleScene) return;

    // ── Scale character so feet=0, head=TARGET_HEIGHT ────────────────────
    charScene.scale.setScalar(CHAR_SCALE);
    // Native feet are already at Y=0 — no extra pivot needed.

    // ── Find RightHand bone ───────────────────────────────────────────────
    let handBone: THREE.Bone | null = null;
    const allBoneNames: string[] = [];

    charScene.traverse((obj) => {
      if (obj instanceof THREE.Bone) {
        allBoneNames.push(obj.name);
        if (!handBone && RIGHT_HAND_NAMES.includes(obj.name)) {
          handBone = obj as THREE.Bone;
        }
      }
    });

    if (!handBone) {
      console.error(
        "❌ RightHand bone NOT found.\n" +
        "   Searched:", RIGHT_HAND_NAMES.join(", ") + "\n" +
        "   Available bones:", allBoneNames.join(", ")
      );
      return;
    }
    console.log(`✅ Bone found: "${(handBone as THREE.Bone).name}"`);

    // ── Compute rifle local scale ─────────────────────────────────────────
    // World size = rifleLocalScale × rifleModelLength × CHAR_SCALE
    const rifleBbox = new THREE.Box3().setFromObject(rifleScene);
    const rifleSize = new THREE.Vector3();
    rifleBbox.getSize(rifleSize);
    const rifleModelLen  = rifleSize.x;                                    // barrel along X
    const rifleLocalScale = RIFLE_LEN_M / (rifleModelLen * CHAR_SCALE);   // hand-bone local units

    const rifleCtr = new THREE.Vector3();
    rifleBbox.getCenter(rifleCtr);

    // ── Clone rifle and build socket group ────────────────────────────────
    const rifleClone = rifleScene.clone(true);

    // Inner group: centres the rifle model at the socket origin
    const centreGroup = new THREE.Group();
    centreGroup.name = "RifleCentre";
    centreGroup.scale.setScalar(rifleLocalScale);
    rifleClone.position.set(-rifleCtr.x, -rifleCtr.y, -rifleCtr.z);
    centreGroup.add(rifleClone);

    // Outer group: positions + rotates in hand-bone local space
    const socketGroup = new THREE.Group();
    socketGroup.name = "WeaponSocket";
    socketGroup.position.copy(GRIP_POS);
    socketGroup.rotation.copy(GRIP_ROT);
    socketGroup.add(centreGroup);

    // Parent socket to hand bone — gun moves with bone from now on
    (handBone as THREE.Bone).add(socketGroup);
    console.log("✅ Rifle parented to RightHand bone");

    // ── Style rifle materials ─────────────────────────────────────────────
    rifleClone.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.castShadow    = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        mat.needsUpdate = true;
        const { r, g, b } = mat.color;
        if (b > 0.4 && r > 0.2)          { mat.emissive.set("#6600cc"); mat.emissiveIntensity = 2.0; }
        if (r + g + b > 2.0)              { mat.emissive.set("#bb88ff"); mat.emissiveIntensity = 1.2; }
        if (mat.emissiveMap)               mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 0, 1.8);
      });
    });

    // ── Character mesh quality ────────────────────────────────────────────
    charScene.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      mesh.castShadow    = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
    });

    // ── Start walking animation ───────────────────────────────────────────
    if (animations.length === 0) {
      console.warn("⚠️  No animations found in GLB.");
      return;
    }

    const clip = THREE.AnimationClip.findByName(animations, WALK_ANIM)
                 ?? animations[0];
    console.log(`✅ Playing animation: "${clip.name}"`);

    const mixer  = new THREE.AnimationMixer(charScene);
    const action = mixer.clipAction(clip);
    action.play();
    mixerRef.current = mixer;

  }, [charScene, rifleScene, animations]);

  // ── Per-frame: advance animation + gentle idle sway ──────────────────
  useFrame((_, delta) => {
    mixerRef.current?.update(delta);

    if (rootRef.current) {
      const t = performance.now() / 1000;
      // Subtle vertical bob synced with walk cycle
      rootRef.current.position.y = Math.sin(t * 2.2) * 0.008;
      // Slow left-right showcase rotation
      rootRef.current.rotation.y = Math.sin(t * 0.28) * 0.12;
    }
  });

  return (
    <group ref={rootRef}>
      <primitive object={charScene} />
    </group>
  );
}
