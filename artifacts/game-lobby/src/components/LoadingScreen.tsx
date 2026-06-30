import { useEffect, useState } from "react";

const STEPS = [
  { pct: 80, label: "Synchronizing squad data..." },
  { pct: 88, label: "Loading map assets..." },
  { pct: 95, label: "Preparing deployment zone..." },
  { pct: 100, label: "Ready to deploy!" },
];

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(75);
  const [label,    setLabel]    = useState("Synchronizing squad data...");
  const [fadeOut,  setFadeOut]  = useState(false);

  useEffect(() => {
    // Hide the HTML inline loader now that React has taken over
    if (typeof window !== "undefined" && (window as any).__hideHtmlLoader) {
      (window as any).__hideHtmlLoader();
    }
  }, []);

  useEffect(() => {
    let stepIdx = 0;

    const advance = () => {
      if (stepIdx >= STEPS.length) return;
      const { pct, label: lbl } = STEPS[stepIdx];
      setLabel(lbl);
      stepIdx++;

      const tick = setInterval(() => {
        setProgress(prev => {
          if (prev >= pct) {
            clearInterval(tick);
            if (stepIdx < STEPS.length) setTimeout(advance, 300);
            else {
              setTimeout(() => setFadeOut(true), 400);
              setTimeout(() => onDone(), 1000);
            }
            return prev;
          }
          return prev + 1;
        });
      }, 28);
    };

    advance();
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-hidden"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: fadeOut ? "none" : "all",
      }}>

      {/* Full-screen background */}
      <div className="absolute inset-0">
        <img
          src="/loading-bg.jpg"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ filter: "brightness(0.82)" }}
        />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.0) 55%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.88) 100%)" }} />
      </div>

      {/* TOP: Game title */}
      <div className="relative z-10 flex flex-col items-center pt-10 px-4">

        <div className="flex items-end leading-none" style={{ gap: "4px" }}>
          <span className="font-black"
            style={{
              fontSize: "clamp(38px, 10vw, 56px)",
              color: "#f5f5f5",
              fontFamily: "'Arial Black', 'Impact', sans-serif",
              textShadow: "0 0 18px rgba(255,160,40,0.6), 2px 2px 0 rgba(0,0,0,0.8)",
              letterSpacing: "0.04em", lineHeight: 1,
            }}>
            10 SQUAD
          </span>
        </div>
        <div className="font-black tracking-widest"
          style={{
            fontSize: "clamp(28px, 8vw, 44px)",
            fontFamily: "'Arial Black', 'Impact', sans-serif",
            background: "linear-gradient(90deg, #ff8c00, #ffcc00, #ff8c00)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 0 8px rgba(255,160,0,0.5))",
            lineHeight: 1.05, letterSpacing: "0.08em",
          }}>
          ASSASSIN
        </div>
        <p className="font-bold tracking-[0.35em] uppercase mt-1"
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

      {/* BOTTOM: Progress */}
      <div className="relative z-10 mt-auto px-5 pb-8 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-black"
            style={{
              fontSize: "clamp(13px, 4vw, 17px)",
              color: "#ffffff",
              fontFamily: "'Arial Black', monospace",
              textShadow: "0 0 10px rgba(255,160,40,0.5)",
            }}>
            {progress}%
          </span>
          <span className="font-mono"
            style={{
              fontSize: "clamp(9px, 2.8vw, 12px)",
              color: "rgba(200,220,255,0.85)",
              textShadow: "0 1px 4px rgba(0,0,0,0.9)",
              letterSpacing: "0.04em",
            }}>
            {label}
          </span>
        </div>

        <div className="relative rounded-full overflow-hidden"
          style={{ height: "6px", background: "rgba(255,255,255,0.12)" }}>
          <div className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #ff6a00, #ffb300, #00e5ff)",
              boxShadow: "0 0 10px rgba(255,180,0,0.7), 0 0 4px rgba(0,229,255,0.5)",
              transition: "width 0.05s linear",
            }} />
          {progress > 1 && progress < 100 && (
            <div className="absolute top-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `calc(${progress}% - 5px)`,
                width: 10, height: 10,
                background: "#00e5ff",
                boxShadow: "0 0 10px 3px rgba(0,229,255,0.9)",
                transition: "left 0.05s linear",
              }} />
          )}
        </div>

        <p className="font-mono text-center"
          style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)", letterSpacing: "0.1em" }}>
          ◈ &nbsp; TACTICAL SPECIAL OPS &nbsp; ◈
        </p>
      </div>
    </div>
  );
}
