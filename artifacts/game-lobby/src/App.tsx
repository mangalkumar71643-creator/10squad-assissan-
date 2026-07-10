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

// The two endpoints (in 0-100% box coords) of the diagonal boundary
// segment currently visible inside the box, for a given progress — used to
// place sparks along the live transformation edge.
function boundaryEndpoints(progress: number): [[number, number], [number, number]] {
  const threshold = Math.max(0.001, Math.min(0.999, progress)) * 200;
  if (threshold <= 100) {
    return [
      [threshold, 100],
      [0, 100 - threshold],
    ];
  }
  const edge = threshold - 100;
  return [
    [100, 100 - edge],
    [edge, 0],
  ];
}

// Material bands from coolest (still steel) to hottest (full lava), each
// clipped a little further back than the last so they overlap into a soft
// multi-step gradient instead of one hard line. Every layer is the exact
// same source image — only filter + clip differ, so geometry never moves.
const MATERIAL_BANDS = [
  { offset: 0.22, filter: "hue-rotate(-60deg) saturate(1.7) brightness(1.15) contrast(1.05)", blur: 1.5 },
  { offset: 0.13, filter: "hue-rotate(-110deg) saturate(2.1) brightness(1.15) contrast(1.1)", blur: 1 },
  { offset: 0.06, filter: "hue-rotate(-160deg) saturate(2.4) brightness(1.0) contrast(1.15)", blur: 0.5 },
  { offset: 0, filter: "hue-rotate(-160deg) saturate(2.4) brightness(0.9) contrast(1.25)", blur: 0 },
];

const SPARK_FRACTIONS = [0.15, 0.35, 0.5, 0.65, 0.85];

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
  const showSparks = phase === "ten" && progress > 0.02 && progress < 0.98;
  const [[sx1, sy1], [sx2, sy2]] = boundaryEndpoints(progress);
  const glowOrangeClip = bottomLeftToTopRightClip(progress + 0.015);
  const glowCyanClip = bottomLeftToTopRightClip(progress - 0.015);

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
        @keyframes spark-flicker {
          0%, 100% { opacity: 0; transform: scale(0.4) translateY(0); }
          15% { opacity: 1; transform: scale(1) translateY(-2px); }
          40% { opacity: 0.7; transform: scale(0.8) translateY(-10px); }
          70% { opacity: 0; transform: scale(0.3) translateY(-22px); }
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

        {/* Graduated heat bands: steel -> glowing orange steel -> lava,
            each slightly blurred so the boundary reads as a soft material
            gradient instead of a hard cut. */}
        {MATERIAL_BANDS.map((band, i) => {
          const clip = bottomLeftToTopRightClip(progress - band.offset);
          return (
            <img
              key={i}
              src="/logo-10.png"
              alt=""
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: `${band.filter}${band.blur ? ` blur(${band.blur}px)` : ""}`,
                clipPath: clip,
                WebkitClipPath: clip,
              }}
            />
          );
        })}

        {/* Bright glowing seam at the live boundary, mixing orange and cyan
            light via two overlapping soft-blurred bands with screen blend. */}
        <img
          src="/logo-10.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "hue-rotate(-160deg) saturate(1.6) brightness(1.7) contrast(1.15) blur(2px)",
            clipPath: glowOrangeClip,
            WebkitClipPath: glowOrangeClip,
            mixBlendMode: "screen",
            opacity: tenVisible && phase === "ten" ? 0.85 : 0,
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
            filter: "saturate(1.6) brightness(1.5) contrast(1.1) blur(2px)",
            clipPath: glowCyanClip,
            WebkitClipPath: glowCyanClip,
            mixBlendMode: "screen",
            opacity: tenVisible && phase === "ten" ? 0.55 : 0,
          }}
        />

        {/* Sparks drifting up off the live boundary */}
        {showSparks &&
          SPARK_FRACTIONS.map((f, i) => {
            const x = sx1 + (sx2 - sx1) * f;
            const y = sy1 + (sy2 - sy1) * f;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${x}%`,
                  top: `${y}%`,
                  width: "6px",
                  height: "6px",
                  marginLeft: "-3px",
                  marginTop: "-3px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, #fff6d8 0%, #ffb347 45%, transparent 75%)",
                  animation: `spark-flicker ${0.6 + (i % 3) * 0.2}s ease-out ${i * 0.13}s infinite`,
                  pointerEvents: "none",
                }}
              />
            );
          })}
      </div>
    </div>
  );
}
