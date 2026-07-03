import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  World,
  collideCircle,
  raycastEnemies,
  sfx,
  FIRE_INTERVAL_MS,
  MAG_SIZE,
  RELOAD_MS,
  PLAYER_EYE,
  PLAYER_SPEED,
  TOTAL_ENEMIES,
} from "@/game/world";

useGLTF.preload("/assets/purple-mirage-rifle.glb");

const _move = new THREE.Vector3();
const _camDir = new THREE.Vector3();

export default function PlayerRig({ world }: { world: World }) {
  const { camera } = useThree();
  const rifleGroupRef = useRef<THREE.Group>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const recoil = useRef(0);
  const bobTime = useRef(0);
  const nextShotAt = useRef(0);
  const flashUntil = useRef(0);

  const { scene: rifleScene } = useGLTF("/assets/purple-mirage-rifle.glb");

  // Clone + normalize the rifle (same approach as RifleInHands.tsx) so the
  // lobby viewer and the in-hands model don't fight over one scene graph.
  const rifle = useMemo(() => {
    const cloned = rifleScene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 0.6 / maxDim;

    const holder = new THREE.Group();
    cloned.scale.setScalar(scale);
    cloned.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    holder.add(cloned);

    cloned.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        const c = mat.color;
        if (c.b > 0.4 && c.r > 0.2) {
          mat.emissive.set("#7722cc");
          mat.emissiveIntensity = 2.2;
        }
        if (c.r + c.g + c.b > 2.0) {
          mat.emissive.set("#cc88ff");
          mat.emissiveIntensity = 1.5;
        }
      });
    });
    return holder;
  }, [rifleScene]);

  // The camera is the player's head; rendering it via <primitive> below puts
  // it in the scene graph so the rifle group can ride along as a child.
  useEffect(() => {
    camera.rotation.order = "YXZ";
  }, [camera]);

  useFrame((_, delta) => {
    const p = world.player;
    const input = world.input;
    const now = performance.now();
    const dt = Math.min(delta, 0.1);

    // --- Look ---
    if (world.status === "playing" || world.status === "countdown") {
      p.yaw -= input.lookDX * 0.0032;
      p.pitch = THREE.MathUtils.clamp(p.pitch - input.lookDY * 0.0032, -1.25, 1.25);
    }
    input.lookDX = 0;
    input.lookDY = 0;

    // --- Movement ---
    if (world.status === "playing") {
      let mx = input.joy.x;
      let my = input.joy.y;
      if (input.keys.has("w")) my -= 1;
      if (input.keys.has("s")) my += 1;
      if (input.keys.has("a")) mx -= 1;
      if (input.keys.has("d")) mx += 1;
      const len = Math.hypot(mx, my);
      if (len > 1) {
        mx /= len;
        my /= len;
      }
      if (len > 0.01) {
        const sin = Math.sin(p.yaw);
        const cos = Math.cos(p.yaw);
        // forward = (-sin, -cos), right = (cos, -sin) in XZ for yaw around Y
        _move.set(-sin * -my + cos * mx, 0, -cos * -my - sin * mx);
        p.position.addScaledVector(_move, PLAYER_SPEED * dt);
        collideCircle(p.position, 0.45);
        bobTime.current += dt * Math.min(len, 1) * 9;
      }
    }

    camera.position.set(p.position.x, PLAYER_EYE, p.position.z);
    camera.rotation.set(p.pitch, p.yaw, 0);

    if (world.status !== "playing") {
      if (flashRef.current) flashRef.current.visible = false;
      if (flashLightRef.current) flashLightRef.current.intensity = 0;
      return;
    }

    // --- Reload ---
    if (input.reloadRequested) {
      input.reloadRequested = false;
      if (!p.reloading && p.ammo < MAG_SIZE) {
        p.reloading = true;
        p.reloadEndAt = now + RELOAD_MS;
        sfx.reload();
      }
    }
    if (p.reloading && now >= p.reloadEndAt) {
      p.reloading = false;
      p.ammo = MAG_SIZE;
    }

    // --- Firing ---
    if (input.firing && !p.reloading && now >= nextShotAt.current) {
      if (p.ammo <= 0) {
        p.reloading = true;
        p.reloadEndAt = now + RELOAD_MS;
        sfx.reload();
      } else {
        nextShotAt.current = now + FIRE_INTERVAL_MS;
        p.ammo -= 1;
        world.shotsFired += 1;
        recoil.current = 1;
        flashUntil.current = now + 55;
        sfx.shot();

        camera.getWorldDirection(_camDir);
        const hit = raycastEnemies(world, camera.position, _camDir);
        if (hit) {
          world.shotsHit += 1;
          hit.enemy.health -= hit.headshot ? 100 : 40;
          hit.enemy.hitAt = now;
          window.dispatchEvent(new Event("game:hitmarker"));
          sfx.hit();
          if (hit.enemy.health <= 0 && hit.enemy.alive) {
            hit.enemy.alive = false;
            hit.enemy.deadAt = now;
            world.kills += 1;
            sfx.kill();
            if (world.kills >= TOTAL_ENEMIES) {
              world.status = "victory";
              world.endedAt = now;
              sfx.victory();
            }
          }
        }
      }
    }

    // --- Health regen (after 4s without damage) ---
    if (p.health > 0 && p.health < 100 && now - p.lastDamageAt > 4000) {
      p.health = Math.min(100, p.health + 10 * dt);
    }

    // --- Weapon bob / sway / recoil ---
    recoil.current = Math.max(0, recoil.current - dt * 9);
    if (rifleGroupRef.current) {
      const t = bobTime.current;
      const r = recoil.current;
      rifleGroupRef.current.position.set(
        0.27 + Math.sin(t) * 0.008,
        -0.25 + Math.abs(Math.cos(t)) * 0.012 + r * 0.015,
        -0.55 + r * 0.06,
      );
      rifleGroupRef.current.rotation.set(r * 0.09, 0, 0);
    }
    if (flashRef.current) flashRef.current.visible = now < flashUntil.current;
    if (flashLightRef.current) {
      flashLightRef.current.intensity = now < flashUntil.current ? 6 : 0;
    }
  });

  return (
    <primitive object={camera}>
      {/* Player "headlamp" so nearby geometry always reads in the dark arena */}
      <pointLight position={[0, 0.2, -0.3]} color="#ffeedd" intensity={6} distance={16} decay={1.6} />
      <group ref={rifleGroupRef} position={[0.27, -0.25, -0.55]}>
        {/* Model's barrel runs along -X; -PI/2 about Y points it down -Z (forward). */}
        <primitive object={rifle} rotation={[0, -Math.PI / 2, 0]} scale={0.85} />
        <mesh ref={flashRef} position={[0, 0.02, -0.38]} visible={false}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#ffcc66" toneMapped={false} />
        </mesh>
        <pointLight
          ref={flashLightRef}
          position={[0, 0.05, -0.4]}
          color="#ffaa44"
          intensity={0}
          distance={7}
        />
      </group>
    </primitive>
  );
}
