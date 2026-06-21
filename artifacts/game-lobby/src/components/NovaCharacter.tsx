import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const C = {
  base:        "#06090f",
  mid:         "#0c1018",
  plate:       "#121824",
  light:       "#1a2235",
  glow:        "#00e5ff",
  glowBright:  "#80f4ff",
  glowDim:     "#008aaa",
  orange:      "#ff6a00",
  chrome:      "#506070",
  chromeMid:   "#7090a8",
};

function G({
  p, s, c = C.glow, i = 3.5,
}: {
  p: [number, number, number];
  s: [number, number, number];
  c?: string;
  i?: number;
}) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} emissive={c} emissiveIntensity={i} roughness={0} metalness={0} />
    </mesh>
  );
}

function Arm({ side }: { side: "L" | "R" }) {
  const sx = side === "L" ? -1 : 1;
  const tilt = side === "L" ? 0.16 : -0.16;
  return (
    <group position={[sx * 0.305, 1.28, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.068, 10, 10]} />
        <meshStandardMaterial color={C.plate} roughness={0.12} metalness={0.95} />
      </mesh>
      <G p={[sx * 0.01, 0.002, 0.068]} s={[0.06, 0.06, 0.01]} c={C.glow} i={2} />

      <group position={[sx * 0.04, -0.2, 0]} rotation={[0, 0, tilt]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.057, 0.26, 8, 12]} />
          <meshStandardMaterial color={C.mid} roughness={0.18} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.057]} castShadow>
          <boxGeometry args={[0.082, 0.22, 0.035]} />
          <meshStandardMaterial color={C.plate} roughness={0.12} metalness={0.94} />
        </mesh>
        <G p={[0, 0.04, 0.077]} s={[0.036, 0.1, 0.008]} i={2.5} />
      </group>

      <mesh position={[sx * 0.09, -0.4, 0]} castShadow>
        <sphereGeometry args={[0.056, 10, 10]} />
        <meshStandardMaterial color={C.plate} roughness={0.15} metalness={0.94} />
      </mesh>

      <group position={[sx * 0.12, -0.58, 0]} rotation={[0, 0, tilt * 0.6]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.048, 0.24, 8, 12]} />
          <meshStandardMaterial color={C.base} roughness={0.18} metalness={0.92} />
        </mesh>
        <mesh position={[0, 0, 0.048]} castShadow>
          <boxGeometry args={[0.068, 0.18, 0.03]} />
          <meshStandardMaterial color={C.plate} roughness={0.12} metalness={0.94} />
        </mesh>
        <G p={[0, 0, 0.066]} s={[0.035, 0.13, 0.008]} />
      </group>

      <mesh position={[sx * 0.15, -0.78, 0]} castShadow>
        <boxGeometry args={[0.082, 0.1, 0.058]} />
        <meshStandardMaterial color={C.base} roughness={0.3} metalness={0.88} />
      </mesh>
      <G p={[sx * 0.15, -0.735, 0.03]} s={[0.06, 0.018, 0.008]} i={2} />
    </group>
  );
}

function Leg({ side }: { side: "L" | "R" }) {
  const sx = side === "L" ? -1 : 1;
  return (
    <group position={[sx * 0.115, 0, 0]}>
      <group position={[0, 0.55, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.073, 0.34, 8, 12]} />
          <meshStandardMaterial color={C.mid} roughness={0.18} metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.04, 0.073]} castShadow>
          <boxGeometry args={[0.105, 0.3, 0.038]} />
          <meshStandardMaterial color={C.plate} roughness={0.12} metalness={0.94} />
        </mesh>
        <G p={[0, 0.06, 0.095]} s={[0.05, 0.15, 0.008]} />
      </group>

      <mesh position={[0, 0.26, 0.065]} castShadow>
        <sphereGeometry args={[0.064, 10, 10]} />
        <meshStandardMaterial color={C.plate} roughness={0.14} metalness={0.94} />
      </mesh>
      <G p={[0, 0.26, 0.13]} s={[0.052, 0.026, 0.008]} />

      <group position={[0, 0.1, 0]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.062, 0.28, 8, 12]} />
          <meshStandardMaterial color={C.base} roughness={0.18} metalness={0.92} />
        </mesh>
        <mesh position={[0, 0, 0.062]} castShadow>
          <boxGeometry args={[0.09, 0.24, 0.038]} />
          <meshStandardMaterial color={C.plate} roughness={0.12} metalness={0.94} />
        </mesh>
        <G p={[0, 0.01, 0.084]} s={[0.044, 0.15, 0.008]} />
      </group>

      <mesh position={[0, -0.12, 0.022]} castShadow>
        <boxGeometry args={[0.118, 0.1, 0.2]} />
        <meshStandardMaterial color={C.base} roughness={0.32} metalness={0.82} />
      </mesh>
      <G p={[0, -0.075, 0.123]} s={[0.1, 0.022, 0.008]} i={2.5} />
      <G p={[sx * 0.04, -0.115, 0.123]} s={[0.025, 0.052, 0.008]} i={2} />
    </group>
  );
}

function Head() {
  return (
    <group position={[0, 1.63, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[0.155, 16, 16]} />
        <meshStandardMaterial color={C.base} roughness={0.07} metalness={0.98} />
      </mesh>

      <mesh position={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.042, 0.09, 0.29]} />
        <meshStandardMaterial color={C.plate} roughness={0.12} metalness={0.96} />
      </mesh>
      <G p={[0, 0.16, 0.07]} s={[0.038, 0.016, 0.11]} c={C.glowBright} i={4} />

      <mesh position={[0, 0.01, 0.14]}>
        <boxGeometry args={[0.22, 0.15, 0.014]} />
        <meshStandardMaterial
          color={C.glowBright}
          emissive={C.glow}
          emissiveIntensity={2.2}
          transparent
          opacity={0.78}
          roughness={0}
        />
      </mesh>
      <G p={[0, 0.095, 0.148]}  s={[0.245, 0.011, 0.009]} />
      <G p={[0, -0.072, 0.148]} s={[0.215, 0.011, 0.009]} />
      <G p={[-0.112, 0.012, 0.143]} s={[0.011, 0.165, 0.009]} />
      <G p={[0.112, 0.012, 0.143]}  s={[0.011, 0.165, 0.009]} />

      <mesh position={[0, -0.105, 0.1]} castShadow>
        <boxGeometry args={[0.185, 0.062, 0.092]} />
        <meshStandardMaterial color={C.mid} roughness={0.2} metalness={0.92} />
      </mesh>
      <G p={[0, -0.108, 0.148]} s={[0.11, 0.016, 0.008]} i={2} />

      <mesh position={[-0.152, 0.018, -0.018]} castShadow>
        <boxGeometry args={[0.026, 0.15, 0.24]} />
        <meshStandardMaterial color={C.plate} roughness={0.14} metalness={0.94} />
      </mesh>
      <mesh position={[0.152, 0.018, -0.018]} castShadow>
        <boxGeometry args={[0.026, 0.15, 0.24]} />
        <meshStandardMaterial color={C.plate} roughness={0.14} metalness={0.94} />
      </mesh>

      <mesh position={[0, -0.218, 0]} castShadow>
        <cylinderGeometry args={[0.064, 0.078, 0.13, 10]} />
        <meshStandardMaterial color={C.base} roughness={0.2} metalness={0.92} />
      </mesh>
    </group>
  );
}

function Torso() {
  return (
    <group position={[0, 0.96, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.5, 0.23]} />
        <meshStandardMaterial color={C.base} roughness={0.14} metalness={0.93} />
      </mesh>

      <mesh position={[0, 0.07, 0.12]} castShadow>
        <boxGeometry args={[0.27, 0.34, 0.038]} />
        <meshStandardMaterial color={C.plate} roughness={0.11} metalness={0.95} />
      </mesh>
      <G p={[0, 0.1, 0.142]}   s={[0.032, 0.26, 0.007]} />
      <G p={[-0.085, 0.12, 0.142]} s={[0.016, 0.08, 0.007]} i={2.2} />
      <G p={[0.085, 0.12, 0.142]}  s={[0.016, 0.08, 0.007]} i={2.2} />
      <G p={[-0.085, 0.02, 0.142]} s={[0.016, 0.05, 0.007]} i={1.5} />
      <G p={[0.085, 0.02, 0.142]}  s={[0.016, 0.05, 0.007]} i={1.5} />

      <mesh position={[-0.278, 0.175, 0]} castShadow>
        <boxGeometry args={[0.12, 0.135, 0.28]} />
        <meshStandardMaterial color={C.plate} roughness={0.13} metalness={0.94} />
      </mesh>
      <mesh position={[0.278, 0.175, 0]} castShadow>
        <boxGeometry args={[0.12, 0.135, 0.28]} />
        <meshStandardMaterial color={C.plate} roughness={0.13} metalness={0.94} />
      </mesh>
      <G p={[-0.278, 0.188, 0.118]}  s={[0.1, 0.016, 0.009]} />
      <G p={[0.278, 0.188, 0.118]}   s={[0.1, 0.016, 0.009]} />
      <G p={[-0.278, 0.188, -0.095]} s={[0.1, 0.016, 0.009]} i={2} />
      <G p={[0.278, 0.188, -0.095]}  s={[0.1, 0.016, 0.009]} i={2} />

      <mesh position={[0, -0.23, 0]} castShadow>
        <boxGeometry args={[0.34, 0.095, 0.21]} />
        <meshStandardMaterial color={C.mid} roughness={0.28} metalness={0.82} />
      </mesh>

      <mesh position={[0, -0.29, 0]} castShadow>
        <boxGeometry args={[0.38, 0.068, 0.23]} />
        <meshStandardMaterial color={C.base} roughness={0.48} metalness={0.72} />
      </mesh>
      <G p={[0, -0.29, 0.12]}     s={[0.058, 0.044, 0.009]} c={C.glowBright} i={4} />
      <G p={[-0.115, -0.29, 0.12]} s={[0.024, 0.03, 0.009]} i={2} />
      <G p={[0.115, -0.29, 0.12]}  s={[0.024, 0.03, 0.009]} i={2} />
    </group>
  );
}

function Hips() {
  return (
    <group position={[0, 0.65, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.38, 0.14, 0.22]} />
        <meshStandardMaterial color={C.base} roughness={0.22} metalness={0.88} />
      </mesh>
      <G p={[0, 0, 0.114]}      s={[0.16, 0.07, 0.009]} i={1.6} />
      <G p={[-0.14, 0, 0.114]}  s={[0.05, 0.05, 0.009]} i={1.4} />
      <G p={[0.14, 0, 0.114]}   s={[0.05, 0.05, 0.009]} i={1.4} />
    </group>
  );
}

function Platform() {
  return (
    <group position={[0, 0.004, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.26, 0.5, 52]} />
        <meshStandardMaterial
          color={C.glow} emissive={C.glow} emissiveIntensity={2.2}
          transparent opacity={0.42} side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.26, 52]} />
        <meshStandardMaterial
          color={C.glow} emissive={C.glow} emissiveIntensity={1.1}
          transparent opacity={0.18} side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.52, 0.56, 52]} />
        <meshStandardMaterial
          color={C.glow} emissive={C.glow} emissiveIntensity={1.5}
          transparent opacity={0.25} side={THREE.DoubleSide}
        />
      </mesh>
      <pointLight position={[0, 0.06, 0]} color={C.glow} intensity={1.2} distance={2} />
    </group>
  );
}

export default function NovaCharacter() {
  const rootRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!rootRef.current) return;
    const t = performance.now() / 1000;
    rootRef.current.position.y = Math.sin(t * 1.15) * 0.014;
  });

  return (
    <group ref={rootRef}>
      <Head />
      <Torso />
      <Hips />
      <Arm side="L" />
      <Arm side="R" />
      <Leg side="L" />
      <Leg side="R" />
      <Platform />
    </group>
  );
}
