import { ARENA_HALF, OBSTACLES } from "@/game/world";

const SIZE = ARENA_HALF * 2;
const WALL_H = 3;
const WALL_T = 0.5;

function Wall({
  position,
  length,
  rotated,
}: {
  position: [number, number, number];
  length: number;
  rotated: boolean;
}) {
  const args: [number, number, number] = rotated
    ? [WALL_T, WALL_H, length]
    : [length, WALL_H, WALL_T];
  const stripArgs: [number, number, number] = rotated
    ? [WALL_T + 0.05, 0.12, length]
    : [length, 0.12, WALL_T + 0.05];
  return (
    <group position={position}>
      <mesh position={[0, WALL_H / 2, 0]}>
        <boxGeometry args={args} />
        <meshStandardMaterial color="#1d2230" roughness={0.85} metalness={0.3} />
      </mesh>
      <mesh position={[0, WALL_H - 0.06, 0]}>
        <boxGeometry args={stripArgs} />
        <meshStandardMaterial
          color="#ff8800"
          emissive="#ff8800"
          emissiveIntensity={1.8}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function Arena() {
  return (
    <group>
      <color attach="background" args={["#05060a"]} />
      <fog attach="fog" args={["#05060a", 22, 55]} />

      <ambientLight intensity={1.0} />
      <hemisphereLight args={["#4a5c85", "#241c0c", 1.6]} />
      <directionalLight position={[8, 14, 6]} intensity={2.2} color="#ffffff" />
      <pointLight position={[-14, 5, -14]} color="#ff8800" intensity={40} distance={26} />
      <pointLight position={[14, 5, -14]} color="#00e5ff" intensity={30} distance={26} />
      <pointLight position={[-14, 5, 14]} color="#00e5ff" intensity={30} distance={26} />
      <pointLight position={[14, 5, 14]} color="#ff8800" intensity={40} distance={26} />
      <pointLight position={[0, 6, 0]} color="#ffaa33" intensity={35} distance={30} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[SIZE, SIZE]} />
        <meshStandardMaterial color="#141824" roughness={0.9} metalness={0.2} />
      </mesh>
      <gridHelper args={[SIZE, 38, "#ff8800", "#1c2230"]} position={[0, 0.02, 0]} />

      {/* Boundary walls */}
      <Wall position={[0, 0, -ARENA_HALF]} length={SIZE + WALL_T} rotated={false} />
      <Wall position={[0, 0, ARENA_HALF]} length={SIZE + WALL_T} rotated={false} />
      <Wall position={[-ARENA_HALF, 0, 0]} length={SIZE + WALL_T} rotated={true} />
      <Wall position={[ARENA_HALF, 0, 0]} length={SIZE + WALL_T} rotated={true} />

      {/* Cover blocks */}
      {OBSTACLES.map((b, i) => {
        const w = b.maxX - b.minX;
        const d = b.maxZ - b.minZ;
        const cx = (b.minX + b.maxX) / 2;
        const cz = (b.minZ + b.maxZ) / 2;
        return (
          <group key={i} position={[cx, 0, cz]}>
            <mesh position={[0, b.height / 2, 0]}>
              <boxGeometry args={[w, b.height, d]} />
              <meshStandardMaterial color="#222939" roughness={0.7} metalness={0.45} />
            </mesh>
            <mesh position={[0, b.height - 0.04, 0]}>
              <boxGeometry args={[w + 0.06, 0.08, d + 0.06]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? "#ff8800" : "#00e5ff"}
                emissive={i % 2 === 0 ? "#ff8800" : "#00e5ff"}
                emissiveIntensity={1.6}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
