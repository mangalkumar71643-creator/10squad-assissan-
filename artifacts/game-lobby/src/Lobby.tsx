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
// The "CHARACTER" gem is cropped out of that same artwork as its own
// pixel-identical image (so it sits seamlessly over the background at
// rest) which lets it actually press down and pop back up on tap,
// instead of just being a dead hotspot — then opens a Character panel.
import { useRef, useState } from "react";

const CHAR_BTN_CLIP =
  "polygon(1.4% 28.9%, 26.1% 6.1%, 47.7% 11.3%, 66.1% 0%, 96.9% 21%, 100% 100%, 0% 100%)";

export default function Lobby({ visible }: { visible: boolean }) {
  const [characterOpen, setCharacterOpen] = useState(false);
  const [popping, setPopping] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleTap = () => {
    timers.current.forEach(clearTimeout);
    setPopping(true);
    timers.current = [
      setTimeout(() => setCharacterOpen(true), 160),
      setTimeout(() => setPopping(false), 340),
    ];
  };

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
        @keyframes char-btn-pop {
          0% { transform: scale(1) translateY(0); filter: brightness(1) drop-shadow(0 0 0 rgba(180,140,255,0)); }
          32% { transform: scale(0.92) translateY(3px); filter: brightness(0.82) drop-shadow(0 0 0 rgba(180,140,255,0)); }
          68% { transform: scale(1.08) translateY(-6px); filter: brightness(1.3) drop-shadow(0 6px 14px rgba(180,140,255,0.7)); }
          100% { transform: scale(1) translateY(0); filter: brightness(1) drop-shadow(0 0 0 rgba(180,140,255,0)); }
        }
        .char-btn-wrap { cursor: pointer; }
        .char-btn-wrap img { display: block; transition: transform 0.1s ease, filter 0.1s ease; transform-origin: 50% 100%; }
        .char-btn-wrap:active img { transform: scale(0.92) translateY(3px); filter: brightness(0.82); }
        .char-btn-wrap.is-popping img { animation: char-btn-pop 340ms ease-out; }
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

        {/* The CHARACTER gem, cropped from the same artwork so it's
            pixel-seamless at rest, made tappable with real press/pop
            feedback since it's now a real (if invisibly-seamed) element. */}
        <div
          className={`char-btn-wrap${popping ? " is-popping" : ""}`}
          onClick={handleTap}
          style={{
            position: "absolute",
            left: "31.2%",
            top: "51.9%",
            width: "7.13%",
            height: "22.3%",
          }}
        >
          <img
            src="/btn-character-crop.jpg"
            alt="Character"
            style={{ width: "100%", height: "100%", clipPath: CHAR_BTN_CLIP }}
          />
        </div>

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
