import { useEffect, useRef, useState } from "react";

// The native splash screen is only shown briefly (just to cover the gap
// before the WebView paints — its icon rendering is unreliable across
// Android versions/OEMs). This component is the actual source of truth for
// the splash sequence: dragon logo, then the "10" mark's material
// transforming from blue neon into molten lava via a diagonal sweep.
const DRAGON_HOLD_MS = 3000;
const TEN_TRANSFORM_MS = 3500;
const TEN_HOLD_MS = 800;
const FADE_MS = 400;

type Phase = "dragon" | "dragon-out" | "ten" | "ten-out" | "done";

// Clip-path polygon for the region "x + (100-y) <= threshold" inside a
// 0-100 box — the area swept out by a diagonal boundary starting at the
// bottom-left corner and growing toward the top-right corner as threshold
// goes from 0 to 200.
function bottomLeftToTopRightClip(progress: number): string {
  const threshold = Math.max(0, Math.min(1, progress)) * 200;
  if (threshold <= 0) return "polygon(0% 100%, 0% 100%, 0% 100%)";
  if (threshold >= 200) return "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)";
  if (threshold <= 100) {
    return `polygon(0% 100%, ${threshold}% 100%, 0% ${100 - threshold}%)`;
  }
  const edge = threshold - 100;
  return `polygon(0% 100%, 100% 100%, 100% ${100 - edge}%, ${edge}% 0%, 0% 0%)`;
}

// Recolors the same blue/cyan artwork into a molten orange/red look —
// applied as a filter on the exact same image, so geometry never changes.
const LAVA_FILTER = "hue-rotate(-160deg) saturate(2.4) brightness(0.92) contrast(1.2)";
const HOT_EDGE_FILTER = "hue-rotate(-160deg) saturate(1.6) brightness(2.6) contrast(1.3)";
const EDGE_WIDTH = 0.05;

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
  const progress = phase === "ten-out" ? 1 : tenProgress;
  const lavaClip = bottomLeftToTopRightClip(progress);
  const hotEdgeClip = bottomLeftToTopRightClip(progress);
  const eraserClip = bottomLeftToTopRightClip(progress - EDGE_WIDTH);

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
          width: "42%",
          aspectRatio: "1013 / 870",
          opacity: tenVisible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      >
        {/* Single source of geometry for the whole animation: the exact
            same image at the exact same size/position in every layer. Only
            its CSS filter (material) and clip-path (which region is
            currently that material) ever change. */}
        <img
          src="/logo-10.png"
          alt="10"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
        />
        <img
          src="/logo-10.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: HOT_EDGE_FILTER,
            clipPath: hotEdgeClip,
            WebkitClipPath: hotEdgeClip,
          }}
        />
        <img
          src="/logo-10.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: LAVA_FILTER,
            clipPath: eraserClip,
            WebkitClipPath: eraserClip,
          }}
        />
      </div>
    </div>
  );
}
