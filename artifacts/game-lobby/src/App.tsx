import { useEffect, useRef, useState } from "react";

// The native splash screen is only shown briefly (just to cover the gap
// before the WebView paints — its icon rendering is unreliable across
// Android versions/OEMs). This component is the actual source of truth for
// the splash sequence: dragon logo, then the "10" mark transforming from
// its lava/fire version into the blue neon version via a diagonal wipe.
const DRAGON_HOLD_MS = 3000;
const TEN_TRANSFORM_MS = 3500;
const TEN_HOLD_MS = 800;
const FADE_MS = 400;

type Phase = "dragon" | "dragon-out" | "ten" | "ten-out" | "done";

// Clip-path polygon for the region "x + y <= threshold" inside a 0-100 box,
// which is what a top-left -> bottom-right diagonal wipe boundary traces
// out as it sweeps across a square. threshold ranges 0 (nothing revealed)
// to 200 (everything revealed).
function diagonalClipPath(progress: number): string {
  const threshold = progress * 200;
  if (threshold <= 0) return "polygon(0% 0%, 0% 0%, 0% 0%)";
  if (threshold >= 200) return "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
  if (threshold <= 100) {
    return `polygon(0% 0%, ${threshold}% 0%, 0% ${threshold}%)`;
  }
  const edge = threshold - 100;
  return `polygon(0% 0%, 100% 0%, 100% ${edge}%, ${edge}% 100%, 0% 100%)`;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("dragon");
  const [tenProgress, setTenProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setPhase("dragon-out"), DRAGON_HOLD_MS));
    timers.push(setTimeout(() => setPhase("ten"), DRAGON_HOLD_MS + FADE_MS));
    timers.push(
      setTimeout(() => setPhase("ten-out"), DRAGON_HOLD_MS + FADE_MS + TEN_TRANSFORM_MS + TEN_HOLD_MS),
    );
    timers.push(
      setTimeout(
        () => setPhase("done"),
        DRAGON_HOLD_MS + FADE_MS + TEN_TRANSFORM_MS + TEN_HOLD_MS + FADE_MS,
      ),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== "ten") return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / TEN_TRANSFORM_MS);
      setTenProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  const dragonVisible = phase === "dragon";
  const tenVisible = phase === "ten" || phase === "ten-out";
  const neonClip = diagonalClipPath(phase === "ten-out" ? 1 : tenProgress);

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
          width: "48%",
          aspectRatio: "1427 / 1024",
          opacity: tenVisible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      >
        {/* Start state: lava/fire "10" */}
        <img
          src="/logo-10-lava.png"
          alt="10"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
        {/* End state: blue neon "10", revealed by a diagonal wipe sweeping
            top-left -> bottom-right over the lava version underneath. */}
        <img
          src="/logo-10.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            clipPath: neonClip,
            WebkitClipPath: neonClip,
          }}
        />
      </div>
    </div>
  );
}
