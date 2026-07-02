import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import NeonRunnerCharacter from "./NeonRunnerCharacter";

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

  const cameraPos: [number, number, number] = [0, 1.05, 3.1];
  const orbitTarget: [number, number, number] = [0, 0.85, 0];

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
        <ContactShadows
          position={[0, -0.14, 0]}
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
