import { useEffect, useState, useRef } from "react";

const TIPS = [
  "TIP: Use Shadow Blade for close-range silent takedowns.",
  "TIP: Nova Cannon deals heavy splash damage in open areas.",
  "TIP: Coordinate with your squad before breaching.",
  "TIP: Headshots deal 2.5× base damage.",
  "TIP: Stay crouched to reduce enemy detection range.",
  "TIP: Pulse Rifle has the highest accuracy at long range.",
];

const STEPS = [
  { pct: 12,  label: "INITIALIZING ENGINE" },
  { pct: 28,  label: "LOADING WORLD DATA" },
  { pct: 45,  label: "SPAWNING ASSETS" },
  { pct: 62,  label: "CALIBRATING WEAPONS" },
  { pct: 78,  label: "CONNECTING TO SERVER" },
  { pct: 91,  label: "ASSEMBLING SQUAD" },
  { pct: 100, label: "READY TO DEPLOY" },
];

/* ── Particle dot ── */
type Particle = { x: number; y: number; r: number; vx: number; vy: number; alpha: number };

function useParticles(count = 38) {
  const ref = useRef<Particle[]>([]);
  if (ref.current.length === 0) {
    ref.current = Array.from({ length: count }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: 0.5 + Math.random() * 1.5,
      vx: (Math.random() - 0.5) * 0.012,
      vy: (Math.random() - 0.5) * 0.012,
      alpha: 0.15 + Math.random() * 0.35,
    }));
  }
  return ref.current;
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useParticles(40);
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = 100; if (p.x > 100) p.x = 0;
        if (p.y < 0) p.y = 100; if (p.y > 100) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x / 100 * W, p.y / 100 * H, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,120,40,${p.alpha})`;
        ctx.fill();
      });

      /* Faint connecting lines */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = (a.x - b.x) / 100 * W, dy = (a.y - b.y) / 100 * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x / 100 * W, a.y / 100 * H);
            ctx.lineTo(b.x / 100 * W, b.y / 100 * H);
            ctx.strokeStyle = `rgba(255,100,30,${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, [particles]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

/* ── Glitch text hook ── */
function useGlitch(text: string, interval = 3200) {
  const [display, setDisplay] = useState(text);
  const chars = "▓▒░█▄▀$#@!?";

  useEffect(() => {
    const loop = setInterval(() => {
      let frame = 0;
      const t = setInterval(() => {
        if (frame > 6) { setDisplay(text); clearInterval(t); return; }
        setDisplay(
          text.split("").map((ch, i) =>
            i < frame ? ch : Math.random() < 0.4 ? chars[Math.floor(Math.random() * chars.length)] : ch
          ).join("")
        );
        frame++;
      }, 55);
    }, interval);
    return () => clearInterval(loop);
  }, [text, interval]);

  return display;
}

/* ══════════════════════════════════════════════ */
export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [progress,  setProgress]  = useState(0);
  const [stepLabel, setStepLabel] = useState(STEPS[0].label);
  const [tipIdx,    setTipIdx]    = useState(0);
  const [fadeOut,   setFadeOut]   = useState(false);
  const [dots,      setDots]      = useState("");
  const title = useGlitch("10 SQUAD ASSASSIN");

  /* Animate progress through steps */
  useEffect(() => {
    let stepIdx = 0;
    const advance = () => {
      if (stepIdx >= STEPS.length) return;
      const target = STEPS[stepIdx].label;
      setStepLabel(target);
      const targetPct = STEPS[stepIdx].pct;
      stepIdx++;

      const tick = setInterval(() => {
        setProgress(prev => {
          if (prev >= targetPct) {
            clearInterval(tick);
            if (stepIdx < STEPS.length) setTimeout(advance, 340);
            else {
              setTimeout(() => setFadeOut(true), 500);
              setTimeout(() => onDone(), 1100);
            }
            return prev;
          }
          return prev + 1;
        });
      }, 28);
    };
    advance();
  }, [onDone]);

  /* Rotating tips */
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 2600);
    return () => clearInterval(t);
  }, []);

  /* Animated dots */
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 420);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        background: "#050505",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.7s ease",
        pointerEvents: fadeOut ? "none" : "all",
      }}>

      {/* Particle network */}
      <ParticleCanvas />

      {/* Hex grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 0 L56 14 L56 42 L28 56 L0 42 L0 14 Z' fill='none' stroke='%23ff7020' stroke-width='0.8'/%3E%3C/svg%3E")`,
          backgroundSize: "56px 100px",
        }} />

      {/* Scan-line */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg,rgba(0,0,0,0.22) 0px,rgba(0,0,0,0.22) 1px,transparent 1px,transparent 3px)",
        }} />

      {/* Corner HUD brackets */}
      {[["top-4 left-4","border-t-2 border-l-2"],["top-4 right-4","border-t-2 border-r-2"],
        ["bottom-14 left-4","border-b-2 border-l-2"],["bottom-14 right-4","border-b-2 border-r-2"]]
        .map(([pos, border]) => (
          <div key={pos} className={`absolute ${pos} w-8 h-8 ${border} pointer-events-none`}
            style={{ borderColor: "rgba(255,120,40,0.35)" }} />
        ))}

      {/* HUD top bar */}
      <div className="absolute top-5 left-0 right-0 flex justify-center pointer-events-none">
        <span className="font-mono text-[8px] tracking-[0.55em] uppercase"
          style={{ color: "rgba(255,100,30,0.4)" }}>
          ◈ SYSTEM BOOT SEQUENCE ◈
        </span>
      </div>

      {/* ─── Center block ─── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5"
        style={{ paddingBottom: "8vh" }}>

        {/* Logo ring */}
        <div className="relative flex items-center justify-center" style={{ width: 110, height: 110 }}>
          {/* Spinning outer ring */}
          <div className="absolute inset-0 rounded-full"
            style={{
              border: "1.5px solid transparent",
              borderTopColor: "rgba(255,120,40,0.8)",
              borderRightColor: "rgba(255,120,40,0.3)",
              animation: "spin 2.4s linear infinite",
            }} />
          {/* Spinning inner ring (opposite) */}
          <div className="absolute rounded-full"
            style={{
              inset: 8,
              border: "1px dashed rgba(255,100,30,0.3)",
              animation: "spin 4s linear infinite reverse",
            }} />
          {/* Icon card */}
          <div className="relative flex items-center justify-center"
            style={{
              width: 76, height: 76, borderRadius: "18px",
              background: "linear-gradient(145deg,#0d1a2e 0%,#060c18 100%)",
              boxShadow: "0 0 0 1px rgba(255,100,30,0.22), 0 0 24px rgba(255,80,10,0.18), 0 6px 28px rgba(0,0,0,0.9)",
            }}>
            <svg viewBox="0 0 54 54" className="w-11 h-11" fill="none">
              <circle cx="27" cy="27" r="20" stroke="rgba(255,110,30,0.5)" strokeWidth="1.2" />
              <circle cx="27" cy="27" r="12" stroke="rgba(255,130,40,0.35)" strokeWidth="0.8" strokeDasharray="5 3" />
              <circle cx="27" cy="27" r="4"  fill="rgba(255,100,30,0.9)" />
              <circle cx="27" cy="27" r="1.8" fill="#ff8030" />
              <line x1="27" y1="7"  x2="27" y2="18" stroke="rgba(255,130,40,0.75)" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="27" y1="36" x2="27" y2="47" stroke="rgba(255,130,40,0.75)" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="7"  y1="27" x2="18" y2="27" stroke="rgba(255,130,40,0.75)" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="36" y1="27" x2="47" y2="27" stroke="rgba(255,130,40,0.75)" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M13 13 L17 13 L17 17" stroke="rgba(255,140,50,0.55)" strokeWidth="1" fill="none" strokeLinecap="round" />
              <path d="M41 13 L37 13 L37 17" stroke="rgba(255,140,50,0.55)" strokeWidth="1" fill="none" strokeLinecap="round" />
              <path d="M13 41 L17 41 L17 37" stroke="rgba(255,140,50,0.55)" strokeWidth="1" fill="none" strokeLinecap="round" />
              <path d="M41 41 L37 41 L37 37" stroke="rgba(255,140,50,0.55)" strokeWidth="1" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Title with glitch */}
        <div className="flex flex-col items-center gap-1">
          <h1 className="font-mono font-black tracking-[0.22em] uppercase select-none"
            style={{
              fontSize: "22px",
              color: "#ffffff",
              textShadow: "0 0 30px rgba(255,100,30,0.5), 0 0 8px rgba(255,100,30,0.3)",
              letterSpacing: "0.25em",
            }}>
            {title}
          </h1>
          <div className="flex items-center gap-2">
            <div style={{ width: 28, height: 1, background: "linear-gradient(90deg,transparent,rgba(255,100,30,0.6))" }} />
            <span className="font-mono text-[8px] tracking-[0.6em] uppercase"
              style={{ color: "rgba(255,100,30,0.55)" }}>TACTICAL OPS</span>
            <div style={{ width: 28, height: 1, background: "linear-gradient(90deg,rgba(255,100,30,0.6),transparent)" }} />
          </div>
        </div>

        {/* Status + percentage */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] tracking-[0.3em] uppercase"
              style={{ color: "rgba(255,120,40,0.8)" }}>
              {stepLabel}{dots}
            </span>
          </div>
          <span className="font-mono font-black"
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>
            {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative" style={{ width: "260px", height: "4px" }}>
          {/* Track */}
          <div className="absolute inset-0 rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }} />
          {/* Filled */}
          <div className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg,rgba(200,60,0,0.8),rgba(255,120,30,1),rgba(255,200,80,1))",
              boxShadow: "0 0 12px rgba(255,140,40,0.7), 0 0 4px rgba(255,200,80,0.5)",
              transition: "width 0.06s linear",
            }} />
          {/* Moving glow tip */}
          {progress > 0 && progress < 100 && (
            <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
              style={{
                left: `calc(${progress}% - 4px)`,
                background: "#ffffff",
                boxShadow: "0 0 8px rgba(255,200,100,1)",
                transition: "left 0.06s linear",
              }} />
          )}
          {/* Segment ticks */}
          {[25, 50, 75].map(t => (
            <div key={t} className="absolute top-0 h-full w-px"
              style={{ left: `${t}%`, background: "rgba(0,0,0,0.5)" }} />
          ))}
        </div>
      </div>

      {/* ─── Bottom tip bar ─── */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center px-8">
        <p key={tipIdx}
          className="font-mono text-center"
          style={{
            fontSize: "9px",
            color: "rgba(255,255,255,0.3)",
            letterSpacing: "0.08em",
            animation: "tipfade 0.5s ease",
          }}>
          {TIPS[tipIdx]}
        </p>
      </div>

      {/* Bottom thin accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,100,30,0.35),transparent)" }} />

      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes tipfade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
