import { useEffect, useState } from "react";

const STEPS = [
  "Initializing game engine...",
  "Loading world assets...",
  "Spawning squad members...",
  "Calibrating weapons...",
  "Connecting to server...",
  "Synchronizing squad data...",
  "Loading map assets...",
  "Ready to deploy!",
];

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress]   = useState(0);
  const [stepIdx,  setStepIdx]    = useState(0);
  const [fadeOut,  setFadeOut]    = useState(false);

  useEffect(() => {
    const totalMs  = 3200;
    const tickMs   = 30;
    const totalTicks = totalMs / tickMs;
    let tick = 0;

    const t = setInterval(() => {
      tick++;
      const pct = Math.min(100, Math.round((tick / totalTicks) * 100));
      setProgress(pct);
      setStepIdx(Math.min(STEPS.length - 1, Math.floor((pct / 100) * STEPS.length)));

      if (pct >= 100) {
        clearInterval(t);
        setTimeout(() => setFadeOut(true), 400);
        setTimeout(() => onDone(), 1000);
      }
    }, tickMs);

    return () => clearInterval(t);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: fadeOut ? "none" : "all",
      }}>

      {/* ── Full-screen background image ── */}
      <div className="absolute inset-0">
        <img
          src="/loading-bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.82)" }}
        />
        {/* Dark gradient top — so title is readable */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.88) 100%)" }} />
      </div>

      {/* ── TOP: Game title ── */}
      <div className="relative z-10 flex flex-col items-center pt-10 px-4">
        {/* "10 SQUAD" */}
        <div className="flex items-end leading-none" style={{ gap: "2px" }}>
          <span
            className="font-black"
            style={{
              fontSize: "clamp(38px, 10vw, 56px)",
              color: "#f5f5f5",
              fontFamily: "'Arial Black', 'Impact', sans-serif",
              textShadow: "0 0 18px rgba(255,160,40,0.6), 2px 2px 0 rgba(0,0,0,0.8)",
              letterSpacing: "-0.01em",
              lineHeight: 1,
            }}>
            10
          </span>
          <span
            className="font-black"
            style={{
              fontSize: "clamp(38px, 10vw, 56px)",
              color: "#f5f5f5",
              fontFamily: "'Arial Black', 'Impact', sans-serif",
              textShadow: "0 0 18px rgba(255,160,40,0.5), 2px 2px 0 rgba(0,0,0,0.8)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              paddingLeft: "6px",
            }}>
            SQUAD
          </span>
        </div>

        {/* "ASSASSIN" */}
        <div
          className="font-black tracking-widest"
          style={{
            fontSize: "clamp(28px, 8vw, 44px)",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            background: "linear-gradient(90deg, #ff8c00, #ffcc00, #ff8c00)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
            filter: "drop-shadow(0 0 8px rgba(255,160,0,0.5))",
            lineHeight: 1.05,
            letterSpacing: "0.08em",
          }}>
          ASSASSIN
        </div>

        {/* Subtitle */}
        <p
          className="font-bold tracking-[0.35em] uppercase mt-1"
          style={{
            fontSize: "clamp(9px, 2.5vw, 13px)",
            color: "rgba(220,220,220,0.85)",
            fontFamily: "monospace",
            textShadow: "0 1px 4px rgba(0,0,0,0.9)",
            letterSpacing: "0.4em",
          }}>
          TACTICAL SPECIAL OPS
        </p>
      </div>

      {/* ── BOTTOM: Progress bar area ── */}
      <div className="relative z-10 mt-auto px-5 pb-8 flex flex-col gap-2">

        {/* Status row: percentage left, text right */}
        <div className="flex items-center justify-between">
          <span
            className="font-black"
            style={{
              fontSize: "clamp(13px, 4vw, 17px)",
              color: "#ffffff",
              fontFamily: "'Arial Black', monospace",
              textShadow: "0 0 10px rgba(255,160,40,0.5)",
            }}>
            {progress}%
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: "clamp(9px, 2.8vw, 12px)",
              color: "rgba(200,220,255,0.85)",
              textShadow: "0 1px 4px rgba(0,0,0,0.9)",
              letterSpacing: "0.04em",
            }}>
            {STEPS[stepIdx]}
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative rounded-full overflow-hidden"
          style={{ height: "6px", background: "rgba(255,255,255,0.12)" }}>
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #ff6a00, #ffb300, #00e5ff)",
              boxShadow: "0 0 10px rgba(255,180,0,0.7), 0 0 4px rgba(0,229,255,0.5)",
              transition: "width 0.05s linear",
            }} />
          {/* Glowing tip dot */}
          {progress > 1 && progress < 100 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `calc(${progress}% - 5px)`,
                width: 10, height: 10,
                background: "#00e5ff",
                boxShadow: "0 0 10px 3px rgba(0,229,255,0.9)",
                transition: "left 0.05s linear",
              }} />
          )}
        </div>

        {/* Extra bottom hint */}
        <p className="font-mono text-center"
          style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em" }}>
          ◈ &nbsp; TACTICAL SPECIAL OPS &nbsp; ◈
        </p>
      </div>
    </div>
  );
}
