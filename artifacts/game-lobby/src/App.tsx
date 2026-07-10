import { useEffect, useState } from "react";

// The native splash screen is only shown briefly (just to cover the gap
// before the WebView paints — its icon rendering is unreliable across
// Android versions/OEMs). This component is the actual source of truth for
// the splash sequence: dragon logo, then the glowing "10" mark.
const DRAGON_HOLD_MS = 3000;
const TEN_HOLD_MS = 1500;
const FADE_MS = 400;

type Phase = "dragon" | "dragon-out" | "ten" | "ten-out" | "done";

export default function App() {
  const [phase, setPhase] = useState<Phase>("dragon");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("dragon-out"), DRAGON_HOLD_MS));
    timers.push(setTimeout(() => setPhase("ten"), DRAGON_HOLD_MS + FADE_MS));
    timers.push(setTimeout(() => setPhase("ten-out"), DRAGON_HOLD_MS + FADE_MS + TEN_HOLD_MS));
    timers.push(setTimeout(() => setPhase("done"), DRAGON_HOLD_MS + FADE_MS + TEN_HOLD_MS + FADE_MS));
    return () => timers.forEach(clearTimeout);
  }, []);

  const dragonVisible = phase === "dragon";
  const tenVisible = phase === "ten";

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes ten-sweep {
          0%   { background-position: 0% -40%; }
          100% { background-position: 0% 140%; }
        }
      `}</style>

      <img
        src="/logo.png"
        alt="10 Squad Assassin"
        style={{
          position: "absolute",
          maxWidth: "55%",
          maxHeight: "55%",
          objectFit: "contain",
          opacity: dragonVisible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />

      <div
        style={{
          position: "absolute",
          width: "45%",
          maxHeight: "45%",
          aspectRatio: "1060 / 920",
          opacity: tenVisible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      >
        {/* Base logo, always visible once this phase is active */}
        <img
          src="/logo-10.png"
          alt="10"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
        {/* Light band that sweeps top-to-bottom, masked to the logo's own
            shape so nothing glows outside its silhouette (no border/outline
            glow) — only the artwork itself brightens as the light passes. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(180deg, transparent 0%, transparent 35%, rgba(255,255,255,0.95) 50%, transparent 65%, transparent 100%)",
            backgroundSize: "100% 260%",
            WebkitMaskImage: "url(/logo-10.png)",
            maskImage: "url(/logo-10.png)",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            mixBlendMode: "screen",
            animation: tenVisible ? "ten-sweep 1.5s ease-in-out 1" : "none",
          }}
        />
      </div>
    </div>
  );
}
