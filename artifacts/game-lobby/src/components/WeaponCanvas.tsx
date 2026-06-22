import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import PurpleMirageRifle from "./PurpleMirageRifle";

interface WeaponCanvasProps {
  weaponId: string;
}

export default function WeaponCanvas({ weaponId }: WeaponCanvasProps) {
  if (weaponId !== "purple-mirage-rifle") return null;

  return (
    <Canvas
      camera={{ position: [0, 0.1, 2.2], fov: 48, near: 0.01, far: 100 }}
      gl={{ antialias: true, alpha: true }}
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
