import { useState } from "react";
import type { PlayerProgress } from "../state/progress";

// The hub is deliberately sparse — a callsign/rank readout, a credits
// readout, one big deploy button and a single button into Base. No
// loadout screen, no social menu, nothing standing between opening the
// app and pressing START.
export default function Hub({
  progress,
  onDeploy,
  onOpenBase,
}: {
  progress: PlayerProgress;
  onDeploy: () => void;
  onOpenBase: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const xpFraction = progress.xp / progress.xpToNextRank;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(ellipse 120% 80% at 50% 12%, #17293f 0%, #0a1420 45%, #050a12 100%)",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes hub-scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes hub-pulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.035); filter: brightness(1.15); }
        }
        @keyframes hub-flicker {
          0%, 96%, 100% { opacity: 1; }
          97% { opacity: 0.5; }
          98% { opacity: 1; }
        }
      `}</style>

      {/* Faint tactical grid floor fading into the horizon, plus a slow
          vertical scan line — ambient sci-fi motion (section 3/40) without
          needing any image assets. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(107,226,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(107,226,255,0.06) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 55%, black 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 55%, black 100%)",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "40%",
          background: "linear-gradient(180deg, transparent, rgba(107,226,255,0.05), transparent)",
          animation: "hub-scan 7s linear infinite",
          pointerEvents: "none",
        }}
      />

      {/* Callsign / rank */}
      <div
        style={{
          position: "absolute",
          top: "3%",
          left: "3%",
          padding: "8px 14px",
          borderRadius: 8,
          background: "rgba(8,14,24,0.6)",
          border: "1px solid rgba(107,226,255,0.35)",
        }}
      >
        <div style={{ color: "#eef4fa", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "0.06em" }}>
          OPERATOR-07
        </div>
        <div style={{ color: "#8fa3c9", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 11, marginTop: 1 }}>
          RANK {progress.rank}
        </div>
        <div style={{ width: 90, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)", overflow: "hidden", marginTop: 4 }}>
          <div style={{ width: `${xpFraction * 100}%`, height: "100%", background: "linear-gradient(90deg,#6be2ff,#3fa8dd)" }} />
        </div>
      </div>

      {/* Credits */}
      <div
        style={{
          position: "absolute",
          top: "3%",
          right: "3%",
          padding: "8px 14px",
          borderRadius: 8,
          background: "rgba(8,14,24,0.6)",
          border: "1px solid rgba(255,210,63,0.35)",
          color: "#ffd23f",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: 14,
          letterSpacing: "0.04em",
        }}
      >
        {progress.credits.toLocaleString()} CR
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: "9%",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(28px, 8vw, 40px)",
            letterSpacing: "0.14em",
            color: "#eef4fa",
            textShadow: "0 0 22px rgba(107,226,255,0.55)",
          }}
        >
          VANGUARD
        </div>
        <div
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(14px, 4vw, 18px)",
            letterSpacing: "0.5em",
            color: "#6be2ff",
            marginTop: -4,
            animation: "hub-flicker 6s ease-in-out infinite",
          }}
        >
          PROTOCOL
        </div>
      </div>

      {/* START button — positioning/centering lives on this outer
          wrapper; the pulse keyframes (which also animate `transform`)
          are scoped to the inner button only, so the two transforms
          don't fight and overwrite the translateX(-50%) centering. */}
      <div style={{ position: "absolute", left: "50%", bottom: "16%", transform: "translateX(-50%)" }}>
        <button
          onClick={onDeploy}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onTouchStart={() => setPressed(true)}
          onTouchEnd={() => setPressed(false)}
          aria-label="Start Mission"
          style={{
            display: "block",
            transform: `scale(${pressed ? 0.95 : 1})`,
            transition: "transform 120ms ease",
            padding: "18px 56px",
            borderRadius: 999,
            border: "2px solid rgba(255,180,80,0.85)",
            background: "linear-gradient(180deg, #ffb347, #ff7a1a)",
            boxShadow: pressed ? "0 0 20px rgba(255,140,40,0.5)" : "0 0 34px rgba(255,140,40,0.65)",
            color: "#241000",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(18px, 5vw, 24px)",
            letterSpacing: "0.14em",
            whiteSpace: "nowrap",
            cursor: "pointer",
            WebkitTapHighlightColor: "transparent",
            animation: pressed ? "none" : "hub-pulse 2.4s ease-in-out infinite",
          }}
        >
          START MISSION
        </button>
      </div>

      {/* Base access */}
      <button
        onClick={onOpenBase}
        aria-label="Open Base"
        style={{
          position: "absolute",
          left: "50%",
          bottom: "7%",
          transform: "translateX(-50%)",
          padding: "8px 22px",
          borderRadius: 8,
          border: "1px solid rgba(107,226,255,0.45)",
          background: "rgba(8,14,24,0.6)",
          color: "#9db0d4",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: "0.12em",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        BASE
      </button>
    </div>
  );
}
