import * as THREE from "three";

export const ARENA_HALF = 19;
export const TOTAL_ENEMIES = 10;
export const MAX_ALIVE = 3;
export const MAG_SIZE = 30;
export const RELOAD_MS = 1500;
export const FIRE_INTERVAL_MS = 130;
export const PLAYER_EYE = 1.6;
export const PLAYER_SPEED = 5.2;

export interface ObstacleBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

// Static arena layout. Player spawns at (0, 13) looking toward -Z (arena center).
export const OBSTACLES: ObstacleBox[] = [
  { minX: -1.8, maxX: 1.8, minZ: -1.8, maxZ: 1.8, height: 2.4 },
  { minX: -9.5, maxX: -6.0, minZ: -9.5, maxZ: -7.0, height: 1.6 },
  { minX: 6.0, maxX: 9.5, minZ: -9.5, maxZ: -7.0, height: 1.6 },
  { minX: -12.0, maxX: -9.5, minZ: 3.0, maxZ: 6.5, height: 2.0 },
  { minX: 9.5, maxX: 12.0, minZ: 3.0, maxZ: 6.5, height: 2.0 },
  { minX: -6.0, maxX: -3.5, minZ: 5.5, maxZ: 8.0, height: 1.2 },
  { minX: 3.5, maxX: 6.0, minZ: 5.5, maxZ: 8.0, height: 1.2 },
  { minX: -7.0, maxX: -4.5, minZ: -2.5, maxZ: -0.5, height: 1.0 },
  { minX: 4.5, maxX: 7.0, minZ: -1.0, maxZ: 1.5, height: 1.0 },
  { minX: -2.0, maxX: 2.0, minZ: -12.5, maxZ: -10.5, height: 1.4 },
];

export const ENEMY_SPAWNS: [number, number][] = [
  [-15, -15],
  [15, -15],
  [-15, 0],
  [15, 0],
  [0, -15],
  [-15, 15],
  [15, 15],
];

export interface EnemyState {
  id: number;
  position: THREE.Vector3;
  health: number;
  spawned: boolean;
  alive: boolean;
  spawnedAt: number;
  deadAt: number;
  hitAt: number;
  nextFireAt: number;
  strafePhase: number;
  speed: number;
  lastPos: THREE.Vector3;
  stuckFrames: number;
  avoidUntil: number;
  avoidSign: 1 | -1;
}

export type GameStatus = "countdown" | "playing" | "victory" | "defeat";

export interface World {
  input: {
    keys: Set<string>;
    joy: { x: number; y: number };
    lookDX: number;
    lookDY: number;
    firing: boolean;
    reloadRequested: boolean;
  };
  player: {
    position: THREE.Vector3;
    yaw: number;
    pitch: number;
    health: number;
    ammo: number;
    reloading: boolean;
    reloadEndAt: number;
    lastDamageAt: number;
  };
  enemies: EnemyState[];
  kills: number;
  shotsFired: number;
  shotsHit: number;
  status: GameStatus;
  startedAt: number;
  endedAt: number;
  nextSpawnAt: number;
}

export function createWorld(): World {
  return {
    input: {
      keys: new Set(),
      joy: { x: 0, y: 0 },
      lookDX: 0,
      lookDY: 0,
      firing: false,
      reloadRequested: false,
    },
    player: {
      position: new THREE.Vector3(0, 0, 13),
      yaw: 0,
      pitch: 0,
      health: 100,
      ammo: MAG_SIZE,
      reloading: false,
      reloadEndAt: 0,
      lastDamageAt: 0,
    },
    enemies: Array.from({ length: TOTAL_ENEMIES }, (_, i) => ({
      id: i,
      position: new THREE.Vector3(0, 0, -100),
      health: 100,
      spawned: false,
      alive: false,
      spawnedAt: 0,
      deadAt: 0,
      hitAt: 0,
      nextFireAt: 0,
      strafePhase: Math.random() * Math.PI * 2,
      speed: 2.1 + Math.random() * 0.7,
      lastPos: new THREE.Vector3(0, 0, -100),
      stuckFrames: 0,
      avoidUntil: 0,
      avoidSign: 1,
    })),
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    status: "countdown",
    startedAt: 0,
    endedAt: 0,
    nextSpawnAt: 0,
  };
}

/** Push a circle of radius r out of every obstacle AABB and clamp to arena bounds. Mutates pos. */
export function collideCircle(pos: THREE.Vector3, r: number): void {
  for (const b of OBSTACLES) {
    const minX = b.minX - r;
    const maxX = b.maxX + r;
    const minZ = b.minZ - r;
    const maxZ = b.maxZ + r;
    if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
      const dxl = pos.x - minX;
      const dxr = maxX - pos.x;
      const dzl = pos.z - minZ;
      const dzr = maxZ - pos.z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) pos.x = minX;
      else if (m === dxr) pos.x = maxX;
      else if (m === dzl) pos.z = minZ;
      else pos.z = maxZ;
    }
  }
  pos.x = THREE.MathUtils.clamp(pos.x, -ARENA_HALF + r, ARENA_HALF - r);
  pos.z = THREE.MathUtils.clamp(pos.z, -ARENA_HALF + r, ARENA_HALF - r);
}

const _ray = new THREE.Ray();
const _box = new THREE.Box3();
const _hitPoint = new THREE.Vector3();
const _dir = new THREE.Vector3();

/** True if any obstacle blocks the segment from -> to. */
export function losBlocked(from: THREE.Vector3, to: THREE.Vector3): boolean {
  const dist = from.distanceTo(to);
  _dir.copy(to).sub(from).normalize();
  _ray.set(from, _dir);
  for (const b of OBSTACLES) {
    _box.min.set(b.minX, 0, b.minZ);
    _box.max.set(b.maxX, b.height, b.maxZ);
    const hit = _ray.intersectBox(_box, _hitPoint);
    if (hit && from.distanceTo(_hitPoint) < dist - 0.01) return true;
  }
  return false;
}

export interface EnemyHit {
  enemy: EnemyState;
  headshot: boolean;
  distance: number;
}

const _sphere = new THREE.Sphere();
const _center = new THREE.Vector3();

/**
 * Ray vs enemy hit test: head sphere (headshot) and chest sphere, nearest alive
 * enemy wins, obstacles occlude. Enemy position is at the feet.
 */
export function raycastEnemies(
  world: World,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
): EnemyHit | null {
  _ray.set(origin, direction);
  let best: EnemyHit | null = null;
  for (const e of world.enemies) {
    if (!e.spawned || !e.alive) continue;

    _center.copy(e.position).setY(e.position.y + 1.68);
    _sphere.set(_center, 0.3);
    let point = _ray.intersectSphere(_sphere, _hitPoint);
    let headshot = true;

    if (!point) {
      _center.copy(e.position).setY(e.position.y + 1.0);
      _sphere.set(_center, 0.52);
      point = _ray.intersectSphere(_sphere, _hitPoint);
      headshot = false;
    }
    if (!point) continue;

    const distance = origin.distanceTo(point);
    if (best && distance >= best.distance) continue;
    if (losBlocked(origin, point)) continue;
    best = { enemy: e, headshot, distance };
  }
  return best;
}

/** Pick an enemy spawn point at least minDist from the player, preferring far ones. */
export function pickSpawnPoint(world: World, minDist = 12): [number, number] {
  const p = world.player.position;
  const candidates = ENEMY_SPAWNS.filter(
    ([x, z]) => Math.hypot(x - p.x, z - p.z) >= minDist,
  );
  const pool = candidates.length > 0 ? candidates : ENEMY_SPAWNS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------------------------
// Tiny WebAudio synth SFX (no assets needed). Context is created lazily on
// first call, which always happens from a user-gesture-driven code path.
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function blip(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
): void {
  const ac = ctx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration);
}

export const sfx = {
  shot(): void {
    blip(220, 40, 0.09, "sawtooth", 0.12);
    blip(1200, 200, 0.04, "square", 0.04);
  },
  enemyShot(): void {
    blip(150, 45, 0.1, "sawtooth", 0.05);
  },
  hit(): void {
    blip(900, 700, 0.05, "square", 0.07);
  },
  kill(): void {
    blip(500, 1000, 0.12, "square", 0.09);
    blip(750, 1500, 0.14, "square", 0.07, 0.07);
  },
  reload(): void {
    blip(300, 150, 0.08, "square", 0.06);
    blip(150, 350, 0.08, "square", 0.06, RELOAD_MS / 1000 - 0.1);
  },
  damage(): void {
    blip(120, 60, 0.18, "sawtooth", 0.1);
  },
  victory(): void {
    blip(440, 440, 0.12, "square", 0.08);
    blip(554, 554, 0.12, "square", 0.08, 0.12);
    blip(659, 659, 0.12, "square", 0.08, 0.24);
    blip(880, 880, 0.3, "square", 0.09, 0.36);
  },
  defeat(): void {
    blip(300, 280, 0.25, "sawtooth", 0.08);
    blip(240, 220, 0.25, "sawtooth", 0.08, 0.25);
    blip(180, 120, 0.5, "sawtooth", 0.09, 0.5);
  },
};
