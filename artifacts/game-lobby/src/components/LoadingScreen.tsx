import { useEffect, useState } from "react";

const MESSAGES = [
  "INITIALIZING SYSTEMS...",
  "LOADING ASSETS...",
  "CONNECTING TO SERVER...",
  "CALIBRATING WEAPONS...",
  "SQUAD ASSEMBLING...",
  "READY TO DEPLOY",
];

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx]     = useState(0);
  const [fadeOut, setFadeOut]   = useState(false);

  useEffect(() => {
    const total = 2800;
    const steps = 120;
    const interval = total / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const pct = Math.min(100, Math.round((step / steps) * 100));
      setProgress(pct);
      setMsgIdx(Math.min(MESSAGES.length - 1, Math.floor((pct / 100) * MESSAGES.length)));

      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(() => setFadeOut(true), 300);
        setTimeout(() => onDone(), 900);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-[9999]"
      style={{
        background: "#000000",
        transition: "opacity 0.6s ease",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? "none" : "all",
      }}>

      {/* Subtle scan-line overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)",
        }} />

      {/* Center content */}
      <div className="flex flex-col items-center gap-6" style={{ marginBottom: "15vh" }}>

        {/* App icon — rounded square like in the image */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "22px",
            background: "linear-gradient(145deg, #0a1628 0%, #060e1c 100%)",
            boxShadow: "0 0 0 1px rgba(255,100,30,0.18), 0 0 30px rgba(255,80,10,0.12), 0 8px 32px rgba(0,0,0,0.8)",
          }}>

          {/* Inner glow pulse */}
          <div
            className="absolute inset-0 rounded-[22px]"
            style={{
              background: "radial-gradient(ellipse at 40% 35%, rgba(255,80,20,0.18) 0%, transparent 65%)",
              animation: "pulse 2s ease-in-out infinite",
            }} />

          {/* Squad icon SVG */}
          <svg viewBox="0 0 60 60" className="w-14 h-14 relative z-10" fill="none">
            {/* Crosshair ring */}
            <circle cx="30" cy="30" r="22" stroke="rgba(255,100,30,0.55)" strokeWidth="1.2" />
            <circle cx="30" cy="30" r="14" stroke="rgba(255,120,40,0.4)" strokeWidth="0.8" strokeDasharray="4 3" />
            {/* Center dot */}
            <circle cx="30" cy="30" r="3.5" fill="rgba(255,100,30,0.9)" />
            <circle cx="30" cy="30" r="1.5" fill="#ff6420" />
            {/* Cross lines */}
            <line x1="30" y1="8"  x2="30" y2="20" stroke="rgba(255,120,40,0.7)" strokeWidth="1.2" />
            <line x1="30" y1="40" x2="30" y2="52" stroke="rgba(255,120,40,0.7)" strokeWidth="1.2" />
            <line x1="8"  y1="30" x2="20" y2="30" stroke="rgba(255,120,40,0.7)" strokeWidth="1.2" />
            <line x1="40" y1="30" x2="52" y2="30" stroke="rgba(255,120,40,0.7)" strokeWidth="1.2" />
            {/* Corner brackets */}
            <path d="M14 14 L18 14 L18 18" stroke="rgba(255,140,50,0.6)" strokeWidth="1.2" fill="none" />
            <path d="M46 14 L42 14 L42 18" stroke="rgba(255,140,50,0.6)" strokeWidth="1.2" fill="none" />
            <path d="M14 46 L18 46 L18 42" stroke="rgba(255,140,50,0.6)" strokeWidth="1.2" fill="none" />
            <path d="M46 46 L42 46 L42 42" stroke="rgba(255,140,50,0.6)" strokeWidth="1.2" fill="none" />
          </svg>
        </div>

        {/* Game title */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-mono font-black tracking-[0.35em] uppercase"
            style={{ fontSize: "18px", color: "#ffffff", letterSpacing: "0.3em" }}>
            10 SQUAD
          </p>
          <p className="font-mono font-bold tracking-[0.5em] uppercase"
            style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", letterSpacing: "0.55em" }}>
            ASSASSIN
          </p>
        </div>

        {/* Status message */}
        <p
          key={msgIdx}
          className="font-mono tracking-[0.25em] uppercase"
          style={{
            fontSize: "9px",
            color: "rgba(255,100,30,0.75)",
            animation: "fadein 0.3s ease",
            minHeight: "14px",
          }}>
          {MESSAGES[msgIdx]}
        </p>
      </div>

      {/* Bottom progress bar — exactly like the image */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: "3px", background: "rgba(255,255,255,0.06)" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, rgba(255,80,10,0.6), rgba(255,140,40,0.9), rgba(255,200,80,1))",
            boxShadow: "0 0 10px rgba(255,140,40,0.6)",
            transition: "width 0.08s linear",
          }} />
      </div>

      <style>{`
        @keyframes fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse  { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
