import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import PhantomCharacter from "./PhantomCharacter";
import NovaCharacter from "./NovaCharacter";
import NinjaXCharacter from "./NinjaXCharacter";

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

function PhantomFallback() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #0a0510 0%, #1a0a00 100%)" }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: "radial-gradient(ellipse at 50% 80%, rgba(249,115,22,0.25) 0%, transparent 65%)",
      }} />
      <img
        src="/assets/char-phantom.jpg"
        alt="PHANTOM"
        className="relative z-10 object-contain"
        style={{
          height: "88%",
          width: "auto",
          filter: "drop-shadow(0 0 20px rgba(249,115,22,0.8)) drop-shadow(0 0 50px rgba(249,115,22,0.4)) drop-shadow(0 0 8px rgba(255,255,255,0.2))",
        }}
      />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-0" style={{ width: "70%", height: "18%" }}>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[55%] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(249,115,22,0.35) 0%, transparent 70%)", filter: "blur(10px)" }} />
        <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full" viewBox="0 0 200 60" style={{ overflow: "visible" }}>
          <ellipse cx="100" cy="45" rx="95" ry="14"
            fill="none" stroke="rgba(249,115,22,0.55)" strokeWidth="1"
            style={{ filter: "drop-shadow(0 0 4px rgba(249,115,22,0.9))" }} />
          <ellipse cx="100" cy="45" rx="68" ry="10"
            fill="none" stroke="rgba(249,115,22,0.3)" strokeWidth="0.5" strokeDasharray="8 4" />
        </svg>
      </div>
    </div>
  );
}

interface CharacterCanvasProps {
  characterId: string;
}

export default function CharacterCanvas({ characterId }: CharacterCanvasProps) {
  const [webglAvailable] = useState<boolean>(() => checkWebGL());
  const [canvasError, setCanvasError] = useState(false);

  if (!webglAvailable || canvasError) {
    return characterId === "phantom" ? <PhantomFallback /> : null;
  }

  const isNova = characterId === "nova";
  const isNinjaX = characterId === "ninja-x-1";

  const cameraPos: [number, number, number] = isNova || isNinjaX
    ? [0, 1.05, 3.1]
    : [0, 1.1, 2.6];

  const orbitTarget: [number, number, number] = isNova || isNinjaX
    ? [0, 0.85, 0]
    : [0, 0.8, 0];

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
      {/* Ambient + key light */}
      <ambientLight intensity={isNinjaX ? 0.4 : isNova ? 0.5 : 0.4} />
      <directionalLight
        position={[2, 5, 3]} intensity={isNinjaX ? 2.0 : isNova ? 1.8 : 1.6}
        castShadow shadow-mapSize={[512, 512]} color="#ffffff"
      />

      {/* Ninja-X neon lighting rig */}
      {isNinjaX && <>
        <directionalLight position={[-4, 3, -3]} intensity={2.0} color="#ff6600" />
        <directionalLight position={[3, 1, 2]} intensity={1.0} color="#00aaff" />
        <pointLight position={[0, 0.3, 1.5]} color="#ff4400" intensity={2.0} distance={8} />
        <pointLight position={[0, 2.5, 1]} color="#ffffff" intensity={1.0} distance={6} />
      </>}

      {/* Nova / default lighting */}
      {!isNinjaX && <>
        <directionalLight position={[-2, 2, -2]} intensity={0.5} color={isNova ? "#00aaff" : "#4080ff"} />
        <pointLight position={[0, 2, 1]} color={isNova ? "#00e5ff" : "#ffb800"} intensity={isNova ? 1.0 : 0.8} distance={5} />
        {isNova && <pointLight position={[0, 0.5, 2]} color="#00c0ff" intensity={0.4} distance={3} />}
      </>}

      {/* 360° rotation controls */}
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
        {characterId === "nova" && (
          <group position={[0, -0.15, 0]}>
            <NovaCharacter />
          </group>
        )}
        {characterId === "phantom" && (
          <group position={[0, -0.35, 0]}>
            <PhantomCharacter />
          </group>
        )}
        {isNinjaX && (
          <group>
            <NinjaXCharacter />
          </group>
        )}
        <ContactShadows
          position={[0, isNova || isNinjaX ? -0.14 : -0.34, 0]}
          opacity={isNinjaX ? 0.65 : 0.55}
          scale={isNinjaX ? 3.5 : 2.5}
          blur={2.2}
          far={1.5}
          color="#000820"
        />
      </Suspense>
    </Canvas>
  );
}
