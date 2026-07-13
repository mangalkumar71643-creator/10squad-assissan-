import { useState } from "react";

// Main hub screen shown after the splash/loading sequence: the approved
// concept-art mockup, natively 16:9, rendered full-bleed edge-to-edge
// (object-fit: cover, same pattern as the other full-screen backgrounds
// in this app) so there are no black bars on any side.
//
// The four monolith buttons (Character/Map Selection/Missions/Nexus Mode)
// are baked into that flat background image, so "Character" is made
// tappable with an invisible hit-area positioned over its footprint in
// the artwork (in percent, so it tracks the cover-scaled image on any
// screen). There's no character roster backend wired into this rebuilt
// frontend yet, so tapping it opens a placeholder panel.

const CHAR_BTN = {
  left: (495 / 1920) * 100,
  top: (590 / 1080) * 100,
  width: ((755 - 495) / 1920) * 100,
  height: ((935 - 590) / 1080) * 100,
};

function CharacterPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="Character"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(4, 6, 16, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 82vw)",
          maxHeight: "78vh",
          overflow: "auto",
          background: "linear-gradient(180deg, rgba(20,14,42,0.97), rgba(8,6,20,0.97))",
          border: "1px solid rgba(168,120,255,0.45)",
          borderRadius: 14,
          boxShadow: "0 0 60px rgba(120,60,255,0.35), inset 0 0 40px rgba(80,40,180,0.15)",
          padding: "22px 26px 28px",
          fontFamily: "'Barlow', sans-serif",
          color: "#e8e2ff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              margin: 0,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: 2,
              color: "#c9a8ff",
              textShadow: "0 0 18px rgba(170,110,255,0.7)",
            }}
          >
            CHARACTER
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "1px solid rgba(168,120,255,0.5)",
              background: "rgba(255,255,255,0.05)",
              color: "#e8e2ff",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{
            marginTop: 18,
            height: 1,
            background: "linear-gradient(90deg, rgba(168,120,255,0.6), rgba(168,120,255,0))",
          }}
        />

        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "18px 8px" }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: "50%",
              border: "1px solid rgba(168,120,255,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 30px rgba(140,80,255,0.4)",
              fontSize: 34,
            }}
          >
            🛡️
          </div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: 1,
              color: "#9d8ac2",
              textAlign: "center",
            }}
          >
            Character roster coming soon
          </div>
          <div style={{ fontSize: 14, color: "#8a80a8", textAlign: "center", maxWidth: 340 }}>
            Your squad's operatives will be selectable here once the roster is live.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Lobby({ visible }: { visible: boolean }) {
  const [characterOpen, setCharacterOpen] = useState(false);
  const [characterPressed, setCharacterPressed] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
        pointerEvents: visible ? "auto" : "none",
        overflow: "hidden",
      }}
    >
      <img
        src="/lobby-full-mockup.jpg"
        alt="10 Squad Assassin lobby"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // Slight overscan: some viewports report a hair less usable
          // height than 100% (mobile browser/WebView chrome), which can
          // leave a thin gap at an edge under a plain `cover` fit. Scaling
          // up a touch from the top edge grows the image downward only,
          // so it always overshoots on every side with zero gap while the
          // top stays exactly where it was.
          transform: "scale(1.04)",
          transformOrigin: "50% 0%",
        }}
      />

      <button
        aria-label="Character"
        onClick={() => setCharacterOpen(true)}
        onMouseDown={() => setCharacterPressed(true)}
        onMouseUp={() => setCharacterPressed(false)}
        onMouseLeave={() => setCharacterPressed(false)}
        onTouchStart={() => setCharacterPressed(true)}
        onTouchEnd={() => setCharacterPressed(false)}
        onTouchCancel={() => setCharacterPressed(false)}
        style={{
          position: "absolute",
          left: `${CHAR_BTN.left}%`,
          top: `${CHAR_BTN.top}%`,
          width: `${CHAR_BTN.width}%`,
          height: `${CHAR_BTN.height}%`,
          background: "transparent",
          border: "none",
          padding: 0,
          margin: 0,
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {/* The Character monolith is baked into the background; this sprite
            is the same artwork cut out and layered back on top so it can
            visibly move on tap — the original spot underneath is blended
            into the floor so nothing peeks out when it shifts. */}
        <img
          src="/char-button-sprite.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
            transform: `translateY(${characterPressed ? 7 : 0}px)`,
            transition: characterPressed ? "transform 80ms ease-out" : "transform 160ms ease-out",
          }}
        />
      </button>

      {characterOpen && <CharacterPanel onClose={() => setCharacterOpen(false)} />}
    </div>
  );
}
