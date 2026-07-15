import { useLayoutEffect, useRef, useState } from "react";

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

// Traced against the source artwork (1920x1080) by isolating each card's
// dark body via brightness thresholding (profiling rows/columns for its
// true edges, cross-checked against the rendered art), so each hit-area
// matches its visible crystal card's actual pixel footprint instead of a
// loose/eyeballed rectangle around it.
const CHAR_BOX = { left: 560, top: 624, right: 718, bottom: 883 };
const MAP_BOX = { left: 761, top: 617, right: 925, bottom: 878 };
const MISSIONS_BOX = { left: 980, top: 625, right: 1133, bottom: 883 };
const NEXUS_BOX = { left: 1194, top: 621, right: 1351, bottom: 878 };
// Octagon outline of a card, as % of the button's own box (clip-path is
// relative to the element it's applied to, so this stays correct however
// the button itself is scaled/positioned). All four monolith cards share
// this same proportional shape.
const CARD_CLIP =
  "polygon(52% 1%, 98% 14%, 99% 79%, 73% 93%, 52% 99%, 32% 93%, 4% 79%, 5% 14%)";

const IMG_W = 1920;
const IMG_H = 1080;
// Matches the background image's own CSS transform below — each button's
// hit-area is computed through the exact same object-fit:cover + overscan
// math applied to the art, so it tracks the visible card pixel-for-pixel
// at any container aspect ratio instead of only lining up at 16:9 (a plain
// "% of image size" box drifts from the art as soon as the aspect ratio
// diverges from 16:9, which is common on real phones).
const IMG_OVERSCAN = 1.04;

type Box = { left: number; top: number; right: number; bottom: number };

function computeCardRect(box: Box, containerW: number, containerH: number) {
  if (containerW <= 0 || containerH <= 0) return null;

  // object-fit: cover — image scaled so it fully covers the container,
  // centered, with the overflow cropped equally on the long axis.
  const baseScale = Math.max(containerW / IMG_W, containerH / IMG_H);
  const imgLeft = (containerW - IMG_W * baseScale) / 2;
  const imgTop = (containerH - IMG_H * baseScale) / 2;

  // Then the extra CSS transform: scale(IMG_OVERSCAN) with
  // transformOrigin "50% 0%" (top-center of the cover-fitted image box).
  const originX = imgLeft + (IMG_W * baseScale) / 2;
  const originY = imgTop;

  const toScreen = (px: number, py: number) => {
    const x1 = imgLeft + px * baseScale;
    const y1 = imgTop + py * baseScale;
    return {
      x: originX + (x1 - originX) * IMG_OVERSCAN,
      y: originY + (y1 - originY) * IMG_OVERSCAN,
    };
  };

  const topLeft = toScreen(box.left, box.top);
  const bottomRight = toScreen(box.right, box.bottom);

  return {
    left: topLeft.x,
    top: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

type CardRect = ReturnType<typeof computeCardRect>;

function CardHotspot({
  label,
  rect,
  pressed,
  onPress,
  onRelease,
  onClick,
}: {
  label: string;
  rect: CardRect;
  pressed: boolean;
  onPress: () => void;
  onRelease: () => void;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      onTouchStart={onPress}
      onTouchEnd={onRelease}
      onTouchCancel={onRelease}
      style={{
        position: "absolute",
        left: rect ? `${rect.left}px` : 0,
        top: rect ? `${rect.top}px` : 0,
        width: rect ? `${rect.width}px` : 0,
        height: rect ? `${rect.height}px` : 0,
        visibility: rect ? "visible" : "hidden",
        clipPath: CARD_CLIP,
        background: "transparent",
        border: "none",
        padding: 0,
        margin: 0,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {/* The button itself is baked into the background and doesn't move;
          this highlight just outlines the actual tappable area while
          held, so it's visible how far the hit-area extends. Same
          clip-path as the button itself (not just this visual child) so
          the shown outline always matches the real hit-test region
          exactly. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          clipPath: CARD_CLIP,
          border: "2px solid rgba(190,140,255,0.9)",
          background: "rgba(150,90,255,0.16)",
          boxShadow: "0 0 18px rgba(170,110,255,0.6), inset 0 0 18px rgba(170,110,255,0.35)",
          opacity: pressed ? 1 : 0,
          transition: "opacity 100ms ease-out",
        }}
      />
    </button>
  );
}

const DEPLOY_CLIP = "polygon(14% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 45%)";

function DeployButton({
  pressed,
  onPress,
  onRelease,
  onClick,
}: {
  pressed: boolean;
  onPress: () => void;
  onRelease: () => void;
  onClick: () => void;
}) {
  return (
    <button
      aria-label="Deploy"
      onClick={onClick}
      onMouseDown={onPress}
      onMouseUp={onRelease}
      onMouseLeave={onRelease}
      onTouchStart={onPress}
      onTouchEnd={onRelease}
      onTouchCancel={onRelease}
      style={{
        position: "absolute",
        right: "4%",
        bottom: "5%",
        zIndex: 5,
        padding: "clamp(10px, 1.6vh, 16px) clamp(22px, 3.4vw, 40px)",
        minWidth: "clamp(120px, 16vw, 220px)",
        clipPath: DEPLOY_CLIP,
        border: "none",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        background: "linear-gradient(135deg, #ff6a2b 0%, #ff3d1a 55%, #d81f0f 100%)",
        boxShadow: "0 0 26px rgba(255,110,40,0.75), 0 0 50px rgba(255,60,20,0.35), inset 0 1px 0 rgba(255,255,255,0.35)",
        animation: pressed ? "none" : "deploy-pulse 2.4s ease-in-out infinite",
      }}
    >
      <style>{`
        @keyframes deploy-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.18); }
        }
      `}</style>
      {/* Same press-highlight pattern as the card hotspots: the button
          itself never moves or resizes, only this overlay appears while
          held. */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          clipPath: DEPLOY_CLIP,
          background: "rgba(255,255,255,0.22)",
          boxShadow: "inset 0 0 18px rgba(255,255,255,0.4)",
          opacity: pressed ? 1 : 0,
          transition: "opacity 100ms ease-out",
        }}
      />
      <span
        style={{
          position: "relative",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(16px, 2.4vw, 26px)",
          letterSpacing: "0.12em",
          color: "#fff8f0",
          textShadow: "0 0 10px rgba(255,140,60,0.9), 0 1px 2px rgba(0,0,0,0.5)",
        }}
      >
        DEPLOY
      </span>
    </button>
  );
}

const CHAR_SLOTS_PER_PAGE = 10;
const CHAR_PAGE_COUNT = 5;
const CHAR_SLOT_CORNERS = ["tl", "tr", "bl", "br"] as const;

// Idle state shows four separate corner brackets (a gap along each edge,
// no full outline) — reference art only draws a continuous glowing border
// once a slot is hovered or selected.
function CharacterSlot({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`char-slot${selected ? " selected" : ""}`}
      onClick={onClick}
      style={{ position: "relative", background: "rgba(10,22,38,0.55)", border: "none", cursor: "pointer", padding: 0 }}
    >
      <span className="char-slot-border" aria-hidden="true" style={{ position: "absolute", inset: 0, border: "1.5px solid transparent", pointerEvents: "none" }} />
      {CHAR_SLOT_CORNERS.map((corner) => (
        <span key={corner} aria-hidden="true" className={`char-slot-corner char-slot-corner-${corner}`} />
      ))}
    </button>
  );
}

function CharacterSelectionPanel({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div
      role="dialog"
      aria-label="CHARACTER SELECTION"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(160deg, rgba(7,12,22,0.97) 0%, rgba(3,6,13,0.98) 100%)",
        fontFamily: "'Barlow', sans-serif",
        color: "#dce8f5",
      }}
    >
      <style>{`
        .char-slot-corner {
          position: absolute;
          width: 24%;
          height: 18%;
          border-color: #8fd0ec;
          opacity: 0.8;
          pointer-events: none;
          transition: opacity 120ms ease-out;
        }
        .char-slot-corner-tl { top: 0; left: 0; border-top: 2px solid; border-left: 2px solid; }
        .char-slot-corner-tr { top: 0; right: 0; border-top: 2px solid; border-right: 2px solid; }
        .char-slot-corner-bl { bottom: 0; left: 0; border-bottom: 2px solid; border-left: 2px solid; }
        .char-slot-corner-br { bottom: 0; right: 0; border-bottom: 2px solid; border-right: 2px solid; }
        .char-slot-border { transition: border-color 120ms ease-out, box-shadow 120ms ease-out; }
        .char-slot:hover .char-slot-border {
          border-color: #6be2ff;
          box-shadow: 0 0 14px rgba(80,200,255,0.55), inset 0 0 12px rgba(80,200,255,0.2);
        }
        .char-slot:hover .char-slot-corner { opacity: 0; }
        .char-slot.selected .char-slot-border {
          border-color: #ffcf4d;
          box-shadow: 0 0 16px rgba(255,190,60,0.8), inset 0 0 12px rgba(255,190,60,0.3);
        }
        .char-slot.selected .char-slot-corner { opacity: 0; }
        .char-page-btn { transition: opacity 120ms ease-out, color 120ms ease-out; }
        .char-page-btn:hover { color: #6be2ff; }
      `}</style>

      {/* Header */}
      <div style={{ position: "relative", textAlign: "center", padding: "clamp(14px, 2.4vh, 22px) 60px 8px" }}>
        <h2
          style={{
            margin: 0,
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(18px, 2.6vw, 30px)",
            letterSpacing: "0.2em",
            textShadow: "0 0 16px rgba(120,200,255,0.65)",
          }}
        >
          CHARACTER SELECTION
        </h2>
        <div
          style={{
            margin: "8px auto 0",
            width: "clamp(80px, 8vw, 130px)",
            height: 2,
            background: "linear-gradient(90deg, transparent, #6be2ff, transparent)",
          }}
        />
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1px solid rgba(110,226,255,0.5)",
            background: "rgba(255,255,255,0.05)",
            color: "#dce8f5",
            fontSize: 18,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      {/* Body: card grid + preview stage */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, padding: "0 clamp(12px, 2.4vw, 28px)", gap: "clamp(10px, 1.8vw, 20px)" }}>
        <div style={{ flex: "1.4 1 0%", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gridTemplateRows: "repeat(2, 1fr)",
              gap: "clamp(6px, 1vw, 12px)",
              minHeight: 0,
            }}
          >
            {Array.from({ length: CHAR_SLOTS_PER_PAGE }).map((_, i) => (
              <CharacterSlot
                key={i}
                label={`Character slot ${page * CHAR_SLOTS_PER_PAGE + i + 1}`}
                selected={selected === i}
                onClick={() => setSelected(i)}
              />
            ))}
          </div>

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "clamp(8px, 1.6vh, 14px) 0" }}>
            <button
              className="char-page-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous page"
              disabled={page === 0}
              style={{
                background: "transparent",
                border: "none",
                color: page === 0 ? "rgba(150,180,210,0.3)" : "#a8c4dc",
                fontSize: 20,
                cursor: page === 0 ? "default" : "pointer",
              }}
            >
              ‹‹
            </button>
            <div style={{ display: "flex", gap: 7 }}>
              {Array.from({ length: CHAR_PAGE_COUNT }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: i === page ? "#6be2ff" : "rgba(150,180,210,0.35)",
                    boxShadow: i === page ? "0 0 6px rgba(110,226,255,0.9)" : "none",
                  }}
                />
              ))}
            </div>
            <button
              className="char-page-btn"
              onClick={() => setPage((p) => Math.min(CHAR_PAGE_COUNT - 1, p + 1))}
              aria-label="Next page"
              disabled={page === CHAR_PAGE_COUNT - 1}
              style={{
                background: "transparent",
                border: "none",
                color: page === CHAR_PAGE_COUNT - 1 ? "rgba(150,180,210,0.3)" : "#a8c4dc",
                fontSize: 20,
                cursor: page === CHAR_PAGE_COUNT - 1 ? "default" : "pointer",
              }}
            >
              ››
            </button>
          </div>
        </div>

        {/* Preview stage */}
        <div
          style={{
            flex: "1 1 0%",
            position: "relative",
            borderRadius: 8,
            overflow: "hidden",
            background: "radial-gradient(ellipse at 50% 78%, rgba(40,110,200,0.35) 0%, rgba(5,10,25,0.9) 68%)",
          }}
        >
          <div style={{ position: "absolute", left: "50%", bottom: "14%", transform: "translateX(-50%)", width: "76%", aspectRatio: "3 / 1" }}>
            {[100, 76, 52, 30].map((size) => (
              <div
                key={size}
                style={{
                  position: "absolute",
                  left: "50%",
                  bottom: 0,
                  transform: "translateX(-50%)",
                  width: `${size}%`,
                  aspectRatio: "3 / 1",
                  borderRadius: "50%",
                  border: "2px solid rgba(120,210,255,0.55)",
                  boxShadow: "0 0 20px rgba(90,190,255,0.45)",
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "6%",
                transform: "translateX(-50%)",
                width: "18%",
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(190,235,255,0.95), rgba(90,190,255,0) 72%)",
                filter: "blur(2px)",
              }}
            />
          </div>
          <span aria-hidden="true" style={{ position: "absolute", right: "8%", bottom: "10%", color: "rgba(180,220,255,0.6)", fontSize: "clamp(16px, 2vw, 22px)" }}>
            ✦
          </span>

          {/* Decorative HUD readout along the stage's right edge. */}
          <div aria-hidden="true" style={{ position: "absolute", top: "6%", bottom: "6%", right: "4%", width: "1px", background: "rgba(120,190,230,0.35)" }} />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "42%",
              right: "5%",
              width: "34%",
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            {[100, 62, 80, 46].map((w, i) => (
              <div key={i} style={{ width: `${w}%`, height: 2, background: "rgba(140,200,235,0.35)" }} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
          padding: "clamp(10px, 1.8vh, 16px) clamp(12px, 2.4vw, 28px) clamp(14px, 2.4vh, 20px)",
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 28px",
              background: "rgba(120,140,160,0.28)",
              border: "1px solid rgba(180,200,220,0.4)",
              borderRadius: 4,
              color: "#eef4fa",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              letterSpacing: "0.1em",
              fontSize: "clamp(13px, 1.6vw, 16px)",
              cursor: "pointer",
            }}
          >
            CONFIRM
          </button>
          <button
            onClick={() => setSelected(Math.floor(Math.random() * CHAR_SLOTS_PER_PAGE))}
            style={{
              padding: "10px 28px",
              background: "rgba(90,100,115,0.28)",
              border: "1px solid rgba(180,200,220,0.4)",
              borderRadius: 4,
              color: "#eef4fa",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              letterSpacing: "0.1em",
              fontSize: "clamp(13px, 1.6vw, 16px)",
              cursor: "pointer",
            }}
          >
            RANDOM
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(12px, 1.8vw, 20px)" }}>
          <button
            style={{
              padding: "10px 24px",
              background: "rgba(70,130,190,0.35)",
              border: "1px solid rgba(140,200,255,0.55)",
              borderRadius: 4,
              color: "#eef4fa",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              letterSpacing: "0.1em",
              fontSize: "clamp(13px, 1.6vw, 16px)",
              cursor: "pointer",
            }}
          >
            SKINS
          </button>
        </div>
      </div>
    </div>
  );
}

function ComingSoonPanel({
  title,
  icon,
  subtitle,
  message,
  onClose,
}: {
  title: string;
  icon: string;
  subtitle: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={title}
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
            {title}
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
            {icon}
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
            {subtitle}
          </div>
          <div style={{ fontSize: 14, color: "#8a80a8", textAlign: "center", maxWidth: 340 }}>
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Lobby({ visible }: { visible: boolean }) {
  const [characterOpen, setCharacterOpen] = useState(false);
  const [characterPressed, setCharacterPressed] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPressed, setMapPressed] = useState(false);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [missionsPressed, setMissionsPressed] = useState(false);
  const [nexusOpen, setNexusOpen] = useState(false);
  const [nexusPressed, setNexusPressed] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [deployPressed, setDeployPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [charRect, setCharRect] = useState<CardRect>(null);
  const [mapRect, setMapRect] = useState<CardRect>(null);
  const [missionsRect, setMissionsRect] = useState<CardRect>(null);
  const [nexusRect, setNexusRect] = useState<CardRect>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setCharRect(computeCardRect(CHAR_BOX, el.clientWidth, el.clientHeight));
      setMapRect(computeCardRect(MAP_BOX, el.clientWidth, el.clientHeight));
      setMissionsRect(computeCardRect(MISSIONS_BOX, el.clientWidth, el.clientHeight));
      setNexusRect(computeCardRect(NEXUS_BOX, el.clientWidth, el.clientHeight));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
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

      <CardHotspot
        label="Character"
        rect={charRect}
        pressed={characterPressed}
        onPress={() => setCharacterPressed(true)}
        onRelease={() => setCharacterPressed(false)}
        onClick={() => setCharacterOpen(true)}
      />
      <CardHotspot
        label="Map Selection"
        rect={mapRect}
        pressed={mapPressed}
        onPress={() => setMapPressed(true)}
        onRelease={() => setMapPressed(false)}
        onClick={() => setMapOpen(true)}
      />
      <CardHotspot
        label="Missions"
        rect={missionsRect}
        pressed={missionsPressed}
        onPress={() => setMissionsPressed(true)}
        onRelease={() => setMissionsPressed(false)}
        onClick={() => setMissionsOpen(true)}
      />
      <CardHotspot
        label="Nexus Mode"
        rect={nexusRect}
        pressed={nexusPressed}
        onPress={() => setNexusPressed(true)}
        onRelease={() => setNexusPressed(false)}
        onClick={() => setNexusOpen(true)}
      />

      <DeployButton
        pressed={deployPressed}
        onPress={() => setDeployPressed(true)}
        onRelease={() => setDeployPressed(false)}
        onClick={() => setDeployOpen(true)}
      />

      {characterOpen && <CharacterSelectionPanel onClose={() => setCharacterOpen(false)} />}
      {mapOpen && (
        <ComingSoonPanel
          title="MAP SELECTION"
          icon="🗺️"
          subtitle="Map selection coming soon"
          message="Pick your drop zone here once the map roster is live."
          onClose={() => setMapOpen(false)}
        />
      )}
      {missionsOpen && (
        <ComingSoonPanel
          title="MISSIONS"
          icon="🎯"
          subtitle="Missions coming soon"
          message="Your squad's mission list will be here once missions go live."
          onClose={() => setMissionsOpen(false)}
        />
      )}
      {nexusOpen && (
        <ComingSoonPanel
          title="NEXUS MODE"
          icon="🌀"
          subtitle="Nexus Mode coming soon"
          message="This game mode will be selectable here once Nexus Mode goes live."
          onClose={() => setNexusOpen(false)}
        />
      )}
      {deployOpen && (
        <ComingSoonPanel
          title="DEPLOY"
          icon="🚀"
          subtitle="Matchmaking coming soon"
          message="Deploying into a match will be live here once matchmaking is ready."
          onClose={() => setDeployOpen(false)}
        />
      )}
    </div>
  );
}
