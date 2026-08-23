import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { createSciFiFloorTexture, createSciFiWallTexture, createSkyTexture } from "./textures";

// ============================================================================
// CYPHER PHUNK — real, walkable 3D level
//
// Ported from the "Cypher Phunk" Blender blockout script (central core,
// upper/lower rooms, side rooms, main corridors, 45-degree diagonal
// connectors, side loops and stairs on a 64x64m footprint) into an actual
// walkable Three.js level: real walls with collision, a first-person
// walkthrough controller (desktop pointer-lock + mobile touch joystick),
// and functional stairs that raise the player as they climb them.
//
// This is a standalone "walk the map" experience — it reuses the main
// combat arena's visual materials (see ./textures) but not its bot/combat
// systems, which are a separate, much larger feature.
// ============================================================================

const MAP_HALF = 32; // 64x64m footprint
const WALL_H = 4;
const WALL_T = 0.3;
const EYE_HEIGHT = 1.65;
const PLAYER_RADIUS = 0.4;
const PLAYER_SPEED = 4.2;
const SPRINT_MULT = 1.7;
const FLY_SPEED = 16; // free-fly "bird view" camera — no collision, moves along full look direction
const SKY_RADIUS = 200;
const FOG_NEAR = 40;
const FOG_FAR = 170;

const PURPLE = new THREE.Color(0.55, 0.15, 0.85);

interface RoomDef {
  x: number;
  z: number;
  sx: number;
  sz: number;
  open: ("N" | "S" | "E" | "W")[];
}
interface CorridorDef {
  x: number;
  z: number;
  length: number;
  width: number;
  angleDeg: number;
}
interface StairDef {
  x: number;
  z: number;
  angleDeg: number;
}
interface CrateDef {
  x: number;
  z: number;
  sx: number;
  sz: number;
  height: number;
}
// A wall/obstacle segment: a box of `length` (local x) by `thickness`
// (local z), centered at (x,z) and rotated by `angle` radians around Y —
// the same oriented-box shape whether it came from a room wall, a
// corridor's side wall, or a crate, so one collision routine (see
// resolveWallCollision) handles all of them, including the 45-degree
// diagonal connectors.
interface Wall {
  x: number;
  z: number;
  length: number;
  thickness: number;
  angle: number;
}

const ROOMS: RoomDef[] = [
  { x: 0, z: 0, sx: 18, sz: 14, open: ["N", "S", "E", "W"] }, // Central Core — fully open hub
  { x: -17, z: 17, sx: 14, sz: 10, open: ["S", "E"] }, // A Upper Room
  { x: 17, z: 17, sx: 14, sz: 10, open: ["S", "W"] }, // B Upper Room
  { x: -17, z: -17, sx: 14, sz: 10, open: ["N", "E"] }, // A Lower Room
  { x: 17, z: -17, sx: 14, sz: 10, open: ["N", "W"] }, // B Lower Room
  { x: -25, z: 0, sx: 10, sz: 12, open: ["E", "N", "S"] }, // West Room
  { x: 25, z: 0, sx: 10, sz: 12, open: ["W", "N", "S"] }, // East Room
];

const CORRIDORS: CorridorDef[] = [
  { x: 0, z: 10.5, length: 24, width: 4, angleDeg: 0 }, // North Main
  { x: 0, z: -10.5, length: 24, width: 4, angleDeg: 0 }, // South Main
  { x: -10.5, z: 0, length: 24, width: 4, angleDeg: 90 }, // West Main
  { x: 10.5, z: 0, length: 24, width: 4, angleDeg: 90 }, // East Main
  { x: -12.5, z: 12.5, length: 10, width: 4, angleDeg: 45 }, // NW 45
  { x: 12.5, z: 12.5, length: 10, width: 4, angleDeg: -45 }, // NE 45
  { x: -12.5, z: -12.5, length: 10, width: 4, angleDeg: -45 }, // SW 45
  { x: 12.5, z: -12.5, length: 10, width: 4, angleDeg: 45 }, // SE 45
  { x: -22, z: 9, length: 8, width: 3.5, angleDeg: 90 }, // West Loop N
  { x: -22, z: -9, length: 8, width: 3.5, angleDeg: 90 }, // West Loop S
  { x: 22, z: 9, length: 8, width: 3.5, angleDeg: 90 }, // East Loop N
  { x: 22, z: -9, length: 8, width: 3.5, angleDeg: 90 }, // East Loop S
];

// Steps=8, rise=0.18m, run=0.32m — same numbers as the source blockout.
const STAIR_STEPS = 8;
const STAIR_RISE = 0.18;
const STAIR_RUN = 0.32;
const STAIR_WIDTH = 3;
const STAIR_RUN_LENGTH = STAIR_STEPS * STAIR_RUN;
const STAIR_RISE_HEIGHT = STAIR_STEPS * STAIR_RISE;
const STAIR_LANDING_DEPTH = 2.2;

const STAIRS: StairDef[] = [
  { x: -7, z: 14, angleDeg: 0 }, // North Stairs
  { x: 7, z: -14, angleDeg: 180 }, // South Stairs
  { x: -14, z: -7, angleDeg: 90 }, // West Stairs
  { x: 14, z: 7, angleDeg: -90 }, // East Stairs
];

const CRATES: CrateDef[] = [
  { x: -5, z: 5, sx: 2, sz: 1, height: 1.2 },
  { x: 5, z: 5, sx: 2, sz: 1, height: 1.2 },
  { x: -5, z: -5, sx: 2, sz: 1, height: 1.2 },
  { x: 5, z: -5, sx: 2, sz: 1, height: 1.2 },
  { x: -24, z: 4, sx: 2, sz: 1, height: 1.2 },
  { x: 24, z: -4, sx: 2, sz: 1, height: 1.2 },
];

const ACCENTS: { x: number; z: number; length: number; angleDeg: number }[] = [
  { x: 0, z: 6.6, length: 8, angleDeg: 0 },
  { x: 0, z: -6.6, length: 8, angleDeg: 0 },
  { x: -9.2, z: 0, length: 5, angleDeg: 90 },
  { x: 9.2, z: 0, length: 5, angleDeg: 90 },
];

function roomWalls(r: RoomDef): Wall[] {
  const walls: Wall[] = [];
  if (!r.open.includes("S")) walls.push({ x: r.x, z: r.z - r.sz / 2, length: r.sx, thickness: WALL_T, angle: 0 });
  if (!r.open.includes("N")) walls.push({ x: r.x, z: r.z + r.sz / 2, length: r.sx, thickness: WALL_T, angle: 0 });
  if (!r.open.includes("W")) walls.push({ x: r.x - r.sx / 2, z: r.z, length: r.sz, thickness: WALL_T, angle: Math.PI / 2 });
  if (!r.open.includes("E")) walls.push({ x: r.x + r.sx / 2, z: r.z, length: r.sz, thickness: WALL_T, angle: Math.PI / 2 });
  return walls;
}

function corridorWalls(c: CorridorDef): Wall[] {
  const a = THREE.MathUtils.degToRad(c.angleDeg);
  const nx = -Math.sin(a);
  const nz = Math.cos(a);
  return [-1, 1].map((s) => ({
    x: c.x + nx * s * (c.width / 2),
    z: c.z + nz * s * (c.width / 2),
    length: c.length,
    thickness: WALL_T,
    angle: a,
  }));
}

function crateWall(c: CrateDef): Wall {
  return { x: c.x, z: c.z, length: c.sx, thickness: c.sz, angle: 0 };
}

const WALLS: Wall[] = [...ROOMS.flatMap(roomWalls), ...CORRIDORS.flatMap(corridorWalls), ...CRATES.map(crateWall)];

// Pushes pos out of a wall's oriented footprint, kicking it out along
// whichever local axis (length or thickness) has the least overlap — same
// approach as the main combat arena's resolveObstacleCollisions, just
// generalized to a rotated box so the 45-degree connectors collide
// correctly too.
function resolveWallCollision(pos: { x: number; z: number }, wall: Wall, pad: number) {
  const cos = Math.cos(wall.angle);
  const sin = Math.sin(wall.angle);
  const dx = pos.x - wall.x;
  const dz = pos.z - wall.z;
  const lx = dx * cos + dz * sin;
  const lz = -dx * sin + dz * cos;
  const halfL = wall.length / 2 + pad;
  const halfT = wall.thickness / 2 + pad;
  if (Math.abs(lx) >= halfL || Math.abs(lz) >= halfT) return;
  const penL = halfL - Math.abs(lx);
  const penT = halfT - Math.abs(lz);
  if (penL < penT) {
    const nlx = halfL * (lx < 0 ? -1 : 1);
    pos.x = wall.x + nlx * cos - lz * sin;
    pos.z = wall.z + nlx * sin + lz * cos;
  } else {
    const nlz = halfT * (lz < 0 ? -1 : 1);
    pos.x = wall.x + lx * cos - nlz * sin;
    pos.z = wall.z + lx * sin + nlz * cos;
  }
}

function resolveAllCollisions(pos: { x: number; z: number }) {
  for (const w of WALLS) resolveWallCollision(pos, w, PLAYER_RADIUS);
  pos.x = clamp(pos.x, -MAP_HALF + PLAYER_RADIUS, MAP_HALF - PLAYER_RADIUS);
  pos.z = clamp(pos.z, -MAP_HALF + PLAYER_RADIUS, MAP_HALF - PLAYER_RADIUS);
}

// Height of the ground under (x,z) — 0 everywhere except on a stair's ramp
// band, where it rises continuously with distance along the run, and on
// its landing deck at the top, where it holds at the full rise height.
function groundHeightAt(x: number, z: number): number {
  for (const st of STAIRS) {
    const a = THREE.MathUtils.degToRad(st.angleDeg);
    const dirX = Math.sin(a);
    const dirZ = Math.cos(a);
    const dx = x - st.x;
    const dz = z - st.z;
    const along = dx * dirX + dz * dirZ;
    const perp = dx * dirZ - dz * dirX;
    if (Math.abs(perp) > STAIR_WIDTH / 2) continue;
    if (along < 0) continue;
    if (along <= STAIR_RUN_LENGTH) return THREE.MathUtils.lerp(0, STAIR_RISE_HEIGHT, along / STAIR_RUN_LENGTH);
    if (along <= STAIR_RUN_LENGTH + STAIR_LANDING_DEPTH) return STAIR_RISE_HEIGHT;
  }
  return 0;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function CypherPhunkArena({ onExit }: { onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);
  // "walk" (grounded, collides with walls/stairs) vs "fly" (free-fly bird's-
  // eye camera, no collision) — modeRef is what the render loop reads each
  // frame, modeUi is only for the HUD text/button label.
  const modeRef = useRef<"walk" | "fly">("walk");
  const [modeUi, setModeUi] = useState<"walk" | "fly">("walk");
  const toggleModeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;

    const scene = new THREE.Scene();
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(SKY_RADIUS, 24, 16),
      new THREE.MeshBasicMaterial({ map: createSkyTexture(), side: THREE.BackSide, fog: false }),
    );
    scene.add(sky);
    scene.fog = new THREE.Fog(0x2f5678, FOG_NEAR, FOG_FAR);

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, SKY_RADIUS + 20);
    camera.position.set(0, EYE_HEIGHT, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.5, 0.4, 0.85);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x5a6478, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(20, 40, 15);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 100;
    key.shadow.camera.left = -MAP_HALF - 4;
    key.shadow.camera.right = MAP_HALF + 4;
    key.shadow.camera.top = MAP_HALF + 4;
    key.shadow.camera.bottom = -MAP_HALF - 4;
    key.shadow.bias = -0.0015;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    scene.add(key.target);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Ground — one solid slab under the whole footprint (matches the
    // source blockout's Map_Floor), so gaps between structures are still
    // walkable open ground rather than voids.
    const floorTileSize = 4;
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_HALF * 2, MAP_HALF * 2),
      new THREE.MeshStandardMaterial({
        map: createSciFiFloorTexture((MAP_HALF * 2) / floorTileSize, maxAniso),
        roughness: 0.6,
        metalness: 0.35,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Walls — every entry in WALLS gets one real, textured, collidable box.
    const addWallMesh = (w: Wall, variant: 0 | 1 = 0) => {
      const wallMat = new THREE.MeshStandardMaterial({
        map: createSciFiWallTexture(w.length / 2.5, WALL_H / 2.5, maxAniso, variant),
        roughness: 0.7,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.length, WALL_H, w.thickness), wallMat);
      mesh.position.set(w.x, WALL_H / 2, w.z);
      mesh.rotation.y = -w.angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    };
    ROOMS.flatMap(roomWalls).forEach((w) => addWallMesh(w, 0));
    CORRIDORS.flatMap(corridorWalls).forEach((w) => addWallMesh(w, 1));
    CRATES.forEach((c) => {
      const mat = new THREE.MeshStandardMaterial({
        map: createSciFiWallTexture(c.sx / 1.5, c.height / 1.5, maxAniso, 0),
        roughness: 0.75,
        metalness: 0.25,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(c.sx, c.height, c.sz), mat);
      mesh.position.set(c.x, c.height / 2, c.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });

    // Central Core platform — a low dais, purely cosmetic (no elevation
    // gameplay), matching the blockout's Core_Platform.
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.15, 6),
      new THREE.MeshStandardMaterial({ color: PURPLE, roughness: 0.35, metalness: 0.35, emissive: PURPLE, emissiveIntensity: 0.15 }),
    );
    platform.position.set(0, 0.075, 0);
    platform.receiveShadow = true;
    scene.add(platform);

    // Accent strips — thin glowing purple floor lines near the core.
    ACCENTS.forEach((s) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(s.length, 0.06, 0.35),
        new THREE.MeshStandardMaterial({ color: PURPLE, emissive: PURPLE, emissiveIntensity: 1.6, roughness: 0.4 }),
      );
      mesh.position.set(s.x, 0.03, s.z);
      mesh.rotation.y = -THREE.MathUtils.degToRad(s.angleDeg);
      scene.add(mesh);
    });

    // Stairs — real stepped geometry rising to a small landing deck, with
    // matching functional ramp collision in groundHeightAt above.
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.5, metalness: 0.4 });
    STAIRS.forEach((st) => {
      const a = THREE.MathUtils.degToRad(st.angleDeg);
      const dirX = Math.sin(a);
      const dirZ = Math.cos(a);
      for (let i = 0; i < STAIR_STEPS; i++) {
        const runSoFar = (i + 1) * STAIR_RUN;
        const riseSoFar = (i + 1) * STAIR_RISE;
        const px = st.x + dirX * (runSoFar - STAIR_RUN / 2);
        const pz = st.z + dirZ * (runSoFar - STAIR_RUN / 2);
        const step = new THREE.Mesh(new THREE.BoxGeometry(STAIR_WIDTH, riseSoFar, STAIR_RUN), stepMat);
        step.position.set(px, riseSoFar / 2, pz);
        step.rotation.y = a;
        step.castShadow = true;
        step.receiveShadow = true;
        scene.add(step);
      }
      // Landing deck at the top.
      const landingCenter = STAIR_RUN_LENGTH + STAIR_LANDING_DEPTH / 2;
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(STAIR_WIDTH, 0.2, STAIR_LANDING_DEPTH),
        new THREE.MeshStandardMaterial({
          map: createSciFiFloorTexture(1.5, maxAniso),
          roughness: 0.6,
          metalness: 0.3,
        }),
      );
      deck.position.set(st.x + dirX * landingCenter, STAIR_RISE_HEIGHT - 0.1, st.z + dirZ * landingCenter);
      deck.rotation.y = a;
      deck.receiveShadow = true;
      scene.add(deck);
    });

    // ---------------- player state / controls ----------------
    const player = { x: 0, z: 24, y: 0 };
    const flyPos = { x: 0, y: 45, z: 24 };
    let yaw = 0;
    let pitch = -0.05;
    const keys = new Set<string>();
    let sprinting = false;
    let pointerLocked = false;

    // Switching to fly: jump the free camera above wherever the player is
    // standing and tilt the view down, for an immediate bird's-eye look.
    // Switching back to walk: land the player under wherever the fly
    // camera ended up (clamped/collision-resolved), not back at the old
    // walking spot.
    toggleModeRef.current = () => {
      if (modeRef.current === "walk") {
        flyPos.x = player.x;
        flyPos.y = Math.max(player.y + 40, 30);
        flyPos.z = player.z;
        pitch = clamp(pitch - 0.6, -1.4, 1.4);
        modeRef.current = "fly";
      } else {
        player.x = flyPos.x;
        player.z = flyPos.z;
        resolveAllCollisions(player);
        pitch = clamp(pitch, -1.3, 0.4);
        modeRef.current = "walk";
      }
      setModeUi(modeRef.current);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.code);
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sprinting = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sprinting = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const LOOK_SENS = 0.0024;
    const onMouseMove = (e: MouseEvent) => {
      if (!pointerLocked) return;
      yaw -= e.movementX * LOOK_SENS;
      pitch = clamp(pitch - e.movementY * LOOK_SENS, -1.3, 1.3);
    };
    window.addEventListener("mousemove", onMouseMove);

    const onClick = () => {
      if (!pointerLocked && !("ontouchstart" in window)) renderer.domElement.requestPointerLock?.();
    };
    renderer.domElement.addEventListener("click", onClick);
    const onPointerLockChange = () => {
      pointerLocked = document.pointerLockElement === renderer.domElement;
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);

    // Touch: virtual joystick (movement) + drag-to-look on the rest of the
    // view, mirroring the main arena's mobile control scheme.
    const joystickVec = { x: 0, y: 0 };
    let joystickTouchId: number | null = null;
    let lookTouchId: number | null = null;
    let lookLastX = 0;
    let lookLastY = 0;
    const TOUCH_LOOK_SENS = 0.0034;

    const joystickBase = joystickBaseRef.current;
    const joystickKnob = joystickKnobRef.current;
    const JOY_RADIUS = 48;

    const onTouchStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const joyRect = joystickBase?.getBoundingClientRect();
        const insideJoy =
          joyRect && t.clientX >= joyRect.left - 30 && t.clientX <= joyRect.right + 30 && t.clientY >= joyRect.top - 30 && t.clientY <= joyRect.bottom + 30;
        if (insideJoy && joystickTouchId === null) {
          joystickTouchId = t.identifier;
        } else if (lookTouchId === null) {
          lookTouchId = t.identifier;
          lookLastX = t.clientX;
          lookLastY = t.clientY;
        }
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joystickTouchId && joystickBase) {
          const rect = joystickBase.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          let dx = t.clientX - cx;
          let dy = t.clientY - cy;
          const len = Math.hypot(dx, dy);
          if (len > JOY_RADIUS) {
            dx = (dx / len) * JOY_RADIUS;
            dy = (dy / len) * JOY_RADIUS;
          }
          joystickVec.x = dx / JOY_RADIUS;
          joystickVec.y = dy / JOY_RADIUS;
          if (joystickKnob) joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (t.identifier === lookTouchId) {
          const dx = t.clientX - lookLastX;
          const dy = t.clientY - lookLastY;
          lookLastX = t.clientX;
          lookLastY = t.clientY;
          yaw -= dx * TOUCH_LOOK_SENS;
          pitch = clamp(pitch - dy * TOUCH_LOOK_SENS, -1.3, 1.3);
        }
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joystickTouchId) {
          joystickTouchId = null;
          joystickVec.x = 0;
          joystickVec.y = 0;
          if (joystickKnob) joystickKnob.style.transform = "translate(0px, 0px)";
        }
        if (t.identifier === lookTouchId) lookTouchId = null;
      }
    };
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    let displayY = 0;
    let last = performance.now();
    const animate = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const joyMag = Math.hypot(joystickVec.x, joystickVec.y);

      if (modeRef.current === "fly") {
        // No-clip flycam: "forward" follows the full look direction
        // (including pitch), so looking up and pushing forward climbs,
        // looking down and pushing forward descends — the natural way to
        // fly up for a bird's-eye view and swoop back down.
        const fx = -Math.sin(yaw) * Math.cos(pitch);
        const fy = Math.sin(pitch);
        const fz = -Math.cos(yaw) * Math.cos(pitch);
        const rx = Math.cos(yaw);
        const rz = -Math.sin(yaw);

        let mx = 0;
        let my = 0;
        let mz = 0;
        if (keys.has("KeyW") || keys.has("ArrowUp")) {
          mx += fx;
          my += fy;
          mz += fz;
        }
        if (keys.has("KeyS") || keys.has("ArrowDown")) {
          mx -= fx;
          my -= fy;
          mz -= fz;
        }
        if (keys.has("KeyD") || keys.has("ArrowRight")) {
          mx += rx;
          mz += rz;
        }
        if (keys.has("KeyA") || keys.has("ArrowLeft")) {
          mx -= rx;
          mz -= rz;
        }
        if (joyMag > 0.05) {
          mx = fx * -joystickVec.y + rx * joystickVec.x;
          my = fy * -joystickVec.y;
          mz = fz * -joystickVec.y + rz * joystickVec.x;
        }
        const mLen = Math.hypot(mx, my, mz);
        const flySpeed = FLY_SPEED * (sprinting ? SPRINT_MULT : 1);
        if (mLen > 0.001) {
          flyPos.x += (mx / mLen) * flySpeed * dt * Math.min(mLen, 1);
          flyPos.y += (my / mLen) * flySpeed * dt * Math.min(mLen, 1);
          flyPos.z += (mz / mLen) * flySpeed * dt * Math.min(mLen, 1);
        }
        flyPos.x = clamp(flyPos.x, -MAP_HALF - 25, MAP_HALF + 25);
        flyPos.z = clamp(flyPos.z, -MAP_HALF - 25, MAP_HALF + 25);
        flyPos.y = clamp(flyPos.y, 3, 150);

        camera.position.set(flyPos.x, flyPos.y, flyPos.z);
      } else {
        const forwardX = -Math.sin(yaw);
        const forwardZ = -Math.cos(yaw);
        const rightX = Math.cos(yaw);
        const rightZ = -Math.sin(yaw);

        let moveX = 0;
        let moveZ = 0;
        if (keys.has("KeyW") || keys.has("ArrowUp")) {
          moveX += forwardX;
          moveZ += forwardZ;
        }
        if (keys.has("KeyS") || keys.has("ArrowDown")) {
          moveX -= forwardX;
          moveZ -= forwardZ;
        }
        if (keys.has("KeyD") || keys.has("ArrowRight")) {
          moveX += rightX;
          moveZ += rightZ;
        }
        if (keys.has("KeyA") || keys.has("ArrowLeft")) {
          moveX -= rightX;
          moveZ -= rightZ;
        }
        // Joystick overrides keyboard when active (mobile).
        if (joyMag > 0.05) {
          moveX = forwardX * -joystickVec.y + rightX * joystickVec.x;
          moveZ = forwardZ * -joystickVec.y + rightZ * joystickVec.x;
        }
        const moveLen = Math.hypot(moveX, moveZ);
        const speed = PLAYER_SPEED * (sprinting ? SPRINT_MULT : 1);
        if (moveLen > 0.001) {
          player.x += (moveX / moveLen) * speed * dt * Math.min(moveLen, 1);
          player.z += (moveZ / moveLen) * speed * dt * Math.min(moveLen, 1);
        }
        resolveAllCollisions(player);

        const targetY = groundHeightAt(player.x, player.z);
        displayY += (targetY - displayY) * Math.min(dt * 8, 1);
        player.y = displayY;

        camera.position.set(player.x, player.y + EYE_HEIGHT, player.z);
      }
      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;

      sky.position.set(camera.position.x, camera.position.y, camera.position.z);

      composer.render();
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    setRunning(true);

    return () => {
      disposed = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      renderer.domElement.removeEventListener("click", onClick);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "#000" }}>
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          color: "#e8d9ff",
          fontFamily: "sans-serif",
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
          CYPHER PHUNK — TEST MAP {modeUi === "fly" ? "· BIRD VIEW" : ""}
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
          {!running
            ? "Loading…"
            : modeUi === "fly"
              ? "WASD / joystick to fly (look up/down + forward to climb/descend) · Shift to speed up"
              : "WASD / joystick to move · drag or click+move to look · Shift to sprint"}
        </div>
      </div>

      <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 8 }}>
        <button
          onClick={() => toggleModeRef.current()}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid rgba(232,217,255,0.4)",
            background: modeUi === "fly" ? "rgba(85,25,140,0.75)" : "rgba(20,10,30,0.65)",
            color: "#e8d9ff",
            fontFamily: "sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: "pointer",
          }}
        >
          {modeUi === "fly" ? "🧍 WALK" : "🦅 BIRD VIEW"}
        </button>
        <button
          onClick={onExit}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid rgba(232,217,255,0.4)",
            background: "rgba(20,10,30,0.65)",
            color: "#e8d9ff",
            fontFamily: "sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 0.5,
            cursor: "pointer",
          }}
        >
          EXIT
        </button>
      </div>

      {/* Virtual joystick — visible only as a touch target; harmless on desktop. */}
      <div
        ref={joystickBaseRef}
        style={{
          position: "absolute",
          left: 28,
          bottom: 28,
          width: 96,
          height: 96,
          borderRadius: "50%",
          background: "rgba(232,217,255,0.12)",
          border: "1px solid rgba(232,217,255,0.35)",
          touchAction: "none",
        }}
      >
        <div
          ref={joystickKnobRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 40,
            height: 40,
            marginLeft: -20,
            marginTop: -20,
            borderRadius: "50%",
            background: "rgba(232,217,255,0.55)",
            transition: "transform 40ms linear",
          }}
        />
      </div>
    </div>
  );
}
