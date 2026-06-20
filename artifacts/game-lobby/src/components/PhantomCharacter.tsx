import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ARMOR_DARK = "#1a1d24";
const ARMOR_MID = "#22262f";
const ARMOR_LIGHT = "#2e3340";
const YELLOW = "#f5a623";
const YELLOW_GLOW = "#ffb800";
const WHITE_HAIR = "#e8eaf0";
const BELT = "#111317";

function useIdleAnimation(ref: React.RefObject<THREE.Group | null>) {
  useFrame((_, delta) => {
    if (!ref.current) return;
    const t = performance.now() / 1000;
    ref.current.rotation.y = Math.sin(t * 0.4) * 0.06;
    ref.current.position.y = Math.sin(t * 1.2) * 0.018;
  });
}

function ArmorPlate({ position, size, color = ARMOR_DARK, emissive = "#000", emissiveIntensity = 0 }: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
}) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        roughness={0.3}
        metalness={0.85}
      />
    </mesh>
  );
}

function GlowDetail({ position, size, color = YELLOW_GLOW }: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2.5}
        roughness={0.1}
        metalness={0.2}
      />
    </mesh>
  );
}

function HairSpike({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation ?? [0, 0, 0]} castShadow>
      <coneGeometry args={[0.045, 0.22, 5]} />
      <meshStandardMaterial color={WHITE_HAIR} roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

function Head() {
  return (
    <group position={[0, 1.62, 0]}>
      {/* Helmet base */}
      <mesh castShadow>
        <sphereGeometry args={[0.19, 12, 12]} />
        <meshStandardMaterial color={ARMOR_MID} roughness={0.25} metalness={0.9} />
      </mesh>

      {/* Face mask lower */}
      <mesh position={[0, -0.04, 0.14]} castShadow>
        <boxGeometry args={[0.28, 0.12, 0.06]} />
        <meshStandardMaterial color={ARMOR_DARK} roughness={0.2} metalness={0.95} />
      </mesh>

      {/* Visor / eye glow — left */}
      <mesh position={[-0.07, 0.03, 0.17]}>
        <boxGeometry args={[0.07, 0.028, 0.01]} />
        <meshStandardMaterial color={YELLOW_GLOW} emissive={YELLOW_GLOW} emissiveIntensity={4} roughness={0} metalness={0} />
      </mesh>
      {/* Visor / eye glow — right */}
      <mesh position={[0.07, 0.03, 0.17]}>
        <boxGeometry args={[0.07, 0.028, 0.01]} />
        <meshStandardMaterial color={YELLOW_GLOW} emissive={YELLOW_GLOW} emissiveIntensity={4} roughness={0} metalness={0} />
      </mesh>

      {/* Eye light helper */}
      <pointLight position={[0, 0.03, 0.2]} color={YELLOW_GLOW} intensity={1.2} distance={0.5} />

      {/* Helmet top ridge */}
      <mesh position={[0, 0.16, 0]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.22]} />
        <meshStandardMaterial color={ARMOR_LIGHT} roughness={0.2} metalness={0.9} />
      </mesh>

      {/* Hair spikes */}
      <HairSpike position={[0, 0.38, -0.02]} />
      <HairSpike position={[-0.07, 0.34, -0.04]} rotation={[0, 0, 0.35]} />
      <HairSpike position={[0.07, 0.34, -0.04]} rotation={[0, 0, -0.35]} />
      <HairSpike position={[-0.12, 0.28, -0.02]} rotation={[0, 0, 0.6]} />
      <HairSpike position={[0.12, 0.28, -0.02]} rotation={[0, 0, -0.6]} />
      <HairSpike position={[0, 0.31, -0.09]} rotation={[-0.3, 0, 0]} />

      {/* Shoulder neck guard */}
      <mesh position={[0, -0.14, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.16, 0.08, 8]} />
        <meshStandardMaterial color={ARMOR_DARK} roughness={0.3} metalness={0.9} />
      </mesh>

      {/* Yellow chin detail */}
      <GlowDetail position={[0, -0.09, 0.16]} size={[0.06, 0.012, 0.01]} />
    </group>
  );
}

function Torso() {
  return (
    <group position={[0, 1.18, 0]}>
      {/* Main chest */}
      <mesh castShadow>
        <boxGeometry args={[0.46, 0.52, 0.26]} />
        <meshStandardMaterial color={ARMOR_DARK} roughness={0.25} metalness={0.88} />
      </mesh>

      {/* Chest armor plate center */}
      <mesh position={[0, 0.04, 0.135]} castShadow>
        <boxGeometry args={[0.26, 0.3, 0.04]} />
        <meshStandardMaterial color={ARMOR_MID} roughness={0.2} metalness={0.92} />
      </mesh>

      {/* Chest center glow line */}
      <GlowDetail position={[0, 0.05, 0.16]} size={[0.04, 0.22, 0.01]} />

      {/* Left chest accent */}
      <GlowDetail position={[-0.1, 0.08, 0.16]} size={[0.03, 0.03, 0.01]} />
      {/* Right chest accent */}
      <GlowDetail position={[0.1, 0.08, 0.16]} size={[0.03, 0.03, 0.01]} />

      {/* Shoulder pads */}
      <ArmorPlate position={[-0.3, 0.18, 0]} size={[0.14, 0.12, 0.3]} color={ARMOR_LIGHT} />
      <ArmorPlate position={[0.3, 0.18, 0]} size={[0.14, 0.12, 0.3]} color={ARMOR_LIGHT} />

      {/* Shoulder glow strips */}
      <GlowDetail position={[-0.3, 0.19, 0.12]} size={[0.12, 0.02, 0.01]} />
      <GlowDetail position={[0.3, 0.19, 0.12]} size={[0.12, 0.02, 0.01]} />

      {/* Ab section */}
      <mesh position={[0, -0.2, 0.12]} castShadow>
        <boxGeometry args={[0.36, 0.14, 0.05]} />
        <meshStandardMaterial color={ARMOR_MID} roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Belt */}
      <mesh position={[0, -0.3, 0]} castShadow>
        <boxGeometry args={[0.48, 0.075, 0.28]} />
        <meshStandardMaterial color={BELT} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Belt buckle */}
      <GlowDetail position={[0, -0.3, 0.145]} size={[0.055, 0.04, 0.01]} />
    </group>
  );
}

function LeftArm() {
  return (
    <group position={[-0.35, 1.22, 0]}>
      {/* Upper arm */}
      <mesh position={[-0.09, -0.02, 0]} castShadow rotation={[0, 0, 0.18]}>
        <cylinderGeometry args={[0.075, 0.065, 0.3, 8]} />
        <meshStandardMaterial color={ARMOR_DARK} roughness={0.3} metalness={0.85} />
      </mesh>
      {/* Elbow guard */}
      <mesh position={[-0.16, -0.2, 0]} castShadow>
        <sphereGeometry args={[0.075, 8, 8]} />
        <meshStandardMaterial color={ARMOR_LIGHT} roughness={0.2} metalness={0.9} />
      </mesh>
      {/* Forearm */}
      <mesh position={[-0.2, -0.38, 0]} castShadow rotation={[0, 0, 0.12]}>
        <cylinderGeometry args={[0.065, 0.055, 0.3, 8]} />
        <meshStandardMaterial color={ARMOR_MID} roughness={0.3} metalness={0.85} />
      </mesh>
      {/* Forearm glow strip */}
      <GlowDetail position={[-0.22, -0.38, 0.065]} size={[0.018, 0.18, 0.01]} />
      {/* Fist */}
      <mesh position={[-0.24, -0.55, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color={ARMOR_DARK} roughness={0.3} metalness={0.88} />
      </mesh>
    </group>
  );
}

function RightArm() {
  return (
    <group position={[0.35, 1.22, 0]}>
      {/* Upper arm */}
      <mesh position={[0.09, -0.02, 0]} castShadow rotation={[0, 0, -0.18]}>
        <cylinderGeometry args={[0.075, 0.065, 0.3, 8]} />
        <meshStandardMaterial color={ARMOR_DARK} roughness={0.3} metalness={0.85} />
      </mesh>
      {/* Elbow guard */}
      <mesh position={[0.16, -0.2, 0]} castShadow>
        <sphereGeometry args={[0.075, 8, 8]} />
        <meshStandardMaterial color={ARMOR_LIGHT} roughness={0.2} metalness={0.9} />
      </mesh>
      {/* Forearm */}
      <mesh position={[0.2, -0.38, 0]} castShadow rotation={[0, 0, -0.12]}>
        <cylinderGeometry args={[0.065, 0.055, 0.3, 8]} />
        <meshStandardMaterial color={ARMOR_MID} roughness={0.3} metalness={0.85} />
      </mesh>
      {/* Forearm glow strip */}
      <GlowDetail position={[0.22, -0.38, 0.065]} size={[0.018, 0.18, 0.01]} />
      {/* Fist */}
      <mesh position={[0.24, -0.55, 0]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color={ARMOR_DARK} roughness={0.3} metalness={0.88} />
      </mesh>
    </group>
  );
}

function Legs() {
  return (
    <group position={[0, 0.88, 0]}>
      {/* Hip connector */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.42, 0.1, 0.24]} />
        <meshStandardMaterial color={ARMOR_DARK} roughness={0.3} metalness={0.85} />
      </mesh>

      {/* LEFT LEG */}
      <group position={[-0.13, -0.28, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.085, 0.078, 0.38, 8]} />
          <meshStandardMaterial color={ARMOR_DARK} roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Left knee cap */}
        <mesh position={[0, -0.24, 0.07]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={ARMOR_LIGHT} roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Left shin */}
        <mesh position={[0, -0.47, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.35, 8]} />
          <meshStandardMaterial color={ARMOR_MID} roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Shin guard */}
        <mesh position={[0, -0.47, 0.075]} castShadow>
          <boxGeometry args={[0.1, 0.26, 0.04]} />
          <meshStandardMaterial color={ARMOR_DARK} roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Shin glow */}
        <GlowDetail position={[0, -0.47, 0.098]} size={[0.025, 0.14, 0.01]} />
        {/* Boot */}
        <mesh position={[0, -0.7, 0.04]} castShadow>
          <boxGeometry args={[0.14, 0.12, 0.22]} />
          <meshStandardMaterial color={BELT} roughness={0.4} metalness={0.7} />
        </mesh>
      </group>

      {/* RIGHT LEG */}
      <group position={[0.13, -0.28, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.085, 0.078, 0.38, 8]} />
          <meshStandardMaterial color={ARMOR_DARK} roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Right knee cap */}
        <mesh position={[0, -0.24, 0.07]} castShadow>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={ARMOR_LIGHT} roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Right shin */}
        <mesh position={[0, -0.47, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.065, 0.35, 8]} />
          <meshStandardMaterial color={ARMOR_MID} roughness={0.3} metalness={0.85} />
        </mesh>
        {/* Shin guard */}
        <mesh position={[0, -0.47, 0.075]} castShadow>
          <boxGeometry args={[0.1, 0.26, 0.04]} />
          <meshStandardMaterial color={ARMOR_DARK} roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Shin glow */}
        <GlowDetail position={[0, -0.47, 0.098]} size={[0.025, 0.14, 0.01]} />
        {/* Boot */}
        <mesh position={[0, -0.7, 0.04]} castShadow>
          <boxGeometry args={[0.14, 0.12, 0.22]} />
          <meshStandardMaterial color={BELT} roughness={0.4} metalness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function Katana() {
  return (
    <group position={[-0.02, 1.3, -0.2]} rotation={[0.1, 0.1, -1.45]}>
      {/* Handle */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.018, 0.016, 0.22, 6]} />
        <meshStandardMaterial color={BELT} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Guard */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.025, 6]} />
        <meshStandardMaterial color={YELLOW} roughness={0.2} metalness={0.9} emissive={YELLOW} emissiveIntensity={0.5} />
      </mesh>
      {/* Blade */}
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.012, 0.72, 0.004]} />
        <meshStandardMaterial color="#c8d0e0" roughness={0.05} metalness={1} />
      </mesh>
      {/* Blade tip */}
      <mesh position={[0, 0.72, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.006, 0.06, 4]} />
        <meshStandardMaterial color="#c8d0e0" roughness={0.05} metalness={1} />
      </mesh>
    </group>
  );
}

function GlowPlatform() {
  return (
    <group position={[0, 0.01, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.3, 0.55, 48]} />
        <meshStandardMaterial color={YELLOW_GLOW} emissive={YELLOW_GLOW} emissiveIntensity={1.5} transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.12, 0.3, 48]} />
        <meshStandardMaterial color={YELLOW_GLOW} emissive={YELLOW_GLOW} emissiveIntensity={0.8} transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 0.05, 0]} color={YELLOW_GLOW} intensity={0.6} distance={1.2} />
    </group>
  );
}

export default function PhantomCharacter() {
  const groupRef = useRef<THREE.Group>(null);
  useIdleAnimation(groupRef);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <Head />
      <Torso />
      <LeftArm />
      <RightArm />
      <Legs />
      <Katana />
      <GlowPlatform />
    </group>
  );
}
