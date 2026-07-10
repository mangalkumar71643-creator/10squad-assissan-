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
        @keyframes ten-glow-pulse {
          0%   { filter: drop-shadow(0 0 6px #2dd4ff) drop-shadow(0 0 14px #2dd4ff); }
          50%  { filter: drop-shadow(0 0 22px #2dd4ff) drop-shadow(0 0 46px #38e0ff) drop-shadow(0 0 70px #38e0ff); }
          100% { filter: drop-shadow(0 0 6px #2dd4ff) drop-shadow(0 0 14px #2dd4ff); }
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

      <img
        src="/logo-10.png"
        alt="10"
        style={{
          position: "absolute",
          maxWidth: "45%",
          maxHeight: "45%",
          objectFit: "contain",
          opacity: tenVisible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
          animation: tenVisible ? "ten-glow-pulse 1.5s ease-in-out infinite" : "none",
        }}
      />
    </div>
  );
}
