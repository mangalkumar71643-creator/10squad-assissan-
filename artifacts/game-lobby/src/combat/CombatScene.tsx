import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Sector } from "../state/progress";

export type CombatResult = "victory" | "defeat";
export interface CombatOutcome {
  result: CombatResult;
  hostilesDown: number;
  durationSec: number;
}

// ---------------------------------------------------------------------
// World layout — three connected rooms + two corridors, all original,
// procedurally built from boxes (no external model/texture assets).
// ---------------------------------------------------------------------

interface Obstacle {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  cover: boolean;
}

const PAD = 0.4;
const ROOM1 = { x: 0, z: 0, halfW: 11, halfD: 11 };
const CORR1 = { x: 0, zFrom: -11, zTo: -21, halfW: 2 };
const ROOM2 = { x: 0, z: -32, halfW: 11, halfD: 11 };
const CORR2 = { x: 0, zFrom: -43, zTo: -53, halfW: 2 };
const ROOM3 = { x: 0, z: -66, halfW: 15, halfD: 13 };
const EXTRACTION = { x: 0, z: -76 };
const WALL_T = 0.5;
const DOOR_W = 4;

// Player spawns well clear of Room 1's solid south wall (it has a door
// only on the north side — see OBSTACLES below), and the camera's follow
// distance is kept shorter than that clearance. Camera trails *behind*
// the player, so if the spawn sat close to a solid wall with no matching
// clearance, the camera would end up outside the room looking back in
// over the wall's top face — which reads as a wall of solid black filling
// the bottom of the screen, not an obvious "I'm behind a wall" cue.
const PLAYER_SPAWN = { x: 0, z: 4 };
const CAM_HEIGHT = 7.5;
const CAM_FOLLOW_DIST = 4.5;

function roomWalls(cx: number, cz: number, halfW: number, halfD: number, doorSides: ("n" | "s")[]): Obstacle[] {
  const segs: Obstacle[] = [];
  const nz = cz - halfD;
  const sz = cz + halfD;
  if (doorSides.includes("n")) {
    const segHalf = (halfW * 2 - DOOR_W) / 4;
    segs.push({ x: cx - DOOR_W / 2 - segHalf, z: nz, halfX: segHalf, halfZ: WALL_T / 2, cover: false });
    segs.push({ x: cx + DOOR_W / 2 + segHalf, z: nz, halfX: segHalf, halfZ: WALL_T / 2, cover: false });
  } else {
    segs.push({ x: cx, z: nz, halfX: halfW, halfZ: WALL_T / 2, cover: false });
  }
  if (doorSides.includes("s")) {
    const segHalf = (halfW * 2 - DOOR_W) / 4;
    segs.push({ x: cx - DOOR_W / 2 - segHalf, z: sz, halfX: segHalf, halfZ: WALL_T / 2, cover: false });
    segs.push({ x: cx + DOOR_W / 2 + segHalf, z: sz, halfX: segHalf, halfZ: WALL_T / 2, cover: false });
  } else {
    segs.push({ x: cx, z: sz, halfX: halfW, halfZ: WALL_T / 2, cover: false });
  }
  segs.push({ x: cx - halfW, z: cz, halfX: WALL_T / 2, halfZ: halfD, cover: false });
  segs.push({ x: cx + halfW, z: cz, halfX: WALL_T / 2, halfZ: halfD, cover: false });
  return segs;
}

function corridorWalls(c: typeof CORR1): Obstacle[] {
  const len = c.zFrom - c.zTo;
  const cz = (c.zFrom + c.zTo) / 2;
  return [
    { x: c.x - c.halfW, z: cz, halfX: WALL_T / 2, halfZ: Math.abs(len) / 2, cover: false },
    { x: c.x + c.halfW, z: cz, halfX: WALL_T / 2, halfZ: Math.abs(len) / 2, cover: false },
  ];
}

const COVER_CRATES: Obstacle[] = [
  { x: -4, z: 3, halfX: 0.6, halfZ: 0.6, cover: true },
  { x: 4.5, z: -2, halfX: 0.6, halfZ: 0.6, cover: true },
  { x: -3.5, z: -28, halfX: 0.6, halfZ: 0.6, cover: true },
  { x: 3, z: -35, halfX: 0.6, halfZ: 0.6, cover: true },
  { x: -6, z: -60, halfX: 0.7, halfZ: 0.7, cover: true },
  { x: 6, z: -62, halfX: 0.7, halfZ: 0.7, cover: true },
  { x: 0, z: -68, halfX: 0.9, halfZ: 0.6, cover: true },
];

const OBSTACLES: Obstacle[] = [
  ...roomWalls(ROOM1.x, ROOM1.z, ROOM1.halfW, ROOM1.halfD, ["n"]),
  ...corridorWalls(CORR1),
  ...roomWalls(ROOM2.x, ROOM2.z, ROOM2.halfW, ROOM2.halfD, ["n", "s"]),
  ...corridorWalls(CORR2),
  ...roomWalls(ROOM3.x, ROOM3.z, ROOM3.halfW, ROOM3.halfD, ["s"]),
  ...COVER_CRATES,
];

function resolveCollision(pos: { x: number; z: number }) {
  for (const ob of OBSTACLES) {
    const hx = ob.halfX + PAD;
    const hz = ob.halfZ + PAD;
    const dx = pos.x - ob.x;
    const dz = pos.z - ob.z;
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      const penX = hx - Math.abs(dx);
      const penZ = hz - Math.abs(dz);
      if (penX < penZ) pos.x = ob.x + hx * Math.sign(dx || 1);
      else pos.z = ob.z + hz * Math.sign(dz || 1);
    }
  }
}

function segmentHitsObstacle(x1: number, z1: number, x2: number, z2: number, ob: Obstacle): boolean {
  const minX = ob.x - ob.halfX;
  const maxX = ob.x + ob.halfX;
  const minZ = ob.z - ob.halfZ;
  const maxZ = ob.z + ob.halfZ;
  const dx = x2 - x1;
  const dz = z2 - z1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    let t1 = (minX - x1) / dx;
    let t2 = (maxX - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (z1 < minZ || z1 > maxZ) return false;
  } else {
    let t1 = (minZ - z1) / dz;
    let t2 = (maxZ - z1) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

function hasLineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
  for (const ob of OBSTACLES) {
    if (segmentHitsObstacle(x1, z1, x2, z2, ob)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// Procedural low-poly soldier — boxes only, no external model. Returns
// the group plus the pivots animation needs to reach into.
// ---------------------------------------------------------------------

interface SoldierRig {
  group: THREE.Group;
  leftShoulder: THREE.Group;
  rightShoulder: THREE.Group;
  leftHip: THREE.Group;
  rightHip: THREE.Group;
  muzzle: THREE.Object3D;
  bodyMat: THREE.MeshStandardMaterial;
}

function buildSoldier(bodyColor: number, visorColor: number, scale: number): SoldierRig {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6, metalness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.7, metalness: 0.2 });
  const visorMat = new THREE.MeshStandardMaterial({ color: visorColor, emissive: visorColor, emissiveIntensity: 1.6, roughness: 0.3 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.32), bodyMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.34), darkMat);
  head.position.y = 1.54;
  group.add(head);
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.04), visorMat);
  visor.position.set(0, 1.56, 0.17);
  group.add(visor);

  function limb(w: number, h: number, d: number, mat: THREE.Material, shoulderY: number, x: number): THREE.Group {
    const pivot = new THREE.Group();
    pivot.position.set(x, shoulderY, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.y = -h / 2;
    mesh.castShadow = true;
    pivot.add(mesh);
    group.add(pivot);
    return pivot;
  }

  const leftShoulder = limb(0.16, 0.56, 0.18, bodyMat, 1.32, -0.32);
  const rightShoulder = limb(0.16, 0.56, 0.18, bodyMat, 1.32, 0.32);
  const leftHip = limb(0.18, 0.72, 0.2, darkMat, 0.72, -0.16);
  const rightHip = limb(0.18, 0.72, 0.2, darkMat, 0.72, 0.16);

  // A simple rifle silhouette held in the right hand, forward-pointing —
  // muzzle is an empty Object3D at its tip, used to spawn tracers from.
  const gun = new THREE.Group();
  gun.position.set(0, -0.5, 0.16);
  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.55), darkMat);
  gunBody.position.z = 0.2;
  gun.add(gunBody);
  const muzzle = new THREE.Object3D();
  muzzle.position.z = 0.48;
  gun.add(muzzle);
  rightShoulder.add(gun);

  group.scale.setScalar(scale);
  return { group, leftShoulder, rightShoulder, leftHip, rightHip, muzzle, bodyMat };
}

function worldMuzzlePos(rig: SoldierRig, out: THREE.Vector3) {
  rig.muzzle.getWorldPosition(out);
}

// ---------------------------------------------------------------------
// Enemy definitions
// ---------------------------------------------------------------------

type EnemyKind = "trooper" | "scout" | "heavy";
type EnemyState = "patrol" | "alert" | "attack" | "retreat" | "dead";

interface Enemy {
  id: number;
  kind: EnemyKind;
  rig: SoldierRig;
  pos: { x: number; z: number };
  facing: number;
  hp: number;
  maxHp: number;
  state: EnemyState;
  stateT: number;
  fireCooldown: number;
  patrolTarget: { x: number; z: number };
  roomCenter: { x: number; z: number };
  roomHalf: { w: number; d: number };
  speed: number;
  damage: number;
  range: number;
  detectRange: number;
  bobPhase: number;
  hpBarEl: HTMLDivElement | null;
}

const ENEMY_TUNING: Record<EnemyKind, { hp: number; speed: number; damage: number; range: number; detect: number; color: number; scale: number; fireCd: number }> = {
  trooper: { hp: 90, speed: 2.1, damage: 8, range: 11, detect: 16, color: 0x8a3a34, scale: 1, fireCd: 1.1 },
  scout: { hp: 55, speed: 3.4, damage: 6, range: 8, detect: 18, color: 0xb08a2a, scale: 0.92, fireCd: 0.85 },
  heavy: { hp: 240, speed: 1.3, damage: 14, range: 13, detect: 20, color: 0x6a2430, scale: 1.35, fireCd: 1.4 },
};

let enemyIdSeq = 0;
function spawnEnemy(scene: THREE.Scene, kind: EnemyKind, x: number, z: number, roomCenter: { x: number; z: number }, roomHalf: { w: number; d: number }): Enemy {
  const t = ENEMY_TUNING[kind];
  const rig = buildSoldier(t.color, 0xffb347, t.scale);
  rig.group.position.set(x, 0, z);
  scene.add(rig.group);
  return {
    id: enemyIdSeq++,
    kind,
    rig,
    pos: { x, z },
    facing: Math.PI,
    hp: t.hp,
    maxHp: t.hp,
    state: "patrol",
    stateT: 0,
    fireCooldown: 0,
    patrolTarget: { x, z },
    roomCenter,
    roomHalf,
    speed: t.speed,
    damage: t.damage,
    range: t.range,
    detectRange: t.detect,
    bobPhase: Math.random() * 10,
    hpBarEl: null,
  };
}

function pickPatrolPoint(e: Enemy): { x: number; z: number } {
  const margin = 2.2;
  const x = e.roomCenter.x + (Math.random() * 2 - 1) * (e.roomHalf.w - margin);
  const z = e.roomCenter.z + (Math.random() * 2 - 1) * (e.roomHalf.d - margin);
  return { x, z };
}

function nearestCoverNear(x: number, z: number, awayFromX: number, awayFromZ: number): { x: number; z: number } | null {
  let best: Obstacle | null = null;
  let bestScore = -Infinity;
  for (const c of COVER_CRATES) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d > 9) continue;
    // Prefer cover that sits between the enemy and the threat.
    const towardThreat = Math.atan2(awayFromZ - c.z, awayFromX - c.x);
    const score = -d + Math.cos(towardThreat) * 0.001;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (!best) return null;
  // Stand on the far side of the crate from the threat.
  const awayAngle = Math.atan2(best.z - awayFromZ, best.x - awayFromX);
  return { x: best.x + Math.cos(awayAngle) * 1.1, z: best.z + Math.sin(awayAngle) * 1.1 };
}

// ---------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------

export default function CombatScene({
  sector,
  rewardXpPreview,
  rewardCreditsPreview,
  onComplete,
}: {
  sector: Sector;
  rewardXpPreview: number;
  rewardCreditsPreview: number;
  onComplete: (outcome: CombatOutcome) => void;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const hpFillRef = useRef<HTMLDivElement>(null);
  const ammoTextRef = useRef<HTMLDivElement>(null);
  const abilityFillRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);

  const joystickVec = useRef({ x: 0, y: 0 });
  const joystickTouchId = useRef<number | null>(null);
  const firing = useRef(false);
  const abilityRequested = useRef(false);

  const [remaining, setRemaining] = useState(0);
  const [objective, setObjective] = useState<"eliminate" | "extract">("eliminate");
  const [endScreen, setEndScreen] = useState<CombatResult | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040910);
    scene.fog = new THREE.Fog(0x040910, 20, 60);

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x3a6fa0, 0x0a0e18, 0.9));
    const key = new THREE.DirectionalLight(0x9fd0ff, 0.9);
    key.position.set(6, 14, 4);
    key.castShadow = true;
    scene.add(key);

    // --- Floor / ceiling, per room, with a canvas-generated tactical
    // grid texture (original, procedural — no image assets). ---
    const floorCanvas = document.createElement("canvas");
    floorCanvas.width = 256;
    floorCanvas.height = 256;
    const fctx = floorCanvas.getContext("2d")!;
    fctx.fillStyle = "#141c28";
    fctx.fillRect(0, 0, 256, 256);
    fctx.strokeStyle = "rgba(107,226,255,0.28)";
    fctx.lineWidth = 2;
    fctx.strokeRect(4, 4, 248, 248);
    fctx.strokeStyle = "rgba(255,255,255,0.05)";
    fctx.lineWidth = 1;
    for (let i = 32; i < 256; i += 32) {
      fctx.beginPath();
      fctx.moveTo(i, 0);
      fctx.lineTo(i, 256);
      fctx.moveTo(0, i);
      fctx.lineTo(256, i);
      fctx.stroke();
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.85 });

    function addFloor(cx: number, cz: number, w: number, d: number) {
      const tex = floorTex.clone();
      tex.repeat.set(w / 4, d / 4);
      const mat = floorMat.clone();
      mat.map = tex;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(cx, 0, cz);
      mesh.receiveShadow = true;
      scene.add(mesh);
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: 0x0a0e16, roughness: 1 }));
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.set(cx, 3.6, cz);
      scene.add(ceiling);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.5, 0.1), new THREE.MeshStandardMaterial({ color: 0x6be2ff, emissive: 0x6be2ff, emissiveIntensity: 1.4 }));
      strip.rotation.x = Math.PI / 2;
      strip.position.set(cx, 3.58, cz);
      scene.add(strip);
    }
    // A generous dark apron under the whole level, well past every room's
    // outer wall — without this, the tactical camera (which trails behind
    // the player, see camPos below) looks straight into the void the
    // moment the player stands near any wall, since the room floor tiles
    // stop exactly at the wall.
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(80, 140), new THREE.MeshStandardMaterial({ color: 0x060a10, roughness: 1 }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.set(0, -0.02, -35);
    apron.receiveShadow = true;
    scene.add(apron);

    addFloor(ROOM1.x, ROOM1.z, ROOM1.halfW * 2, ROOM1.halfD * 2);
    addFloor(CORR1.x, (CORR1.zFrom + CORR1.zTo) / 2, CORR1.halfW * 2, Math.abs(CORR1.zFrom - CORR1.zTo));
    addFloor(ROOM2.x, ROOM2.z, ROOM2.halfW * 2, ROOM2.halfD * 2);
    addFloor(CORR2.x, (CORR2.zFrom + CORR2.zTo) / 2, CORR2.halfW * 2, Math.abs(CORR2.zFrom - CORR2.zTo));
    addFloor(ROOM3.x, ROOM3.z, ROOM3.halfW * 2, ROOM3.halfD * 2);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c2733, roughness: 0.75, metalness: 0.2 });
    for (const ob of OBSTACLES) {
      if (ob.cover) continue;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, 3.4, ob.halfZ * 2), wallMat);
      mesh.position.set(ob.x, 1.7, ob.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x3a3226, roughness: 0.8 });
    for (const c of COVER_CRATES) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(c.halfX * 2, 0.9, c.halfZ * 2), crateMat);
      mesh.position.set(c.x, 0.45, c.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    // Extraction pad
    const padMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.5, transparent: true, opacity: 0.55 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 24), padMat);
    pad.position.set(EXTRACTION.x, 0.05, EXTRACTION.z);
    pad.visible = false;
    scene.add(pad);

    // --- Player ---
    const player = buildSoldier(0x2f6f9e, 0x6be2ff, 1);
    player.group.position.set(PLAYER_SPAWN.x, 0, PLAYER_SPAWN.z);
    scene.add(player.group);
    const playerState = {
      pos: { x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.z },
      facing: Math.PI,
      hp: 100,
      maxHp: 100,
      ammo: 14,
      maxAmmo: 14,
      reloading: 0,
      fireCooldown: 0,
      abilityCooldown: 0,
      abilityMax: 13,
      speed: 3.6,
      bobPhase: 0,
    };

    // --- Enemies ---
    const enemies: Enemy[] = [
      spawnEnemy(scene, "trooper", -6, -4, { x: ROOM1.x, z: ROOM1.z }, { w: ROOM1.halfW, d: ROOM1.halfD }),
      spawnEnemy(scene, "trooper", 6, -3, { x: ROOM1.x, z: ROOM1.z }, { w: ROOM1.halfW, d: ROOM1.halfD }),
      spawnEnemy(scene, "trooper", -6, -32, { x: ROOM2.x, z: ROOM2.z }, { w: ROOM2.halfW, d: ROOM2.halfD }),
      spawnEnemy(scene, "scout", 6, -28, { x: ROOM2.x, z: ROOM2.z }, { w: ROOM2.halfW, d: ROOM2.halfD }),
      spawnEnemy(scene, "heavy", 0, -70, { x: ROOM3.x, z: ROOM3.z }, { w: ROOM3.halfW, d: ROOM3.halfD }),
    ];

    // Camera yaw follows movement direction, smoothed — kept separate
    // from the character's own aim-facing so auto-targeting a new enemy
    // never whips the camera around (section 4: "never violently snap").
    let camYaw = Math.PI;
    const camPos = new THREE.Vector3(PLAYER_SPAWN.x, CAM_HEIGHT, PLAYER_SPAWN.z + CAM_FOLLOW_DIST);

    // Tracers: short-lived line segments.
    interface Tracer {
      mesh: THREE.Line;
      life: number;
    }
    const tracers: Tracer[] = [];
    function spawnTracer(from: THREE.Vector3, to: THREE.Vector3, color: number) {
      const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geo, mat);
      scene.add(line);
      tracers.push({ mesh: line, life: 0.08 });
    }

    interface Explosion {
      mesh: THREE.Mesh;
      life: number;
    }
    const explosions: Explosion[] = [];
    function spawnExplosion(x: number, z: number) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85 }),
      );
      mesh.position.set(x, 0.8, z);
      scene.add(mesh);
      explosions.push({ mesh, life: 0.4 });
      for (const e of enemies) {
        if (e.state === "dead") continue;
        const d = Math.hypot(e.pos.x - x, e.pos.z - z);
        if (d <= 4) damageEnemy(e, 60 * (1 - d / 5));
      }
    }

    let hostilesDown = 0;
    let matchOver = false;
    let objectiveState: "eliminate" | "extract" = "eliminate";

    function damageEnemy(e: Enemy, amount: number) {
      if (e.state === "dead") return;
      e.hp -= amount;
      e.rig.bodyMat.emissive = new THREE.Color(0xff3b3b);
      e.rig.bodyMat.emissiveIntensity = 0.8;
      if (e.hp <= 0) {
        e.hp = 0;
        e.state = "dead";
        e.rig.group.visible = false;
        hostilesDown += 1;
        if (e.hpBarEl) e.hpBarEl.style.display = "none";
      } else if (e.state === "patrol") {
        e.state = "alert";
        e.stateT = 0;
      }
    }

    // --- Input: joystick ---
    const joyBase = joystickBaseRef.current!;
    function updateJoystickFromEvent(clientX: number, clientY: number) {
      const rect = joyBase.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const maxR = rect.width / 2;
      const dist = Math.min(1, Math.hypot(dx, dy) / maxR);
      const angle = Math.atan2(dy, dx);
      joystickVec.current = { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
      const knob = joystickKnobRef.current;
      if (knob) knob.style.transform = `translate(${Math.cos(angle) * dist * maxR * 0.5}px, ${Math.sin(angle) * dist * maxR * 0.5}px)`;
    }
    function onTouchStart(e: TouchEvent) {
      const t = e.changedTouches[0];
      joystickTouchId.current = t.identifier;
      updateJoystickFromEvent(t.clientX, t.clientY);
    }
    function onTouchMove(e: TouchEvent) {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joystickTouchId.current) updateJoystickFromEvent(t.clientX, t.clientY);
      }
    }
    function onTouchEnd(e: TouchEvent) {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joystickTouchId.current) {
          joystickTouchId.current = null;
          joystickVec.current = { x: 0, y: 0 };
          const knob = joystickKnobRef.current;
          if (knob) knob.style.transform = "translate(0,0)";
        }
      }
    }
    joyBase.addEventListener("touchstart", onTouchStart, { passive: true });
    joyBase.addEventListener("touchmove", onTouchMove, { passive: true });
    joyBase.addEventListener("touchend", onTouchEnd);
    joyBase.addEventListener("touchcancel", onTouchEnd);

    // Mouse fallback (desktop testing)
    let mouseDown = false;
    function onMouseDown(e: MouseEvent) {
      mouseDown = true;
      updateJoystickFromEvent(e.clientX, e.clientY);
    }
    function onMouseMove(e: MouseEvent) {
      if (mouseDown) updateJoystickFromEvent(e.clientX, e.clientY);
    }
    function onMouseUp() {
      mouseDown = false;
      joystickVec.current = { x: 0, y: 0 };
      const knob = joystickKnobRef.current;
      if (knob) knob.style.transform = "translate(0,0)";
    }
    joyBase.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    function onResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener("resize", onResize);

    const clock = new THREE.Clock();
    const matchStart = Date.now();
    let raf = 0;

    function findTarget(fromX: number, fromZ: number, range: number): Enemy | null {
      let best: Enemy | null = null;
      let bestDist = range;
      for (const e of enemies) {
        if (e.state === "dead") continue;
        const d = Math.hypot(e.pos.x - fromX, e.pos.z - fromZ);
        if (d < bestDist && hasLineOfSight(fromX, fromZ, e.pos.x, e.pos.z)) {
          best = e;
          bestDist = d;
        }
      }
      return best;
    }

    function tick() {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, clock.getDelta());

      for (const t of tracers) t.life -= dt;
      while (tracers.length && tracers[0].life <= 0) {
        const t = tracers.shift()!;
        scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        (t.mesh.material as THREE.Material).dispose();
      }
      for (const ex of explosions) {
        ex.life -= dt;
        ex.mesh.scale.setScalar(1 + (0.4 - ex.life) * 12);
        (ex.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ex.life / 0.4) * 0.85;
      }
      while (explosions.length && explosions[0].life <= 0) {
        const ex = explosions.shift()!;
        scene.remove(ex.mesh);
        ex.mesh.geometry.dispose();
        (ex.mesh.material as THREE.Material).dispose();
      }
      for (const e of enemies) {
        if (e.rig.bodyMat.emissiveIntensity > 0) {
          e.rig.bodyMat.emissiveIntensity = Math.max(0, e.rig.bodyMat.emissiveIntensity - dt * 3);
        }
      }

      if (!matchOver) {
        // --- Player movement ---
        const jv = joystickVec.current;
        const mag = Math.min(1, Math.hypot(jv.x, jv.y));
        if (mag > 0.05) {
          // Joystick x/y -> world x/z (screen-space, not camera-relative,
          // keeping controls predictable regardless of camera yaw).
          const moveAngle = Math.atan2(jv.y, jv.x);
          const vx = Math.cos(moveAngle) * mag * playerState.speed * dt;
          const vz = Math.sin(moveAngle) * mag * playerState.speed * dt;
          playerState.pos.x += vx;
          playerState.pos.z += vz;
          resolveCollision(playerState.pos);
          const targetFacing = Math.atan2(vz, vx) - Math.PI / 2;
          let df = targetFacing - camYaw;
          camYaw += df * Math.min(1, dt * 4);
          playerState.bobPhase += dt * 8 * mag;
        }

        // Player aim-facing: nearest visible enemy, else movement facing.
        const target = findTarget(playerState.pos.x, playerState.pos.z, 16);
        let aimFacing = playerState.facing;
        if (target) {
          aimFacing = Math.atan2(target.pos.x - playerState.pos.x, target.pos.z - playerState.pos.z);
        } else if (mag > 0.05) {
          aimFacing = Math.atan2(jv.x, -jv.y);
        }
        let fd = aimFacing - playerState.facing;
        fd = Math.atan2(Math.sin(fd), Math.cos(fd));
        playerState.facing += fd * Math.min(1, dt * 10);

        player.group.position.set(playerState.pos.x, 0, playerState.pos.z);
        player.group.rotation.y = playerState.facing;
        const legSwing = Math.sin(playerState.bobPhase) * 0.5;
        player.leftHip.rotation.x = legSwing;
        player.rightHip.rotation.x = -legSwing;
        player.leftShoulder.rotation.x = -legSwing * 0.3;

        // --- Player firing ---
        playerState.fireCooldown = Math.max(0, playerState.fireCooldown - dt);
        if (playerState.reloading > 0) {
          playerState.reloading -= dt;
          if (playerState.reloading <= 0) playerState.ammo = playerState.maxAmmo;
        }
        if (firing.current && playerState.fireCooldown <= 0 && playerState.reloading <= 0) {
          if (playerState.ammo <= 0) {
            playerState.reloading = 1.3;
          } else if (target) {
            playerState.ammo -= 1;
            playerState.fireCooldown = 0.22;
            const muzzleWorld = new THREE.Vector3();
            worldMuzzlePos(player, muzzleWorld);
            const targetWorld = new THREE.Vector3(target.pos.x, 1.2, target.pos.z);
            spawnTracer(muzzleWorld, targetWorld, 0x6be2ff);
            damageEnemy(target, 16 + Math.random() * 6);
            player.rightShoulder.rotation.x = -0.35;
          }
        }
        player.rightShoulder.rotation.x += (0 - player.rightShoulder.rotation.x) * Math.min(1, dt * 10);

        if (ammoTextRef.current) {
          ammoTextRef.current.textContent = playerState.reloading > 0 ? "RELOADING" : `${playerState.ammo} / ${playerState.maxAmmo}`;
        }

        // --- Ability: grenade ---
        playerState.abilityCooldown = Math.max(0, playerState.abilityCooldown - dt);
        if (abilityFillRef.current) {
          const frac = 1 - playerState.abilityCooldown / playerState.abilityMax;
          abilityFillRef.current.style.height = `${frac * 100}%`;
        }
        if (abilityRequested.current) {
          abilityRequested.current = false;
          if (playerState.abilityCooldown <= 0) {
            playerState.abilityCooldown = playerState.abilityMax;
            const throwDist = 6;
            const tx = playerState.pos.x + Math.sin(playerState.facing) * throwDist;
            const tz = playerState.pos.z + Math.cos(playerState.facing) * throwDist;
            setTimeout(() => {
              if (!disposed) spawnExplosion(tx, tz);
            }, 550);
          }
        }

        // --- Enemy AI ---
        for (const e of enemies) {
          if (e.state === "dead") continue;
          e.fireCooldown = Math.max(0, e.fireCooldown - dt);
          const distToPlayer = Math.hypot(playerState.pos.x - e.pos.x, playerState.pos.z - e.pos.z);
          const canSeePlayer = distToPlayer < e.detectRange && hasLineOfSight(e.pos.x, e.pos.z, playerState.pos.x, playerState.pos.z);

          if (e.state === "patrol") {
            if (canSeePlayer) {
              e.state = "alert";
              e.stateT = 0;
            } else {
              const d = Math.hypot(e.patrolTarget.x - e.pos.x, e.patrolTarget.z - e.pos.z);
              if (d < 0.5) e.patrolTarget = pickPatrolPoint(e);
              moveToward(e, e.patrolTarget, e.speed * 0.45, dt);
            }
          } else if (e.state === "alert") {
            e.stateT += dt;
            e.facing = Math.atan2(playerState.pos.x - e.pos.x, playerState.pos.z - e.pos.z);
            if (e.stateT > 0.35) e.state = "attack";
          } else if (e.state === "attack") {
            if (e.hp < e.maxHp * 0.25 && e.kind !== "heavy") {
              e.state = "retreat";
            } else if (!canSeePlayer) {
              moveToward(e, { x: playerState.pos.x, z: playerState.pos.z }, e.speed, dt);
            } else if (e.kind === "scout") {
              // Flank: circle toward a point to the side of the player.
              const side = e.id % 2 === 0 ? 1 : -1;
              const angle = Math.atan2(e.pos.z - playerState.pos.z, e.pos.x - playerState.pos.x) + side * 0.9;
              const flankPoint = { x: playerState.pos.x + Math.cos(angle) * 5, z: playerState.pos.z + Math.sin(angle) * 5 };
              moveToward(e, flankPoint, e.speed, dt);
              fireAtPlayer(e, distToPlayer);
            } else if (distToPlayer > e.range * 0.7) {
              moveToward(e, { x: playerState.pos.x, z: playerState.pos.z }, e.speed, dt);
              fireAtPlayer(e, distToPlayer);
            } else {
              const cover = nearestCoverNear(e.pos.x, e.pos.z, playerState.pos.x, playerState.pos.z);
              if (cover && Math.hypot(cover.x - e.pos.x, cover.z - e.pos.z) > 0.6) {
                moveToward(e, cover, e.speed * 0.7, dt);
              }
              e.facing = Math.atan2(playerState.pos.x - e.pos.x, playerState.pos.z - e.pos.z);
              fireAtPlayer(e, distToPlayer);
            }
          } else if (e.state === "retreat") {
            const away = { x: e.pos.x + (e.pos.x - playerState.pos.x), z: e.pos.z + (e.pos.z - playerState.pos.z) };
            moveToward(e, away, e.speed, dt);
            if (e.hp > e.maxHp * 0.45 || distToPlayer > e.detectRange) e.state = "attack";
          }

          e.rig.group.position.set(e.pos.x, 0, e.pos.z);
          e.rig.group.rotation.y = e.facing;
          e.bobPhase += dt * 7;
          const sw = e.state === "patrol" ? Math.sin(e.bobPhase) * 0.35 : 0;
          e.rig.leftHip.rotation.x = sw;
          e.rig.rightHip.rotation.x = -sw;
        }

        function fireAtPlayer(e: Enemy, dist: number) {
          if (e.fireCooldown <= 0 && dist <= e.range) {
            e.fireCooldown = ENEMY_TUNING[e.kind].fireCd + Math.random() * 0.3;
            const from = new THREE.Vector3(e.pos.x, 1.3, e.pos.z);
            const to = new THREE.Vector3(playerState.pos.x, 1.1, playerState.pos.z);
            spawnTracer(from, to, 0xff6b5e);
            playerState.hp = Math.max(0, playerState.hp - e.damage);
          }
        }

        function moveToward(e: Enemy, target: { x: number; z: number }, speed: number, dt: number) {
          const dx = target.x - e.pos.x;
          const dz = target.z - e.pos.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.15) {
            e.pos.x += (dx / d) * speed * dt;
            e.pos.z += (dz / d) * speed * dt;
            resolveCollision(e.pos);
            e.facing = Math.atan2(dx, dz);
          }
        }

        if (hpFillRef.current) hpFillRef.current.style.width = `${(playerState.hp / playerState.maxHp) * 100}%`;

        // --- Objective progression ---
        const aliveCount = enemies.filter((e) => e.state !== "dead").length;
        if (objectiveState === "eliminate" && aliveCount === 0) {
          objectiveState = "extract";
          pad.visible = true;
          setObjective("extract");
        }
        setRemaining(aliveCount);

        if (objectiveState === "extract") {
          const d = Math.hypot(playerState.pos.x - EXTRACTION.x, playerState.pos.z - EXTRACTION.z);
          if (d < 2.2) {
            matchOver = true;
            setEndScreen("victory");
          }
        }
        if (playerState.hp <= 0) {
          matchOver = true;
          setEndScreen("defeat");
        }

        if (matchOver) {
          const durationSec = Math.round((Date.now() - matchStart) / 1000);
          setTimeout(() => {
            if (!disposed) {
              onComplete({ result: playerState.hp <= 0 ? "defeat" : "victory", hostilesDown, durationSec });
            }
          }, 1700);
        }
      }

      // --- Camera follow (fixed high-angle tactical offset) ---
      const desired = new THREE.Vector3(
        playerState.pos.x - Math.sin(camYaw) * CAM_FOLLOW_DIST,
        CAM_HEIGHT,
        playerState.pos.z - Math.cos(camYaw) * CAM_FOLLOW_DIST,
      );
      camPos.lerp(desired, Math.min(1, dt * 4));
      camera.position.copy(camPos);
      camera.lookAt(playerState.pos.x, 1, playerState.pos.z - 1.5);

      // --- Minimap ---
      const mm = minimapRef.current;
      if (mm) {
        const ctx = mm.getContext("2d")!;
        const W = mm.width;
        const H = mm.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "rgba(6,10,20,0.75)";
        ctx.fillRect(0, 0, W, H);
        const scale = 3.2;
        const cx = W / 2 - playerState.pos.x * scale;
        const cz = H / 2 - playerState.pos.z * scale;
        ctx.strokeStyle = "rgba(107,226,255,0.35)";
        ctx.lineWidth = 1;
        for (const ob of OBSTACLES) {
          if (ob.cover) continue;
          ctx.strokeRect(cx + (ob.x - ob.halfX) * scale, cz + (ob.z - ob.halfZ) * scale, ob.halfX * 2 * scale, ob.halfZ * 2 * scale);
        }
        if (pad.visible) {
          ctx.fillStyle = "#22c55e";
          ctx.beginPath();
          ctx.arc(cx + EXTRACTION.x * scale, cz + EXTRACTION.z * scale, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const e of enemies) {
          if (e.state === "dead") continue;
          const dist = Math.hypot(e.pos.x - playerState.pos.x, e.pos.z - playerState.pos.z);
          if (dist > e.detectRange && e.state === "patrol") continue;
          ctx.fillStyle = e.state === "patrol" ? "#8a95a8" : "#ff6b5e";
          ctx.beginPath();
          ctx.arc(cx + e.pos.x * scale, cz + e.pos.z * scale, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#6be2ff";
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#6be2ff";
        ctx.beginPath();
        ctx.moveTo(W / 2, H / 2);
        ctx.lineTo(W / 2 + Math.sin(playerState.facing) * 8, H / 2 + Math.cos(playerState.facing) * 8);
        ctx.stroke();
      }

      renderer.render(scene, camera);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      joyBase.removeEventListener("touchstart", onTouchStart);
      joyBase.removeEventListener("touchmove", onTouchMove);
      joyBase.removeEventListener("touchend", onTouchEnd);
      joyBase.removeEventListener("touchcancel", onTouchEnd);
      joyBase.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector.id]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", touchAction: "none" }}>
      <div ref={mountRef} style={{ position: "absolute", inset: 0 }} />

      {/* Minimap */}
      <canvas ref={minimapRef} width={120} height={120} style={{ position: "absolute", top: 14, left: 14, borderRadius: 8, border: "1px solid rgba(107,226,255,0.4)" }} />

      {/* Objective banner */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "6px 16px",
          background: "rgba(6,10,20,0.6)",
          border: "1px solid rgba(107,226,255,0.35)",
          borderRadius: 6,
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ color: "#6be2ff", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: "0.14em" }}>
          {sector.index} — {sector.codename.toUpperCase()}
        </div>
        <div style={{ color: "#eef4fa", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: 12 }}>
          {objective === "eliminate" ? `OBJECTIVE: ELIMINATE HOSTILES · ${remaining} REMAINING` : "OBJECTIVE: REACH EXTRACTION"}
        </div>
      </div>

      {/* Ammo */}
      <div
        ref={ammoTextRef}
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          padding: "6px 12px",
          background: "rgba(6,10,20,0.6)",
          border: "1px solid rgba(255,210,63,0.35)",
          borderRadius: 6,
          color: "#ffd23f",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        14 / 14
      </div>

      {/* Health bar */}
      <div style={{ position: "absolute", bottom: "16%", left: "50%", transform: "translateX(-50%)", width: "min(60vw, 260px)" }}>
        <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <div ref={hpFillRef} style={{ height: "100%", width: "100%", background: "linear-gradient(90deg,#4fd8ff,#6be2ff)" }} />
        </div>
      </div>

      {/* Joystick */}
      <div
        ref={joystickBaseRef}
        style={{
          position: "absolute",
          left: "6%",
          bottom: "8%",
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: "rgba(20,30,45,0.4)",
          border: "1px solid rgba(107,226,255,0.4)",
        }}
      >
        <div
          ref={joystickKnobRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 42,
            height: 42,
            marginLeft: -21,
            marginTop: -21,
            borderRadius: "50%",
            background: "radial-gradient(circle, #9fe0ff, #3fa8dd)",
          }}
        />
      </div>

      {/* Ability button */}
      <button
        onPointerDown={() => {
          abilityRequested.current = true;
        }}
        aria-label="Grenade"
        style={{
          position: "absolute",
          right: "calc(7% + 90px)",
          bottom: "8%",
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "2px solid rgba(180,220,255,0.6)",
          background: "rgba(20,30,45,0.5)",
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        <div ref={abilityFillRef} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "100%", background: "rgba(107,226,255,0.35)" }} />
        <span style={{ position: "relative", color: "#eef4fa", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 11 }}>NADE</span>
      </button>

      {/* Fire button */}
      <button
        onPointerDown={() => {
          firing.current = true;
        }}
        onPointerUp={() => {
          firing.current = false;
        }}
        onPointerLeave={() => {
          firing.current = false;
        }}
        aria-label="Fire"
        style={{
          position: "absolute",
          right: "7%",
          bottom: "8%",
          width: 78,
          height: 78,
          borderRadius: "50%",
          background: "radial-gradient(circle, #ff8a7a, #d9382a)",
          border: "2px solid rgba(255,180,170,0.7)",
          color: "#fff",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "0.05em",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        FIRE
      </button>

      {endScreen && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            background: "rgba(3,6,13,0.75)",
          }}
        >
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 6vw, 48px)",
              letterSpacing: "0.15em",
              color: endScreen === "victory" ? "#6be2ff" : "#ff6b5e",
              textShadow: endScreen === "victory" ? "0 0 24px rgba(107,216,255,0.8)" : "0 0 24px rgba(255,107,94,0.8)",
            }}
          >
            {endScreen === "victory" ? "VICTORY" : "DEFEAT"}
          </div>
          {endScreen === "victory" && (
            <div style={{ color: "#ffd23f", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: 14 }}>
              +{rewardXpPreview} XP · +{rewardCreditsPreview} CR incoming
            </div>
          )}
        </div>
      )}
    </div>
  );
}
