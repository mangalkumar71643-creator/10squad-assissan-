import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import NeonRunnerCharacter from "./NeonRunnerCharacter";

// Holographic platform pad rendered inside the 3D scene, so the character's
// feet stay planted on it at every screen size — a DOM overlay ring can't
// guarantee that across device aspect ratios.
function HoloPad() {
  const groupRef = useRef<THREE.Group>(null);

  const texture = useMemo(() => {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const cx = size / 2;

    const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
    grad.addColorStop(0, "rgba(0,140,255,0.32)");
    grad.addColorStop(0.55, "rgba(0,110,255,0.10)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = "rgba(0,200,255,0.9)";
    ctx.lineWidth = 5;
    ctx.shadowColor = "rgba(0,200,255,0.9)";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cx, 243, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(0,170,255,0.5)";
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 18]);
    ctx.beginPath();
    ctx.arc(cx, cx, 178, 0, Math.PI * 2);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(0,130,255,0.32)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cx, 108, 0, Math.PI * 2);
    ctx.stroke();

    return new THREE.CanvasTexture(c);
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={groupRef}>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <planeGeometry args={[2.5, 2.5]} />
        <meshBasicMaterial map={texture} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

function checkWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const ctx =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    return !!ctx;
  } catch {
    return false;
  }
}

interface CharacterCanvasProps {
  characterId: string;
}

export default function CharacterCanvas({ characterId }: CharacterCanvasProps) {
  const [webglAvailable] = useState<boolean>(() => checkWebGL());
  const [canvasError, setCanvasError] = useState(false);

  if (!webglAvailable || canvasError) {
    return null;
  }

  const cameraPos: [number, number, number] = [0, 0.92, 2.8];
  const orbitTarget: [number, number, number] = [0, 0.92, 0];

  return (
    <Canvas
      camera={{ position: cameraPos, fov: 44 }}
      gl={{
        antialias: true,
        alpha: true,
        failIfMajorPerformanceCaveat: false,
      }}
      shadows
      onCreated={({ gl }) => {
        try { gl.setClearColor(0x000000, 0); } catch { setCanvasError(true); }
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[2, 5, 3]} intensity={2.0}
        castShadow shadow-mapSize={[512, 512]} color="#ffffff"
      />
      <directionalLight position={[-3, 3, -2]} intensity={1.5} color="#00e5ff" />
      <directionalLight position={[3, 2, 2]} intensity={1.2} color="#ff00cc" />
      <pointLight position={[0, 1.0, 1.8]} color="#00e5ff" intensity={1.8} distance={6} />
      <pointLight position={[-1, 1.5, 1]} color="#ff00cc" intensity={1.2} distance={5} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        enableDamping
        dampingFactor={0.07}
        rotateSpeed={0.75}
        target={orbitTarget}
      />

      <Suspense fallback={null}>
        {characterId === "neon-runner" && <NeonRunnerCharacter />}
        <HoloPad />
        <ContactShadows
          position={[0, 0.01, 0]}
          opacity={0.65}
          scale={3.5}
          blur={2.2}
          far={1.5}
          color="#000820"
        />
      </Suspense>
    </Canvas>
  );
}
