import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import PurpleMirageRifle from "./PurpleMirageRifle";

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

interface WeaponCanvasProps {
  weaponId: string;
}

export default function WeaponCanvas({ weaponId }: WeaponCanvasProps) {
  const [webglAvailable] = useState<boolean>(() => checkWebGL());
  const [canvasError, setCanvasError] = useState(false);

  if (weaponId !== "purple-mirage-rifle") return null;
  if (!webglAvailable || canvasError) return null;

  return (
    <Canvas
      camera={{ position: [0, 0.1, 2.2], fov: 48, near: 0.01, far: 100 }}
      gl={{
        antialias: true,
        alpha: true,
        failIfMajorPerformanceCaveat: false,
      }}
      onCreated={({ gl }) => {
        try { gl.setClearColor(0x000000, 0); } catch { setCanvasError(true); }
      }}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.4} color="#ffffff" />
      <pointLight position={[-1.5, 0, 1]} intensity={2.5} color="#aa44ff" />
      <pointLight position={[1.5, 0, 1]} intensity={1.8} color="#cc88ff" />
      <pointLight position={[0, -1, 0.5]} intensity={1.0} color="#220044" />
      <Suspense fallback={null}>
        <PurpleMirageRifle />
      </Suspense>
    </Canvas>
  );
}
