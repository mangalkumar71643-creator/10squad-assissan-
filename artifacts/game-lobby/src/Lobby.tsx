// Main hub screen shown after the splash/loading sequence.
//
// Previous iteration (character button + crystal-chamber background,
// with a working tap-to-open Character panel) is preserved in git
// history (commit 1b6a0ad) — bring it back on request rather than
// rebuilding it from scratch.
//
// Current iteration: the full approved concept-art mockup used directly
// as a single flat image, locked to a 16:9 frame and letterboxed so it
// never stretches or crops on devices with a different aspect ratio.
// An invisible tap target sits over the "CHARACTER" gem in the artwork
// (the button itself is just pixels in the image, not a real element)
// and opens a Character panel overlay.
import { useState } from "react";

export default function Lobby({ visible }: { visible: boolean }) {
  const [characterOpen, setCharacterOpen] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
        pointerEvents: visible ? "auto" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <style>{`
        .char-hotspot { transition: background 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
        .char-hotspot:hover { background: rgba(180,140,255,0.1); box-shadow: inset 0 0 0 1px rgba(180,140,255,0.5); }
        .char-hotspot:active { background: rgba(180,140,255,0.18); }
      `}</style>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          maxWidth: "calc(100vh * 16 / 9)",
          maxHeight: "calc(100vw * 9 / 16)",
          aspectRatio: "16 / 9",
          margin: "auto",
        }}
      >
        <img
          src="/lobby-full-mockup.jpg"
          alt="10 Squad Assassin lobby"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />

        {/* Invisible tap target over the CHARACTER gem in the artwork */}
        <div
          className="char-hotspot"
          onClick={() => setCharacterOpen(true)}
          style={{
            position: "absolute",
            left: "28%",
            top: "51.9%",
            width: "11.6%",
            height: "23.4%",
            borderRadius: "6px",
          }}
        />

        {/* Character panel, opened by tapping the CHARACTER gem above */}
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
            padding: "clamp(16px,4%,40px)",
          }}
        >
          <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
    </div>
  );
}
