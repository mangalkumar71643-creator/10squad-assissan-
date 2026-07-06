import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

// The static poster (public/loading-bg.jpg) already has "85% / Synchronizing
// squad data..." and the bar baked in at 85% — that's our frame-zero state.
// Everything below masks that baked strip and redraws it live so the number,
// bar fill, and status text can actually animate.
const POSTER_ASPECT = "720 / 1280";

export default function LoadingScreen() {
  const [, setLocation] = useLocation();
  const [progress, setProgress] = useState(85);
  const [secondaryText, setSecondaryText] = useState("");
  const [complete, setComplete] = useState(false);
  const [flash, setFlash] = useState(false);
  const [lightning, setLightning] = useState(false);
  const [explosion, setExplosion] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const audio = new Audio("/audio/loading.mp3");
    audio.volume = 0.9;
    audioRef.current = audio;
    audio.play().catch(() => {
      // Autoplay blocked (browser policy) — the visual sequence still runs.
    });

    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    at(1700, () => {
      setSecondaryText("Loading map assets...");
      setProgress(99);
    });

    [2100, 3300, 4500, 5700].forEach((t) => {
      at(t, () => {
        setLightning(true);
        setTimeout(() => setLightning(false), 160);
      });
    });

    at(5600, () => setExplosion(true));
    at(7400, () => setExplosion(false));

    at(7800, () => {
      setProgress(100);
      setComplete(true);
    });

    at(8600, () => setFlash(true));
    at(9400, () => setLocation("/lobby", { replace: true }));

    return () => {
      timers.forEach(clearTimeout);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
    // Run once on mount only — wouter's setLocation is not reference-stable
    // across renders, and re-running this effect would cancel every pending
    // timer via the cleanup above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden z-[9999] select-none">
      {/* Blurred full-bleed backdrop so the landscape frame never shows flat black bars */}
      <img
        src="/loading-bg.jpg"
        aria-hidden
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: "blur(28px) brightness(0.45)", transform: "scale(1.15)" }}
      />

      {/* Poster kept at its native portrait aspect, centered — nothing stretched or cropped */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-full" style={{ aspectRatio: POSTER_ASPECT, maxWidth: "100%" }}>
          <img src="/loading-bg.jpg" draggable={false} className="w-full h-full object-contain" />

          {/* Mask the baked-in static "85%" row so our live one reads cleanly */}
          <div
            className="absolute left-0 right-0 bottom-0 pointer-events-none"
            style={{
              height: "22%",
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(6,9,15,0.97) 18%, rgba(6,9,15,0.99) 45%, rgba(6,9,15,1) 100%)",
            }}
          />

          {/* Lightning flash over the skyline */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 50% 15%, rgba(210,225,255,0.55) 0%, transparent 60%)",
              opacity: lightning ? 1 : 0,
              transition: "opacity 120ms ease-out",
            }}
          />

          {/* Explosion burst */}
          <div
            className="absolute pointer-events-none rounded-full"
            style={{
              top: "20%",
              right: "9%",
              width: "34%",
              aspectRatio: "1",
              background:
                "radial-gradient(circle, rgba(255,255,240,0.95) 0%, rgba(255,190,60,0.85) 22%, rgba(255,110,20,0.55) 45%, transparent 72%)",
              filter: "blur(2px)",
              opacity: explosion ? 1 : 0,
              transform: explosion ? "scale(1)" : "scale(0.35)",
              transition: "opacity 0.5s ease-out, transform 0.5s ease-out",
            }}
          />

          {/* Live "N% / status" row */}
          {!complete && (
            <div
              className="absolute left-[7%] right-[7%] flex items-baseline justify-between"
              style={{ bottom: "13.8%" }}
            >
              <span className="font-mono font-bold text-white" style={{ fontSize: "clamp(9px,2.6vh,18px)" }}>
                {Math.round(progress)}%
              </span>
              <span className="font-mono text-white/85" style={{ fontSize: "clamp(7px,2vh,14px)" }}>
                Synchronizing squad data...
              </span>
            </div>
          )}

          {/* Progress bar */}
          <div className="absolute left-[6.5%] right-[6.5%]" style={{ bottom: "11%", height: "1.6%" }}>
            <div
              className="relative w-full h-full rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progress}%`,
                  background: complete
                    ? "linear-gradient(90deg, #4dd8ff, #8ef6ff)"
                    : "linear-gradient(90deg, #ff8a1e, #ffb648)",
                  boxShadow: complete
                    ? "0 0 18px 4px rgba(77,216,255,0.85)"
                    : "0 0 10px 2px rgba(255,138,30,0.6)",
                  transition: complete
                    ? "width 300ms ease-out, background 300ms ease, box-shadow 300ms ease"
                    : "width 6.1s linear",
                }}
              />
              {complete && (
                <div
                  className="absolute inset-y-0 w-1/4 pointer-events-none"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
                    animation: "loading-bar-sweep 0.9s ease-out",
                  }}
                />
              )}
            </div>
          </div>

          {/* Status row below the bar */}
          <div className="absolute left-0 right-0 text-center" style={{ bottom: "7.6%" }}>
            <span
              className="font-mono"
              style={{
                fontSize: "clamp(7px,2vh,14px)",
                color: complete ? "#8ef6ff" : "rgba(255,255,255,0.85)",
                textShadow: complete ? "0 0 10px rgba(77,216,255,0.8)" : "none",
              }}
            >
              {complete ? "Complete! Starting mission..." : secondaryText}
            </span>
          </div>
        </div>
      </div>

      {/* White transition flash before the lobby reveal */}
      <div
        className="absolute inset-0 pointer-events-none bg-white"
        style={{ opacity: flash ? 1 : 0, transition: flash ? "opacity 500ms ease-in" : "opacity 300ms ease-out" }}
      />
    </div>
  );
}
