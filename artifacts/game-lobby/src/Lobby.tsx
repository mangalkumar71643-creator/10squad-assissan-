// Main hub screen shown after the splash/loading sequence: the approved
// background chamber art, untouched, with only the provided Character
// Selection button placed on the platform. Tapping it opens a Character
// panel overlay (no backend wiring yet — this repo has none right now —
// so it's a static placeholder panel to prove the button is functional).
import { useState } from "react";

export default function Lobby({ visible }: { visible: boolean }) {
  const [characterOpen, setCharacterOpen] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
        pointerEvents: visible ? "auto" : "none",
        overflow: "hidden",
      }}
    >
      <style>{`
        .char-btn { transition: transform 0.15s ease, filter 0.15s ease; cursor: pointer; }
        .char-btn:hover { transform: translate(-50%, -100%) scale(1.04); filter: brightness(1.15); }
        .char-btn:active { transform: translate(-50%, -100%) scale(0.98); }
      `}</style>

      <img
        src="/lobby-hub-bg.jpg"
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(4,3,10,0.35) 0%, rgba(4,3,10,0.05) 22%, rgba(4,3,10,0.1) 60%, rgba(4,3,10,0.75) 100%)",
        }}
      />

      {/* Contact shadow, anchored at the same point the button rests on the platform */}
      <div
        style={{
          position: "absolute",
          left: "32%",
          top: "85%",
          transform: "translate(-50%, -14%)",
          width: "clamp(130px,16.5vw,230px)",
          height: "clamp(22px,2.8vw,38px)",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 72%)",
          filter: "blur(2px)",
        }}
      />

      <img
        src="/btn-character.png"
        alt="Character"
        className="char-btn"
        onClick={() => setCharacterOpen(true)}
        style={{
          position: "absolute",
          left: "32%",
          top: "85%",
          transform: "translate(-50%, -100%)",
          width: "clamp(150px,12.4vw,260px)",
          height: "auto",
        }}
      />

      {/* Character panel, opened by tapping the button above */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(4,3,10,0.94)",
          opacity: characterOpen ? 1 : 0,
          pointerEvents: characterOpen ? "auto" : "none",
          transition: "opacity 300ms ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "clamp(16px,4vh,40px) clamp(16px,4vw,40px)",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(18px,3vw,28px)",
              letterSpacing: "0.12em",
              color: "#e9e4f5",
              textShadow: "0 0 16px rgba(180,140,255,0.7)",
            }}
          >
            CHARACTER
          </div>
          <div
            onClick={() => setCharacterOpen(false)}
            style={{
              cursor: "pointer",
              width: "clamp(32px,4vw,42px)",
              height: "clamp(32px,4vw,42px)",
              borderRadius: "50%",
              border: "1px solid rgba(180,140,255,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c9bfe8",
              fontSize: "clamp(16px,2vw,20px)",
            }}
          >
            ✕
          </div>
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8a7fae",
            fontFamily: "'Barlow', sans-serif",
            fontSize: "clamp(12px,1.6vw,15px)",
            letterSpacing: "0.04em",
            textAlign: "center",
          }}
        >
          Character roster coming soon.
        </div>
      </div>
    </div>
  );
}
