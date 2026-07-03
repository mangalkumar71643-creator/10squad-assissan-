import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  World,
  collideCircle,
  losBlocked,
  pickSpawnPoint,
  sfx,
  MAX_ALIVE,
  PLAYER_EYE,
  TOTAL_ENEMIES,
} from "@/game/world";

const TRACER_POOL = 8;
const TRACER_LIFE_MS = 130;

const _toPlayer = new THREE.Vector3();
const _strafe = new THREE.Vector3();
const _eye = new THREE.Vector3();
const _playerEye = new THREE.Vector3();

interface TracerSlot {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  bornAt: number;
}

export default function EnemySquad({ world }: { world: World }) {
  const { camera } = useThree();
  const groupRefs = useRef<(THREE.Group | null)[]>([]);
  const barRefs = useRef<(THREE.Group | null)[]>([]);
  const barFillRefs = useRef<(THREE.Mesh | null)[]>([]);
  const visorMats = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  const tracers = useMemo<TracerSlot[]>(() => {
    const slots: TracerSlot[] = [];
    for (let i = 0; i < TRACER_POOL; i++) {
      const geom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]);
      const material = new THREE.LineBasicMaterial({
        color: "#ff5522",
        transparent: true,
        opacity: 0,
      });
      slots.push({ line: new THREE.Line(geom, material), material, bornAt: -1e9 });
    }
    return slots;
  }, []);

  const fireTracer = (from: THREE.Vector3, to: THREE.Vector3, now: number) => {
    let slot = tracers[0];
    for (const t of tracers) if (t.bornAt < slot.bornAt) slot = t;
    slot.bornAt = now;
    const pos = slot.line.geometry.getAttribute("position") as THREE.BufferAttribute;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, to.x, to.y, to.z);
    pos.needsUpdate = true;
  };

  useFrame((_, delta) => {
    const now = performance.now();
    const dt = Math.min(delta, 0.1);
    const playerPos = world.player.position;
    _playerEye.set(playerPos.x, PLAYER_EYE, playerPos.z);

    // --- Spawning ---
    if (world.status === "playing") {
      const aliveCount = world.enemies.filter((e) => e.spawned && e.alive).length;
      const spawnedCount = world.enemies.filter((e) => e.spawned).length;
      if (
        aliveCount < MAX_ALIVE &&
        spawnedCount < TOTAL_ENEMIES &&
        now >= world.nextSpawnAt
      ) {
        const next = world.enemies.find((e) => !e.spawned);
        if (next) {
          const [x, z] = pickSpawnPoint(world);
          next.position.set(x, 0, z);
          next.spawned = true;
          next.alive = true;
          next.health = 100;
          next.spawnedAt = now;
          next.nextFireAt = now + 1200 + Math.random() * 800;
          world.nextSpawnAt = now + 900;
        }
      }
    }

    // --- Per-enemy AI + visuals ---
    for (let i = 0; i < world.enemies.length; i++) {
      const e = world.enemies[i];
      const group = groupRefs.current[i];
      if (!group) continue;

      if (!e.spawned) {
        group.visible = false;
        continue;
      }

      if (!e.alive) {
        // Death: fall over, then hide.
        const t = (now - e.deadAt) / 1000;
        group.visible = t < 1.2;
        group.rotation.x = -Math.min(t * 2.5, 1) * (Math.PI / 2);
        const bar = barRefs.current[i];
        if (bar) bar.visible = false;
        continue;
      }

      group.visible = true;
      _toPlayer.copy(playerPos).sub(e.position);
      _toPlayer.y = 0;
      const dist = _toPlayer.length();
      _toPlayer.normalize();

      if (world.status === "playing") {
        // Advance until ~9m; side-step for a while when stuck on cover.
        _strafe.set(-_toPlayer.z, 0, _toPlayer.x);
        const wantsToMove = dist > 9;
        if (wantsToMove) {
          if (now < e.avoidUntil) {
            e.position.addScaledVector(_strafe, e.avoidSign * e.speed * dt);
          } else {
            e.position.addScaledVector(_toPlayer, e.speed * dt);
          }
        }
        e.position.addScaledVector(
          _strafe,
          Math.sin(now / 1000 + e.strafePhase) * 1.1 * dt,
        );
        collideCircle(e.position, 0.5);

        // Stuck detection: not actually closing distance to the player while
        // trying to advance -> side-step around the cover for a while.
        if (wantsToMove && now >= e.avoidUntil) {
          const closed =
            e.lastPos.distanceTo(playerPos) - e.position.distanceTo(playerPos);
          if (closed < e.speed * dt * 0.3) {
            e.stuckFrames += 1;
            if (e.stuckFrames > 12) {
              e.stuckFrames = 0;
              e.avoidUntil = now + 900;
              e.avoidSign = Math.random() < 0.5 ? 1 : -1;
            }
          } else {
            e.stuckFrames = 0;
          }
        }
        e.lastPos.copy(e.position);

        // Fire at the player when LOS is clear.
        if (now >= e.nextFireAt && now - e.spawnedAt > 800 && dist < 26) {
          e.nextFireAt = now + 1400 + Math.random() * 800;
          _eye.set(e.position.x, e.position.y + 1.55, e.position.z);
          if (!losBlocked(_eye, _playerEye)) {
            fireTracer(_eye, _playerEye, now);
            sfx.enemyShot();
            const hitChance = THREE.MathUtils.clamp(0.75 - dist * 0.02, 0.15, 0.7);
            if (Math.random() < hitChance) {
              const dmg = 6 + Math.random() * 8;
              world.player.health = Math.max(0, world.player.health - dmg);
              world.player.lastDamageAt = now;
              sfx.damage();
              window.dispatchEvent(new Event("game:damage"));
              if (world.player.health <= 0) {
                world.status = "defeat";
                world.endedAt = now;
                sfx.defeat();
              }
            }
          }
        }
      }

      group.position.copy(e.position);
      group.rotation.set(0, Math.atan2(playerPos.x - e.position.x, playerPos.z - e.position.z), 0);

      // Hit flash on the visor.
      const visor = visorMats.current[i];
      if (visor) visor.emissiveIntensity = now - e.hitAt < 90 ? 8 : 3;

      // Billboard health bar.
      const bar = barRefs.current[i];
      const fill = barFillRefs.current[i];
      if (bar && fill) {
        bar.visible = true;
        bar.quaternion.copy(camera.quaternion);
        const h = Math.max(0, e.health) / 100;
        fill.scale.x = Math.max(h, 0.001);
        fill.position.x = -0.45 * (1 - h);
      }
    }

    // --- Tracer fade ---
    for (const t of tracers) {
      const age = now - t.bornAt;
      t.material.opacity = age < TRACER_LIFE_MS ? 1 - age / TRACER_LIFE_MS : 0;
    }
  });

  return (
    <group>
      {tracers.map((t, i) => (
        <primitive key={`tracer-${i}`} object={t.line} />
      ))}
      {world.enemies.map((e, i) => (
        <group key={e.id} ref={(g) => { groupRefs.current[i] = g; }} visible={false}>
          {/* Body */}
          <mesh position={[0, 1.0, 0]}>
            <capsuleGeometry args={[0.32, 0.75, 4, 10]} />
            <meshStandardMaterial color="#4a5266" roughness={0.5} metalness={0.55} />
          </mesh>
          {/* Chest core */}
          <mesh position={[0, 1.15, 0.26]}>
            <boxGeometry args={[0.18, 0.1, 0.06]} />
            <meshStandardMaterial
              color="#ff8800"
              emissive="#ff8800"
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
          {/* Head */}
          <mesh position={[0, 1.68, 0]}>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshStandardMaterial color="#3a4150" roughness={0.4} metalness={0.65} />
          </mesh>
          {/* Visor */}
          <mesh position={[0, 1.7, 0.17]}>
            <boxGeometry args={[0.26, 0.07, 0.06]} />
            <meshStandardMaterial
              ref={(m) => { visorMats.current[i] = m; }}
              color="#ff2244"
              emissive="#ff2244"
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>
          {/* Gun */}
          <mesh position={[0.28, 1.25, 0.28]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.07, 0.09, 0.5]} />
            <meshStandardMaterial color="#22262f" roughness={0.35} metalness={0.8} />
          </mesh>
          {/* Health bar */}
          <group ref={(g) => { barRefs.current[i] = g; }} position={[0, 2.15, 0]}>
            <mesh>
              <planeGeometry args={[0.94, 0.11]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.6} />
            </mesh>
            <mesh ref={(m) => { barFillRefs.current[i] = m; }} position={[0, 0, 0.001]}>
              <planeGeometry args={[0.9, 0.07]} />
              <meshBasicMaterial color="#ff3344" toneMapped={false} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}
