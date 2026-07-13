import { useEffect, useRef, useState } from "react";
import Lobby from "./Lobby";

// The native splash screen is only shown briefly (just to cover the gap
// before the WebView paints — its icon rendering is unreliable across
// Android versions/OEMs). This component is the actual source of truth for
// the splash sequence:
//   1. Dragon logo
//   2. "10" mark: starts as bare glowing outline strokes, an energy line
//      sweeps bottom-left -> top-right revealing the full metal surface
//   3. The revealed steel gradually heats into molten lava along the same
//      diagonal direction
//   4. A soft glow pulse on the finished lava mark
//   5. Cinematic loading screen with a looping progress bar
const DRAGON_HOLD_MS = 3000;
const REVEAL_MS = 1600;
const HEAT_MS = 3500;
const PULSE_MS = 500;
const END_HOLD_MS = 300;
const FADE_MS = 400;
const LOADING_CYCLE_MS = 3800;
const LOADING_HOLD_MS = 4200;
type Phase = "dragon" | "dragon-out" | "reveal" | "heat" | "pulse" | "out" | "loading" | "lobby";

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
// place sparks along the live edge.
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

// Dims the metal fill way down while the already-bright neon edge survives
// (contrast pivots around mid-gray *before* the brightness cut, so the
// edge doesn't get crushed to black the way "brightness then contrast"
// would) — approximates "only the glowing outline strokes are visible".
const OUTLINE_FILTER = "contrast(3) brightness(0.4) saturate(1.5)";

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
  const [revealProgress, setRevealProgress] = useState(0);
  const [heatProgress, setHeatProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const tDragonOut = DRAGON_HOLD_MS;
    const tReveal = tDragonOut + FADE_MS;
    const tHeat = tReveal + REVEAL_MS;
    const tPulse = tHeat + HEAT_MS;
    const tOut = tPulse + PULSE_MS + END_HOLD_MS;
    const tLoading = tOut + FADE_MS;
    const tLobby = tLoading + LOADING_HOLD_MS;
    at(tDragonOut, () => setPhase("dragon-out"));
    at(tReveal, () => setPhase("reveal"));
    at(tHeat, () => setPhase("heat"));
    at(tPulse, () => setPhase("pulse"));
    at(tOut, () => setPhase("out"));
    at(tLoading, () => setPhase("loading"));
    at(tLobby, () => setPhase("lobby"));
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== "reveal" && phase !== "heat") return;
    const duration = phase === "reveal" ? REVEAL_MS : HEAT_MS;
    const setter = phase === "reveal" ? setRevealProgress : setHeatProgress;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setter(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase]);

  const dragonVisible = phase === "dragon";
  const tenVisible = phase === "reveal" || phase === "heat" || phase === "pulse" || phase === "out";
  const loadingVisible = phase === "loading";
  const lobbyVisible = phase === "lobby";
  const revealDone = phase === "heat" || phase === "pulse" || phase === "out";
  const reveal = revealDone ? 1 : revealProgress;
  const heat = phase === "pulse" || phase === "out" ? 1 : heatProgress;
  const showSparks = phase === "heat" && heat > 0.02 && heat < 0.98;
  const [[sx1, sy1], [sx2, sy2]] = boundaryEndpoints(phase === "reveal" ? reveal : heat);
  const glowOrangeClip = bottomLeftToTopRightClip(heat + 0.015);
  const glowCyanClip = bottomLeftToTopRightClip(heat - 0.015);
  const revealClip = bottomLeftToTopRightClip(reveal);
  const revealGlowClip1 = bottomLeftToTopRightClip(reveal + 0.02);
  const revealGlowClip2 = bottomLeftToTopRightClip(reveal - 0.02);

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
        @keyframes glow-pulse {
          0% { opacity: 0; transform: scale(0.97); }
          45% { opacity: 0.9; transform: scale(1.035); }
          100% { opacity: 0; transform: scale(1.06); }
        }
        @keyframes loading-fill {
          0% { clip-path: inset(0 100% 0 0); opacity: 1; }
          85% { clip-path: inset(0 0% 0 0); opacity: 1; }
          90% { clip-path: inset(0 0% 0 0); opacity: 0; }
          92% { clip-path: inset(0 100% 0 0); opacity: 0; }
          100% { clip-path: inset(0 100% 0 0); opacity: 1; }
        }
        @keyframes loading-spark {
          0% { left: 0%; opacity: 1; }
          85% { left: 100%; opacity: 1; }
          90% { left: 100%; opacity: 0; }
          92% { left: 0%; opacity: 0; }
          100% { left: 0%; opacity: 1; }
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
        {/* Single source of geometry for the whole sequence: the exact same
            image at the exact same size/position in every layer. Only its
            CSS filter (material) and clip-path (how much is revealed /
            which region is which material) ever change. */}

        {/* Base state: dim, outline-only look — "a few glowing strokes". */}
        <img
          src="/logo-10.png"
          alt="10"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: OUTLINE_FILTER,
          }}
        />

        {/* Full bright metal surface, revealed bottom-left -> top-right by
            the energy line during the "reveal" phase, then stays fully
            shown as the base for the heat transform afterward. */}
        <img
          src="/logo-10.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            clipPath: revealClip,
            WebkitClipPath: revealClip,
          }}
        />

        {/* Bright white/cyan energy line riding the reveal boundary */}
        <img
          src="/logo-10.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "saturate(1.3) brightness(2.2) contrast(1.1) blur(2px)",
            clipPath: revealGlowClip1,
            WebkitClipPath: revealGlowClip1,
            mixBlendMode: "screen",
            opacity: phase === "reveal" ? 0.9 : 0,
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
            filter: "saturate(1.1) brightness(1.6) blur(1px)",
            clipPath: revealGlowClip2,
            WebkitClipPath: revealGlowClip2,
            mixBlendMode: "screen",
            opacity: phase === "reveal" ? 0.5 : 0,
          }}
        />

        {/* Graduated heat bands: steel -> glowing orange steel -> lava,
            each slightly blurred so the boundary reads as a soft material
            gradient instead of a hard cut. */}
        {revealDone &&
          MATERIAL_BANDS.map((band, i) => {
            const clip = bottomLeftToTopRightClip(heat - band.offset);
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

        {/* Bright glowing seam at the live heat boundary, mixing orange and
            cyan light via two overlapping soft-blurred bands. */}
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
            opacity: phase === "heat" ? 0.85 : 0,
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
            opacity: phase === "heat" ? 0.55 : 0,
          }}
        />

        {/* Sparks drifting up off the live edge, active during either the
            reveal sweep or the heat transform. */}
        {(showSparks || phase === "reveal") &&
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
                  background:
                    phase === "reveal"
                      ? "radial-gradient(circle, #ffffff 0%, #9fe8ff 45%, transparent 75%)"
                      : "radial-gradient(circle, #fff6d8 0%, #ffb347 45%, transparent 75%)",
                  animation: `spark-flicker ${0.6 + (i % 3) * 0.2}s ease-out ${i * 0.13}s infinite`,
                  pointerEvents: "none",
                }}
              />
            );
          })}

        {/* Final soft glow pulse once the lava mark is complete */}
        <img
          src="/logo-10.png"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "hue-rotate(-160deg) saturate(2) brightness(1.8) contrast(1.1) blur(6px)",
            mixBlendMode: "screen",
            animation: phase === "pulse" ? `glow-pulse ${PULSE_MS}ms ease-out 1` : "none",
            opacity: 0,
          }}
        />
      </div>

      {/* Cinematic loading screen: samurai/moonlit-city background art with
          the baked-in "LOADING..." label and bar painted over (same source
          image, patched), replaced by our own animated progress bar so it
          actually advances instead of showing a static image. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: loadingVisible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
          pointerEvents: "none",
        }}
      >
        <img
          src="/loading-bg.jpg"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: "8%",
            bottom: "11%",
            width: "44%",
            minWidth: "220px",
          }}
        >
          <div
            style={{
              color: "#bfeaff",
              fontSize: "clamp(11px, 1.6vw, 15px)",
              letterSpacing: "0.35em",
              fontWeight: 600,
              textShadow: "0 0 10px rgba(120,210,255,0.8), 0 0 22px rgba(80,180,255,0.5)",
              marginBottom: "1.4vh",
              paddingLeft: "0.35em",
            }}
          >
            LOADING...
          </div>

          {/* Border ring: blue -> white -> red gradient, chamfered ends */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "clamp(14px, 3.4vh, 26px)",
              padding: "2px",
              background: "linear-gradient(to right, #33baff, #eafcff 50%, #ff5a2a)",
              clipPath:
                "polygon(1.5% 0%, 98.5% 0%, 100% 50%, 98.5% 100%, 1.5% 100%, 0% 50%)",
              boxShadow: "0 0 16px rgba(90,190,255,0.45), 0 0 16px rgba(255,90,40,0.25)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background: "rgba(4,10,16,0.8)",
                clipPath:
                  "polygon(1.5% 0%, 98.5% 0%, 100% 50%, 98.5% 100%, 1.5% 100%, 0% 50%)",
              }}
            >
              {/* Mounted only once the loading phase actually starts, so the
                  infinite CSS loop begins at 0% right when it becomes
                  visible instead of already being mid-cycle from page load. */}
              {loadingVisible && (
                <>
                  {/* Fixed full-width gradient, progressively revealed
                      left-to-right so the color at a given position never
                      shifts as it grows. */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to right, #0a63ff 0%, #29d3ff 45%, #ffffff 65%, #ff7a1a 85%, #ff2b00 100%)",
                      animation: `loading-fill ${LOADING_CYCLE_MS}ms linear infinite`,
                    }}
                  />

                  {/* Bright comet-like spark riding the leading edge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      width: "26px",
                      height: "26px",
                      marginLeft: "-13px",
                      marginTop: "-13px",
                      borderRadius: "50%",
                      background:
                        "radial-gradient(circle, #ffffff 0%, #cdefff 30%, rgba(140,210,255,0.5) 55%, transparent 75%)",
                      filter: "blur(1px)",
                      animation: `loading-spark ${LOADING_CYCLE_MS}ms linear infinite`,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: "-4px",
                        top: "-10px",
                        width: "4px",
                        height: "4px",
                        borderRadius: "50%",
                        background: "#ffffff",
                        animation: "spark-flicker 0.9s ease-out 0.1s infinite",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "10px",
                        top: "6px",
                        width: "3px",
                        height: "3px",
                        borderRadius: "50%",
                        background: "#9fe0ff",
                        animation: "spark-flicker 0.7s ease-out 0.3s infinite",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Lobby visible={lobbyVisible} />
    </div>
  );
}
