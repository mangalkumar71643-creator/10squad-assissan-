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
  "polygon(6.5% 32.9%, 30.4% 14.3%, 65.9% 5.3%, 92.6% 23.4%, 94.8% 60.4%, 92.4% 92.6%, 7% 93.7%)";

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
          0% { transform: translateY(0); filter: brightness(1) drop-shadow(0 0 0 rgba(180,140,255,0)); }
          32% { transform: translateY(12px); filter: brightness(0.8) drop-shadow(0 0 0 rgba(180,140,255,0)); }
          68% { transform: translateY(-16px); filter: brightness(1.35) drop-shadow(0 10px 16px rgba(180,140,255,0.75)); }
          100% { transform: translateY(0); filter: brightness(1) drop-shadow(0 0 0 rgba(180,140,255,0)); }
        }
        .char-btn-wrap { cursor: pointer; }
        .char-btn-wrap img { display: block; transition: transform 0.1s ease, filter 0.1s ease; }
        .char-btn-wrap:active img { transform: translateY(12px); filter: brightness(0.8); }
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
            left: "31.35%",
            top: "52.11%",
            width: "6.83%",
            height: "21.75%",
            clipPath: CHAR_BTN_CLIP,
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
