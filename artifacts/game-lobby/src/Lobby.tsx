import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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

// Fixed (not randomized) positions/timings for the preview stage's falling
// light particles — randomizing on every render would make them jump
// around each time the panel re-renders (e.g. on page/selection change).
const STAGE_PARTICLES = [
  { left: 22, delay: 0, duration: 3.2 },
  { left: 31, delay: 0.6, duration: 2.8 },
  { left: 40, delay: 1.1, duration: 3.6 },
  { left: 48, delay: 0.3, duration: 3.0 },
  { left: 55, delay: 1.6, duration: 2.6 },
  { left: 63, delay: 0.8, duration: 3.4 },
  { left: 70, delay: 1.9, duration: 2.9 },
  { left: 78, delay: 0.2, duration: 3.3 },
  { left: 35, delay: 2.2, duration: 3.1 },
  { left: 60, delay: 2.6, duration: 2.7 },
];

// Maps a global slot index (across all pages) to its character portrait.
// Only slot 1 has real art so far — everything else stays an empty locked
// placeholder until the rest of the roster is ready.
const CHAR_SLOT_IMAGES: Record<number, string> = {
  0: "/characters/char-1.jpg",
};

// Real 3D model (glTF binary, baked idle animation) shown on the preview
// stage once its slot is selected. Only slot 1 has one so far.
const CHAR_SLOT_MODELS: Record<number, string> = {
  0: "/characters/char-1.glb",
};

// Tick marks around the platform's outer ring — computed once (not
// per-render) so the flat disc reads as a single ground plane viewed in
// perspective, rather than several rings stacked on top of each other.
const STAGE_TICKS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  return { x: 50 + 47 * Math.cos(angle), y: 50 + 47 * Math.sin(angle) };
});

// Idle state shows four separate corner brackets (a gap along each edge,
// no full outline) — reference art only draws a continuous glowing border
// once a slot is hovered or selected.
function CharacterSlot({
  label,
  image,
  selected,
  onClick,
}: {
  label: string;
  image?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`char-slot${selected ? " selected" : ""}`}
      onClick={onClick}
      style={{
        position: "relative",
        background: image ? `url(${image}) center / cover no-repeat, rgba(10,22,38,0.55)` : "rgba(10,22,38,0.55)",
        border: "none",
        cursor: "pointer",
        padding: 0,
        overflow: "hidden",
      }}
    >
      <span className="char-slot-border" aria-hidden="true" style={{ position: "absolute", inset: 0, border: "1.5px solid transparent", pointerEvents: "none" }} />
      {CHAR_SLOT_CORNERS.map((corner) => (
        <span key={corner} aria-hidden="true" className={`char-slot-corner char-slot-corner-${corner}`} />
      ))}
    </button>
  );
}

// Renders a glTF character model with its baked idle animation looping,
// standing on the preview stage. Plain three.js (no react-three-fiber) —
// this is the only place in the app that needs a 3D scene, so pulling in
// a whole renderer abstraction wasn't worth it.
function CharacterViewer3D({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 1.35, 3.4);
    camera.lookAt(0, 0.95, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x0a0e18, 1.2));
    const key = new THREE.DirectionalLight(0xbfe0ff, 1.6);
    key.position.set(2, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x6bd8ff, 1.1);
    rim.position.set(-2.5, 2.5, -2.5);
    scene.add(rim);

    let mixer: THREE.AnimationMixer | null = null;
    const clock = new THREE.Clock();

    new GLTFLoader().load(
      src,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;

        // Center horizontally, sit exactly on the platform, and scale to a
        // consistent on-screen height regardless of the source model's units.
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = 1.7 / (size.y || 1);
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
        scene.add(model);

        if (gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(gltf.animations[0]).play();
        }
      },
      undefined,
      (err) => console.error("Failed to load character model", src, err),
    );

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      mixer?.update(clock.getDelta());
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [src]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}

function CharacterSelectionPanel({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const selectedGlobalIndex = selected === null ? null : page * CHAR_SLOTS_PER_PAGE + selected;

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
                image={CHAR_SLOT_IMAGES[page * CHAR_SLOTS_PER_PAGE + i]}
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
            background:
              "radial-gradient(ellipse at 50% 88%, rgba(60,150,240,0.45) 0%, rgba(20,45,90,0.55) 35%, rgba(8,14,28,0.95) 62%, rgba(2,4,10,0.98) 88%)",
          }}
        >
          <style>{`
            @keyframes stage-core-pulse {
              0%, 100% { opacity: 0.85; transform: translateX(-50%) scale(1); }
              50% { opacity: 1; transform: translateX(-50%) scale(1.08); }
            }
            @keyframes stage-particle-fall {
              0% { transform: translateY(-10px); opacity: 0; }
              12% { opacity: 1; }
              80% { opacity: 0.8; }
              100% { transform: translateY(240px); opacity: 0; }
            }
            @keyframes stage-ticks-spin {
              from { transform: translateX(-50%) rotate(0deg); }
              to { transform: translateX(-50%) rotate(360deg); }
            }
          `}</style>

          {/* Falling light particles drifting down toward the platform. */}
          {STAGE_PARTICLES.map((p, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "8%",
                left: `${p.left}%`,
                width: 2,
                height: 16,
                borderRadius: 2,
                background: "linear-gradient(180deg, rgba(200,235,255,0) 0%, rgba(200,235,255,0.9) 60%, rgba(200,235,255,0) 100%)",
                animation: `stage-particle-fall ${p.duration}s linear ${p.delay}s infinite`,
              }}
            />
          ))}

          {/* Base concentric platform — a single flat ground-plane disc
              (all rings share the same base) rather than rings stacked
              above one another. A slowly spinning tick-mark ring sells the
              "3D turntable" read without needing any vertical stacking. */}
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
                  border: "2px solid rgba(130,215,255,0.6)",
                  boxShadow: "0 0 22px rgba(100,200,255,0.5)",
                }}
              />
            ))}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                bottom: 0,
                width: "100%",
                aspectRatio: "3 / 1",
                animation: "stage-ticks-spin 14s linear infinite",
              }}
            >
              {STAGE_TICKS.map((t, i) => (
                <span
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${t.x}%`,
                    top: `${t.y}%`,
                    width: 3,
                    height: 3,
                    marginLeft: -1.5,
                    marginTop: -1.5,
                    borderRadius: "50%",
                    background: "rgba(180,230,255,0.8)",
                    boxShadow: "0 0 4px rgba(140,215,255,0.9)",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "6%",
                width: "18%",
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(210,240,255,0.95), rgba(100,200,255,0) 72%)",
                filter: "blur(2px)",
                transform: "translateX(-50%)",
                animation: "stage-core-pulse 2.6s ease-in-out infinite",
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

          {selectedGlobalIndex !== null && CHAR_SLOT_MODELS[selectedGlobalIndex] && (
            <CharacterViewer3D key={selectedGlobalIndex} src={CHAR_SLOT_MODELS[selectedGlobalIndex]} />
          )}
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

const MAP_GRID_SIZE = 100;
const MAP_SECTOR_COUNT = 10; // 10x10 lettered/numbered sectors, each 10x10 cells
const MAP_SECTOR_LETTERS = "ABCDEFGHIJ".split("");

// Deterministic 2D value noise (hash-based, no Math.random) so the map
// renders identically every time instead of reshuffling on each mount.
function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function valueNoise(x: number, y: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const sx = x - x0;
  const sy = y - y0;
  const n00 = hash2(x0, y0);
  const n10 = hash2(x0 + 1, y0);
  const n01 = hash2(x0, y0 + 1);
  const n11 = hash2(x0 + 1, y0 + 1);
  const ix0 = n00 + (n10 - n00) * sx;
  const ix1 = n01 + (n11 - n01) * sx;
  return ix0 + (ix1 - ix0) * sy;
}

// Terrain colors, low → high blended noise value: deep water, shallow
// water, plains, forest, desert, mountain rock.
const TERRAIN_STOPS: Array<[number, [number, number, number]]> = [
  [0.0, [16, 42, 74]],
  [0.32, [26, 64, 104]],
  [0.42, [58, 96, 60]],
  [0.58, [40, 74, 44]],
  [0.72, [30, 58, 36]],
  [0.83, [112, 100, 66]],
  [1.01, [92, 92, 96]],
];

function terrainColor(v: number): [number, number, number] {
  for (let i = 1; i < TERRAIN_STOPS.length; i++) {
    const [t1, c1] = TERRAIN_STOPS[i];
    if (v <= t1) {
      const [t0, c0] = TERRAIN_STOPS[i - 1];
      const f = t1 === t0 ? 0 : (v - t0) / (t1 - t0);
      return [0, 1, 2].map((k) => Math.round(c0[k] + (c1[k] - c0[k]) * f)) as [number, number, number];
    }
  }
  return TERRAIN_STOPS[TERRAIN_STOPS.length - 1][1];
}

// Procedural green grass texture for the arena floor — layered value noise
// blotches (dark-to-light green patches) plus fine per-pixel speckle for a
// blade-of-grass feel, tiled across the ground plane.
function createGrassTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const patch = valueNoise(x * 0.06, y * 0.06) * 0.7 + valueNoise(x * 0.18, y * 0.18) * 0.3;
      const speckle = hash2(x * 0.9, y * 0.9) * 0.12;
      const t = clamp(patch + speckle - 0.06, 0, 1);
      const r = Math.round(28 + t * 44);
      const g = Math.round(72 + t * 74);
      const b = Math.round(36 + t * 40);
      const i = (y * size + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

// A procedurally-shaded 100x100 grid minimap, drawn on a single canvas
// (10,000 individual DOM cells would be far too slow) at native 1:1
// pixel-per-cell resolution, then scaled up with crisp pixelated edges so
// the grid itself stays visible instead of blurring into a smooth blob.
function MiniMapGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = ctx.createImageData(MAP_GRID_SIZE, MAP_GRID_SIZE);
    for (let y = 0; y < MAP_GRID_SIZE; y++) {
      for (let x = 0; x < MAP_GRID_SIZE; x++) {
        const n1 = valueNoise(x / 14, y / 14);
        const n2 = valueNoise(x / 5 + 40, y / 5 + 40);
        const v = n1 * 0.75 + n2 * 0.25;
        const [r, g, b] = terrainColor(v);
        const idx = (y * MAP_GRID_SIZE + x) * 4;
        img.data[idx] = r;
        img.data[idx + 1] = g;
        img.data[idx + 2] = b;
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={MAP_GRID_SIZE}
      height={MAP_GRID_SIZE}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
}

function MapSelectionPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-label="MAP SELECTION"
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
          MAP SELECTION
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

      {/* 100x100 grid map, framed with lettered/numbered sector labels. */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0, padding: "0 clamp(16px, 3vw, 32px) clamp(12px, 2vh, 20px)" }}>
        <div style={{ position: "relative", height: "100%", aspectRatio: "1 / 1", maxWidth: "100%" }}>
          {/* Column letters */}
          <div style={{ position: "absolute", left: 0, right: 0, top: "-22px", display: "flex" }}>
            {MAP_SECTOR_LETTERS.map((l) => (
              <div key={l} style={{ flex: 1, textAlign: "center", fontSize: 12, letterSpacing: "0.1em", color: "rgba(150,200,230,0.75)" }}>
                {l}
              </div>
            ))}
          </div>
          {/* Row numbers */}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "-26px", display: "flex", flexDirection: "column" }}>
            {Array.from({ length: MAP_SECTOR_COUNT }, (_, i) => i + 1).map((n) => (
              <div key={n} style={{ flex: 1, display: "flex", alignItems: "center", fontSize: 12, color: "rgba(150,200,230,0.75)" }}>
                {n}
              </div>
            ))}
          </div>

          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              border: "1.5px solid rgba(110,226,255,0.6)",
              boxShadow: "0 0 24px rgba(90,190,255,0.35), inset 0 0 30px rgba(0,0,0,0.4)",
              overflow: "hidden",
            }}
          >
            <MiniMapGrid />

            {/* Sector grid lines, every 10x10 cells. */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              {Array.from({ length: MAP_SECTOR_COUNT + 1 }, (_, i) => i * 10).map((p) => (
                <g key={p}>
                  <line x1={p} y1={0} x2={p} y2={100} stroke="rgba(120,200,255,0.35)" strokeWidth={0.3} />
                  <line x1={0} y1={p} x2={100} y2={p} stroke="rgba(120,200,255,0.35)" strokeWidth={0.3} />
                </g>
              ))}
            </svg>

            {/* Decorative shrinking safe-zone ring. */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "28%",
                top: "34%",
                width: "40%",
                height: "40%",
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.85)",
                boxShadow: "0 0 0 1000px rgba(0,0,0,0.35), 0 0 16px rgba(255,255,255,0.5)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "center", padding: "clamp(10px, 1.8vh, 16px) 0 clamp(16px, 2.6vh, 22px)" }}>
        <button
          onClick={onClose}
          style={{
            padding: "10px 40px",
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
      </div>
    </div>
  );
}

const ARENA_HALF = 5; // 10x10 arena, centered on the origin
// The player's target ground speed is a continuous function of how far the
// joystick is pushed (see PLAYER_MAX_SPEED below) rather than a fixed
// constant — full tilt sustained past SPRINT_ENGAGE_MAG additionally ramps
// in a sprint bonus. BOT_SPEED stays a plain constant; the bot's chase
// logic isn't part of this pass.
const PLAYER_MAX_SPEED = 3.4;
const PLAYER_SPRINT_BONUS = 0.4; // extra fraction of top speed once sprint is fully engaged
const SPRINT_ENGAGE_MAG = 0.92; // joystick magnitude that starts building sprint
const SPRINT_BLEND_RATE = 2.4; // per-second ease rate in/out of sprint
const PLAYER_ACCEL_RATE = 9; // per-second damping rate speeding up
const PLAYER_DECEL_RATE = 15; // per-second damping rate slowing down (snappier stop than start)
const PLAYER_TURN_RATE = 11; // per-second damping rate turning to face the move direction
const BOT_SPEED = 1.9;
const ATTACK_RANGE = 1.3;
const BODY_SEPARATION = 0.85; // minimum center-to-center distance the fighters can close to
const WALL_HEIGHT = 2.2;
const WALL_LENGTH = 3.6;
const WALL_THICKNESS = 0.28;
const HOUSE_SIZE = 2.4;
const HOUSE_WALL_HEIGHT = 1.8;
const HOUSE_ROOF_HEIGHT = 1.15;
const HOUSE_POS = { x: -3.1, z: 1.3 };
const FIGHTER_PAD = 0.35; // padded out by the fighters' body radius

interface Obstacle {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
}

const OBSTACLES: Obstacle[] = [
  { x: 0, z: 0, halfX: WALL_LENGTH / 2, halfZ: WALL_THICKNESS / 2 },
  { x: HOUSE_POS.x, z: HOUSE_POS.z, halfX: HOUSE_SIZE / 2, halfZ: HOUSE_SIZE / 2 },
];

// Pushes a fighter's x/z position out of any obstacle's footprint, kicking
// it out along whichever axis has the least overlap.
function resolveObstacleCollisions(pos: { x: number; z: number }) {
  for (const ob of OBSTACLES) {
    const halfX = ob.halfX + FIGHTER_PAD;
    const halfZ = ob.halfZ + FIGHTER_PAD;
    const dx = pos.x - ob.x;
    const dz = pos.z - ob.z;
    if (Math.abs(dx) < halfX && Math.abs(dz) < halfZ) {
      const penX = halfX - Math.abs(dx);
      const penZ = halfZ - Math.abs(dz);
      if (penX < penZ) {
        pos.x = ob.x + halfX * (dx < 0 ? -1 : 1);
      } else {
        pos.z = ob.z + halfZ * (dz < 0 ? -1 : 1);
      }
    }
  }
}

// Vector from the nearest point on an obstacle's (padded) rectangle to the
// given x/z position — used to steer bots around elongated obstacles by
// actual surface distance instead of a circle around the center, which
// fits a long thin wall poorly.
function awayFromObstacle(x: number, z: number, ob: Obstacle, pad: number): { x: number; z: number; dist: number } {
  const localX = clamp(x - ob.x, -ob.halfX - pad, ob.halfX + pad);
  const localZ = clamp(z - ob.z, -ob.halfZ - pad, ob.halfZ + pad);
  const awayX = x - (ob.x + localX);
  const awayZ = z - (ob.z + localZ);
  return { x: awayX, z: awayZ, dist: Math.hypot(awayX, awayZ) };
}
const PLAYER_DAMAGE = 14;
const BOT_DAMAGE = 10;
const PLAYER_ATTACK_COOLDOWN = 0.55;
const BOT_ATTACK_COOLDOWN = 1.3;
const JUMP_VELOCITY = 4.6;
const GRAVITY = 13;
const LOOK_SENSITIVITY_BASE = 0.009;
const LOOK_SENSITIVITY_MIN = 0.4;
const LOOK_SENSITIVITY_MAX = 2.5;
const LOOK_SENSITIVITY_STORAGE_KEY = "10sa-look-sensitivity";
const PUNCH_DURATION = 0.35;
const PUNCH_SWING_ANGLE = 1.4;
const PUNCH_ELBOW_ANGLE = 0.9;
const BOT2_TINT = 0xffb703;
const BOT2_SPAWN = { x: 3.4, z: -3.2 };
const SWORD_DAMAGE = 26;
const SWORD_RANGE = 2.0;

// Swings a fighter's right arm forward and back (bind-pose-relative, layered
// on top of whatever the idle clip set that frame) — there's no punch clip
// baked into the rig, so this drives the arm bones directly.
function applyPunchPose(rig: FighterRig, t: number) {
  const swing = Math.sin(clamp(t / PUNCH_DURATION, 0, 1) * Math.PI);
  if (rig.rightArm) rig.rightArm.rotation.x -= swing * PUNCH_SWING_ANGLE;
  if (rig.rightForeArm) rig.rightForeArm.rotation.x -= swing * PUNCH_ELBOW_ANGLE;
}

const RUN_PHASE_RATE = 3.4; // phase radians advanced per unit of world speed, so stride frequency tracks actual speed instead of a fixed rate (which is what causes visible foot sliding)
const RUN_HIP_SWING = 0.55;
const RUN_KNEE_BEND = 1.0;
// A compact, tucked-in tactical jog (arms held close, not a wide athletic
// sprint swing) reads more like a combat character than a track sprinter —
// arm swing is intentionally modest, and the elbows stay bent close to the
// body throughout rather than snapping straight between strides.
const RUN_ARM_SWING = 0.3;
const RUN_ELBOW_BASE_BEND = 1.15;
const RUN_ELBOW_SWING_BEND = 0.18;
const RUN_SPINE_LEAN = 0.24; // base forward hunch while moving, not just at a full sprint
const SPRINT_SPINE_LEAN = 0.1; // extra lean layered on top once sprint is engaged

const _swingAxisWorld = new THREE.Vector3();
const _swingAxisLocal = new THREE.Vector3();
const _swingParentQuat = new THREE.Quaternion();

// Rotates a limb bone by `angle` around the character's world-space
// left/right axis (derived from the fighter's current facing), converted
// into whatever local space the bone's parent happens to be in. Plain
// per-axis Euler rotation (rotation.x or rotation.z) assumes the bone's
// own local axis lines up with the sagittal (forward/back) plane, and on
// this rig it doesn't quite — the leftover sideways component is small
// enough to miss in a single-bone displacement probe, but it compounds
// once hip and knee rotate together every frame, and the visible result
// is legs that swing side to side instead of front to back. Rotating
// around a true world axis sidesteps the question of the bone's own
// orientation entirely.
function swingLimb(bone: THREE.Object3D | null, facingYaw: number, angle: number) {
  if (!bone || !bone.parent || angle === 0) return;
  _swingAxisWorld.set(Math.cos(facingYaw), 0, -Math.sin(facingYaw));
  bone.parent.getWorldQuaternion(_swingParentQuat).invert();
  _swingAxisLocal.copy(_swingAxisWorld).applyQuaternion(_swingParentQuat).normalize();
  bone.rotateOnAxis(_swingAxisLocal, angle);
}

// Drives a walking/running limb cycle by hand — without this the limbs
// just keep playing the idle clip's subtle sway while the root glides
// across the ground, which reads as skating rather than running.
// `intensity` is the caller's current speed as a 0..1 fraction of top
// speed — every swing/bend term scales off it so idle, walk, jog and run
// are one continuous blend instead of a hard on/off cut, and it's what
// keeps a stopped character from standing there with bent running arms.
// `sprintBlend` layers in extra forward lean once sprint has eased in.
function applyRunCycle(rig: FighterRig, phase: number, intensity: number, sprintBlend = 0) {
  rig.root.updateMatrixWorld(true);
  const facingYaw = rig.root.rotation.y;
  const swing = Math.sin(phase) * intensity;
  swingLimb(rig.rightUpLeg, facingYaw, -swing * RUN_HIP_SWING);
  swingLimb(rig.leftUpLeg, facingYaw, swing * RUN_HIP_SWING);
  swingLimb(rig.rightArm, facingYaw, swing * RUN_ARM_SWING);
  swingLimb(rig.leftArm, facingYaw, -swing * RUN_ARM_SWING);
  const rightKnee = Math.max(0, swing);
  const leftKnee = Math.max(0, -swing);
  swingLimb(rig.rightLeg, facingYaw, -rightKnee * RUN_KNEE_BEND);
  swingLimb(rig.leftLeg, facingYaw, -leftKnee * RUN_KNEE_BEND);
  swingLimb(rig.rightForeArm, facingYaw, -(intensity * RUN_ELBOW_BASE_BEND + rightKnee * RUN_ELBOW_SWING_BEND));
  swingLimb(rig.leftForeArm, facingYaw, -(intensity * RUN_ELBOW_BASE_BEND + leftKnee * RUN_ELBOW_SWING_BEND));
  if (rig.spine) rig.spine.rotation.x += intensity * RUN_SPINE_LEAN + sprintBlend * SPRINT_SPINE_LEAN;
}

const DEATH_FALL_DURATION = 0.6;
const DEATH_FADE_DELAY = 0.3;
const DEATH_FADE_DURATION = 1.0;
const DEATH_TOTAL_DURATION = DEATH_FALL_DURATION + DEATH_FADE_DURATION;

// Topples a defeated fighter onto its back and fades it out — there's no
// death clip either, so this drives the root rotation and each mesh's
// material opacity directly instead.
function applyDeathPose(rig: FighterRig, t: number) {
  const fallP = clamp(t / DEATH_FALL_DURATION, 0, 1);
  rig.root.rotation.x = -(fallP * fallP * (3 - 2 * fallP)) * (Math.PI / 2); // smoothstep ease-out
  const fadeP = clamp((t - DEATH_FADE_DELAY) / DEATH_FADE_DURATION, 0, 1);
  for (const mat of rig.materials) {
    mat.transparent = true;
    mat.opacity = 1 - fadeP;
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Frame-rate-independent exponential smoothing: eases `current` toward
// `target` at `rate` per second regardless of dt, instead of a per-frame
// lerp factor that speeds up or slows down with the frame rate.
function approach(current: number, target: number, rate: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

// Same, but for an angle: turns the short way around instead of the long
// way when the target crosses the -pi/pi wraparound.
function dampAngle(current: number, target: number, rate: number, dt: number) {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-rate * dt));
}

// Wraps an angle (e.g. a one-frame rotation delta) into (-pi, pi] so a
// turn-rate computed from it doesn't spike when rotation.y crosses the
// wraparound point.
function wrapAngle(a: number) {
  return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
}

interface FighterRig {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  rightArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  rightHand: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
  leftForeArm: THREE.Object3D | null;
  leftUpLeg: THREE.Object3D | null;
  leftLeg: THREE.Object3D | null;
  rightUpLeg: THREE.Object3D | null;
  rightLeg: THREE.Object3D | null;
  spine: THREE.Object3D | null;
  materials: THREE.MeshStandardMaterial[];
}

// A simple procedural sword (no sword asset on hand) — blade, crossguard and
// hilt built from basic primitives, meant to be parented to a fighter's
// RightHand bone so it swings along with the arm automatically.
function createSwordMesh(): THREE.Group {
  const group = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.85, 0.11),
    new THREE.MeshStandardMaterial({ color: 0xdce8f2, metalness: 0.85, roughness: 0.25, emissive: 0x2a6a8a, emissiveIntensity: 0.4 }),
  );
  blade.position.y = 0.55;
  group.add(blade);
  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 0.32),
    new THREE.MeshStandardMaterial({ color: 0x8a7248, metalness: 0.7, roughness: 0.4 }),
  );
  guard.position.y = 0.1;
  group.add(guard);
  const hilt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.7 }),
  );
  hilt.position.y = -0.02;
  group.add(hilt);
  return group;
}

// The rig's hand bones carry a tiny cumulative world scale inherited from the
// skeleton (the source model bakes a large armature scale), so a sword sized
// in normal world units would render nearly invisible if parented directly.
// Counteract that by scaling the sword up by the bone's inverse world scale.
function attachSword(hand: THREE.Object3D) {
  hand.updateWorldMatrix(true, false);
  const worldScale = new THREE.Vector3();
  hand.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), worldScale);
  const sword = createSwordMesh();
  sword.scale.setScalar(1 / (worldScale.x || 1));
  hand.add(sword);
}

// Loads the one character model we have twice — once as the player (its
// natural color) and once as the bot (red-tinted) — since there's no
// separate enemy asset yet.
function loadFighter(
  scene: THREE.Scene,
  tint: THREE.ColorRepresentation,
  onLoaded: (rig: FighterRig) => void,
) {
  new GLTFLoader().load(
    "/characters/char-1.glb",
    (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const scale = 1.6 / (size.y || 1);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

      // The rig only ships one baked "Idle" clip — there's no punch
      // animation — so grab the arm bones here and swing them by hand
      // (see the punch logic in CombatArena's tick loop) instead.
      let rightArm: THREE.Object3D | null = null;
      let rightForeArm: THREE.Object3D | null = null;
      let rightHand: THREE.Object3D | null = null;
      let leftArm: THREE.Object3D | null = null;
      let leftForeArm: THREE.Object3D | null = null;
      let leftUpLeg: THREE.Object3D | null = null;
      let leftLeg: THREE.Object3D | null = null;
      let rightUpLeg: THREE.Object3D | null = null;
      let rightLeg: THREE.Object3D | null = null;
      let spine: THREE.Object3D | null = null;
      const materials: THREE.MeshStandardMaterial[] = [];

      model.traverse((o) => {
        if (o.name === "RightArm") rightArm = o;
        if (o.name === "RightForeArm") rightForeArm = o;
        if (o.name === "RightHand") rightHand = o;
        if (o.name === "LeftArm") leftArm = o;
        if (o.name === "LeftForeArm") leftForeArm = o;
        if (o.name === "LeftUpLeg") leftUpLeg = o;
        if (o.name === "LeftLeg") leftLeg = o;
        if (o.name === "RightUpLeg") rightUpLeg = o;
        if (o.name === "RightLeg") rightLeg = o;
        if (o.name === "Spine01") spine = o;
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const src = mesh.material as THREE.MeshStandardMaterial;
        const mat = src.clone();
        const tintColor = new THREE.Color(tint);
        // This model's texture is baked mostly as an emissive map (full-
        // intensity emissiveFactor), so tinting only the base `color`
        // barely shows — the glow washes it out. Tint emissive too.
        mat.color = src.color.clone().multiply(tintColor);
        if (mat.emissive) mat.emissive = src.emissive.clone().multiply(tintColor);
        mesh.material = mat;
        materials.push(mat);
      });

      const root = new THREE.Group();
      root.add(model);
      scene.add(root);

      let mixer: THREE.AnimationMixer | null = null;
      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
      }
      onLoaded({ root, mixer, rightArm, rightForeArm, rightHand, leftArm, leftForeArm, leftUpLeg, leftLeg, rightUpLeg, rightLeg, spine, materials });
    },
    undefined,
    (err) => console.error("Failed to load fighter model", err),
  );
}

// A minimal single-player vs. bot skirmish on a 10x10 arena: touch
// joystick to move, tap the attack button in range. No networking — the
// "bot" is just a simple chase-and-swing AI running in the same tick loop
// as the player, both driven by the same idle-animation character model
// (there's only one character asset right now) tinted to tell them apart.
function CombatArena({ onExit }: { onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const joystickKnobRef = useRef<HTMLDivElement>(null);
  const joystickVec = useRef({ x: 0, y: 0 });
  const attackRequested = useRef(false);
  const jumpRequested = useRef(false);
  const joystickTouchId = useRef<number | null>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  // Free-look: dragging anywhere on the arena view (outside the joystick/
  // buttons) orbits the camera around the player, independent of movement.
  const cameraYaw = useRef(Math.PI);
  const lookTouchId = useRef<number | null>(null);
  const lookLastX = useRef(0);

  const [playerHp, setPlayerHp] = useState(100);
  const [botHp, setBotHp] = useState(100);
  const [phase, setPhase] = useState<"bot1" | "bot2">("bot1");
  const [result, setResult] = useState<"playing" | "win" | "lose">("playing");
  const [lookSensitivity, setLookSensitivity] = useState(() => {
    const saved = Number(localStorage.getItem(LOOK_SENSITIVITY_STORAGE_KEY));
    return saved >= LOOK_SENSITIVITY_MIN && saved <= LOOK_SENSITIVITY_MAX ? saved : 1;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;

    const scene = new THREE.Scene();
    // Third-person chase camera (Free Fire / PUBG Mobile style): positioned
    // behind and above the player, following their facing direction, rather
    // than a fixed top-down view.
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
    const CAM_DISTANCE = 4.2;
    const CAM_HEIGHT = 2.4;
    const CAM_LOOK_HEIGHT = 1.1;
    const CAM_DAMP_RATE = 7; // per-second follow damping, frame-rate independent
    const CAM_ACCEL_LAG = 0.09; // slows the follow down further while the player's speed is changing quickly
    const CAM_MIN_DAMP_FRAC = 0.4; // floor on how much the accel lag can slow the follow by
    const HEAD_BOB_AMOUNT = 0.045; // vertical camera bob at full running intensity
    const CAM_TILT_RATE = 0.16; // how much camera roll per unit of player turn rate
    const CAM_TILT_MAX = 0.09; // clamp on the roll angle (radians)
    const CAM_TILT_DAMP = 9; // per-second smoothing on the roll itself
    camera.position.set(0, CAM_HEIGHT, CAM_DISTANCE + 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x0a0e18, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 6, 4);
    scene.add(key);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_HALF * 2, ARENA_HALF * 2),
      new THREE.MeshStandardMaterial({ map: createGrassTexture(), roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    scene.add(new THREE.GridHelper(ARENA_HALF * 2, 10, 0x6be2ff, 0x1c4560));

    // A thin cover wall through the middle of the arena.
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(WALL_LENGTH, WALL_HEIGHT, WALL_THICKNESS),
      new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.6, metalness: 0.3, emissive: 0x1c4560, emissiveIntensity: 0.4 }),
    );
    wall.position.set(0, WALL_HEIGHT / 2, 0);
    scene.add(wall);
    const wallEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(wall.geometry),
      new THREE.LineBasicMaterial({ color: 0x6be2ff }),
    );
    wallEdges.position.copy(wall.position);
    scene.add(wallEdges);

    // A small house off to the side — box walls plus a 4-sided pyramid roof.
    const house = new THREE.Group();
    const houseWalls = new THREE.Mesh(
      new THREE.BoxGeometry(HOUSE_SIZE, HOUSE_WALL_HEIGHT, HOUSE_SIZE),
      new THREE.MeshStandardMaterial({ color: 0xc9a876, roughness: 0.85 }),
    );
    houseWalls.position.y = HOUSE_WALL_HEIGHT / 2;
    house.add(houseWalls);
    const houseRoof = new THREE.Mesh(
      new THREE.ConeGeometry((HOUSE_SIZE / 2) * Math.SQRT2 * 1.08, HOUSE_ROOF_HEIGHT, 4),
      new THREE.MeshStandardMaterial({ color: 0x8b4a3a, roughness: 0.7 }),
    );
    houseRoof.rotation.y = Math.PI / 4;
    houseRoof.position.y = HOUSE_WALL_HEIGHT + HOUSE_ROOF_HEIGHT / 2;
    house.add(houseRoof);
    const houseDoor = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 1.15),
      new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.9 }),
    );
    houseDoor.position.set(0, 0.575, HOUSE_SIZE / 2 + 0.01);
    house.add(houseDoor);
    house.position.set(HOUSE_POS.x, 0, HOUSE_POS.z);
    scene.add(house);
    const houseEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(houseWalls.geometry),
      new THREE.LineBasicMaterial({ color: 0x6be2ff }),
    );
    houseEdges.position.copy(houseWalls.position);
    house.add(houseEdges);

    let player: FighterRig | null = null;
    let bot1: FighterRig | null = null;
    let bot2: FighterRig | null = null;

    loadFighter(scene, 0xffffff, (rig) => {
      if (disposed) return;
      rig.root.position.set(0, 0, 3);
      rig.root.rotation.y = Math.PI; // face bot1 at the start
      player = rig;
    });
    loadFighter(scene, 0xff6b5e, (rig) => {
      if (disposed) return;
      rig.root.position.set(0, 0, -3);
      bot1 = rig;
    });
    // Bot 2 stands off to the side, idle, until bot 1 is defeated.
    loadFighter(scene, BOT2_TINT, (rig) => {
      if (disposed) return;
      rig.root.position.set(BOT2_SPAWN.x, 0, BOT2_SPAWN.z);
      rig.root.rotation.y = Math.PI * 0.75;
      bot2 = rig;
    });

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let raf = 0;
    const clock = new THREE.Clock();
    let playerHpLocal = 100;
    let botHpLocal = 100;
    let playerCooldown = 0;
    let botCooldown = 0;
    let playerPunchT = -1;
    let botPunchT = -1;
    let playerVelY = 0;
    let grounded = true;
    // Smoothed horizontal ground velocity — movement eases toward the
    // joystick-derived target instead of snapping to it, which is what
    // gives the accel/decel and the turning its weight.
    let playerVelX = 0;
    let playerVelZ = 0;
    let sprintBlend = 0;
    let playerSpeedNow = 0;
    let prevSpeed = 0;
    let prevPlayerYaw = 0;
    let camRoll = 0;
    let ended = false;
    let phaseLocal: "bot1" | "bot2" = "bot1";
    let playerDamage = PLAYER_DAMAGE;
    let playerAttackRange = ATTACK_RANGE;
    let swordAttached = false;
    let bot1DeathT = -1;
    let bot2DeathT = -1;
    let playerDeathT = -1;
    let pendingResult: "win" | "lose" | null = null;
    let resultRevealT = 0;
    let playerRunPhase = 0;
    let botRunPhase = 0;
    // Which side the bot committed to going around each obstacle on — decided
    // once when avoidance first engages and held until it clears, so the
    // choice can't flip-flop frame to frame when the bot ends up nearly
    // dead-on in line with the obstacle and the player (a near-zero signal
    // that's noisy enough to flip sign every frame otherwise).
    const obstacleAvoidSide = OBSTACLES.map(() => 0);
    const camTargetPos = new THREE.Vector3();
    const camLookAt = new THREE.Vector3();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      player?.mixer?.update(dt);
      bot1?.mixer?.update(dt);
      bot2?.mixer?.update(dt);

      if (bot1 && bot1DeathT >= 0) {
        applyDeathPose(bot1, bot1DeathT);
        bot1DeathT += dt;
      }
      if (bot2 && bot2DeathT >= 0) {
        applyDeathPose(bot2, bot2DeathT);
        bot2DeathT += dt;
      }
      if (player && playerDeathT >= 0) {
        applyDeathPose(player, playerDeathT);
        playerDeathT += dt;
      }
      if (ended && pendingResult) {
        resultRevealT += dt;
        if (resultRevealT > DEATH_TOTAL_DURATION) {
          setResult(pendingResult);
          pendingResult = null;
        }
      }

      if (!ended && player && bot1 && bot2) {
        const activeBot = phaseLocal === "bot1" ? bot1 : bot2;
        const jv = joystickVec.current;
        const joyMag = Math.min(1, Math.hypot(jv.x, jv.y));

        // Sprint eases in once the stick is held past SPRINT_ENGAGE_MAG and
        // eases back out the instant it isn't, rather than snapping a
        // speed multiplier on or off.
        const wantSprint = joyMag > SPRINT_ENGAGE_MAG;
        sprintBlend = approach(sprintBlend, wantSprint ? 1 : 0, SPRINT_BLEND_RATE, dt);

        // Movement is relative to where the camera is currently looking
        // (like Free Fire), not fixed to world axes — dragging to look
        // around with one finger while pushing the joystick with the
        // other should send the player toward whatever direction the
        // camera has been turned to face.
        const camForwardX = -Math.sin(cameraYaw.current);
        const camForwardZ = -Math.cos(cameraYaw.current);
        const camRightX = Math.cos(cameraYaw.current);
        const camRightZ = -Math.sin(cameraYaw.current);
        const rawX = jv.x * camRightX + jv.y * camForwardX;
        const rawZ = jv.x * camRightZ + jv.y * camForwardZ;
        const dirX = joyMag > 0.0001 ? rawX / joyMag : 0;
        const dirZ = joyMag > 0.0001 ? rawZ / joyMag : 0;

        // How far the stick is pushed sets the target speed continuously —
        // a light tap walks, a full push runs, and holding full tilt ramps
        // sprint in on top — so there's no discrete walk/jog/run jump.
        const targetSpeed = joyMag * PLAYER_MAX_SPEED * (1 + PLAYER_SPRINT_BONUS * sprintBlend);
        const targetVelX = dirX * targetSpeed;
        const targetVelZ = dirZ * targetSpeed;
        const curVelLen = Math.hypot(playerVelX, playerVelZ);
        const targetVelLen = Math.hypot(targetVelX, targetVelZ);
        // Speeding up and slowing down ease at different rates (a snappier
        // stop than start) instead of both snapping instantly — that's
        // what gives the movement its weight.
        const accelRate = targetVelLen > curVelLen ? PLAYER_ACCEL_RATE : PLAYER_DECEL_RATE;
        playerVelX = approach(playerVelX, targetVelX, accelRate, dt);
        playerVelZ = approach(playerVelZ, targetVelZ, accelRate, dt);

        player.root.position.x = clamp(player.root.position.x + playerVelX * dt, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
        player.root.position.z = clamp(player.root.position.z + playerVelZ * dt, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
        resolveObstacleCollisions(player.root.position);

        playerSpeedNow = Math.hypot(playerVelX, playerVelZ);
        // Face the direction actually being moved in (not the raw stick
        // input) and ease into it instead of snapping, which keeps the
        // body orientation looking natural through a direction change
        // instead of instantly spinning to face it.
        if (playerSpeedNow > 0.05) {
          const targetYaw = Math.atan2(playerVelX, playerVelZ);
          player.root.rotation.y = dampAngle(player.root.rotation.y, targetYaw, PLAYER_TURN_RATE, dt);
        }

        // Stride frequency is driven by actual speed instead of a fixed
        // rate, so the feet never slide relative to the ground; the swing
        // amplitude blends continuously off that same speed fraction,
        // which is the idle -> walk -> jog -> run blend, and arms/legs
        // pump faster on their own once sprint raises the speed.
        const speedFrac = clamp(playerSpeedNow / PLAYER_MAX_SPEED, 0, 1.15);
        playerRunPhase += dt * playerSpeedNow * RUN_PHASE_RATE;
        applyRunCycle(player, playerRunPhase, speedFrac, sprintBlend);

        if (jumpRequested.current) {
          jumpRequested.current = false;
          if (grounded) {
            playerVelY = JUMP_VELOCITY;
            grounded = false;
          }
        }
        if (!grounded) {
          playerVelY -= GRAVITY * dt;
          player.root.position.y = Math.max(0, player.root.position.y + playerVelY * dt);
          if (player.root.position.y <= 0) {
            player.root.position.y = 0;
            playerVelY = 0;
            grounded = true;
          }
        }

        let dx = player.root.position.x - activeBot.root.position.x;
        let dz = player.root.position.z - activeBot.root.position.z;
        let dist = Math.hypot(dx, dz);

        // Keep the two fighters from walking through each other's bodies —
        // push the player back out to the minimum separation distance.
        if (dist < BODY_SEPARATION) {
          const nx = dist > 0.0001 ? dx / dist : 0;
          const nz = dist > 0.0001 ? dz / dist : 1;
          player.root.position.x = clamp(activeBot.root.position.x + nx * BODY_SEPARATION, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
          player.root.position.z = clamp(activeBot.root.position.z + nz * BODY_SEPARATION, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
          dx = player.root.position.x - activeBot.root.position.x;
          dz = player.root.position.z - activeBot.root.position.z;
          dist = Math.hypot(dx, dz);
        }

        if (dist > ATTACK_RANGE * 0.85) {
          let moveX = dx / dist;
          let moveZ = dz / dist;
          // Steer around each obstacle instead of walking straight into it:
          // the closer the bot's nearest point on the obstacle's surface
          // gets, the more its seek-the-player direction blends into a
          // tangent that curves around it. Measuring from the actual
          // surface (not the obstacle's center) matters for the long thin
          // wall, where a center-based radius would trigger avoidance far
          // too early along its length.
          const AVOID_MARGIN = 1.0;
          OBSTACLES.forEach((ob, obIndex) => {
            const away = awayFromObstacle(activeBot.root.position.x, activeBot.root.position.z, ob, FIGHTER_PAD);
            if (away.dist < AVOID_MARGIN) {
              const toObX = away.dist > 0.0001 ? -away.x / away.dist : 0;
              const toObZ = away.dist > 0.0001 ? -away.z / away.dist : 1;
              const tangentAX = -toObZ;
              const tangentAZ = toObX;
              const tangentBX = toObZ;
              const tangentBZ = -toObX;
              if (obstacleAvoidSide[obIndex] === 0) {
                // Decide which side to go around only once, right as
                // avoidance engages, and hold that choice — recomputing it
                // every frame from the seek direction flip-flops once the
                // bot is nearly dead-on in line with the obstacle and the
                // player, where that signal is too close to zero to be
                // stable, stalling the bot in place instead of sliding it
                // around to clear the obstacle.
                const dotA = tangentAX * moveX + tangentAZ * moveZ;
                const dotB = tangentBX * moveX + tangentBZ * moveZ;
                obstacleAvoidSide[obIndex] = dotA >= dotB ? 1 : -1;
              }
              const tangentX = obstacleAvoidSide[obIndex] === 1 ? tangentAX : tangentBX;
              const tangentZ = obstacleAvoidSide[obIndex] === 1 ? tangentAZ : tangentBZ;
              // Close to the surface, commit fully to the tangent instead of
              // blending in the seek direction — blending lets the pull back
              // toward the player cancel out the sideways push exactly at
              // some equilibrium point, stalling the bot in place against a
              // long flat wall instead of sliding it along to the end.
              const avoidWeight = clamp((1 - away.dist / AVOID_MARGIN) * 1.6, 0, 1);
              moveX = moveX * (1 - avoidWeight) + tangentX * avoidWeight;
              moveZ = moveZ * (1 - avoidWeight) + tangentZ * avoidWeight;
              const moveLen = Math.hypot(moveX, moveZ) || 1;
              moveX /= moveLen;
              moveZ /= moveLen;
            } else {
              obstacleAvoidSide[obIndex] = 0;
            }
          });
          activeBot.root.position.x += moveX * BOT_SPEED * dt;
          activeBot.root.position.z += moveZ * BOT_SPEED * dt;
          resolveObstacleCollisions(activeBot.root.position);
          botRunPhase += dt * BOT_SPEED * RUN_PHASE_RATE;
          applyRunCycle(activeBot, botRunPhase, 1);
        } else {
          botRunPhase = 0;
        }
        activeBot.root.rotation.y = Math.atan2(dx, dz);

        playerCooldown = Math.max(0, playerCooldown - dt);
        botCooldown = Math.max(0, botCooldown - dt);

        if (attackRequested.current) {
          attackRequested.current = false;
          if (playerCooldown <= 0 && dist <= playerAttackRange) {
            botHpLocal = Math.max(0, botHpLocal - playerDamage);
            setBotHp(botHpLocal);
            playerCooldown = PLAYER_ATTACK_COOLDOWN;
            playerPunchT = 0;
          }
        }

        if (dist <= ATTACK_RANGE && botCooldown <= 0) {
          playerHpLocal = Math.max(0, playerHpLocal - BOT_DAMAGE);
          setPlayerHp(playerHpLocal);
          botCooldown = BOT_ATTACK_COOLDOWN;
          botPunchT = 0;
        }

        if (playerPunchT >= 0) {
          applyPunchPose(player, playerPunchT);
          playerPunchT = playerPunchT + dt > PUNCH_DURATION ? -1 : playerPunchT + dt;
        }
        if (botPunchT >= 0) {
          applyPunchPose(activeBot, botPunchT);
          botPunchT = botPunchT + dt > PUNCH_DURATION ? -1 : botPunchT + dt;
        }

        if (botHpLocal <= 0) {
          if (phaseLocal === "bot1") {
            // Bot 1 down — it topples and fades out in the background while
            // bot 2 (full health) steps in, and the player gets a sword
            // (parented to their right hand so it swings with the punch
            // pose automatically).
            phaseLocal = "bot2";
            setPhase("bot2");
            botHpLocal = 100;
            setBotHp(100);
            botCooldown = 0;
            botPunchT = -1;
            bot1DeathT = 0;
            playerDamage = SWORD_DAMAGE;
            playerAttackRange = SWORD_RANGE;
            if (!swordAttached && player.rightHand) {
              attachSword(player.rightHand);
              swordAttached = true;
            }
          } else {
            ended = true;
            bot2DeathT = 0;
            pendingResult = "win";
          }
        } else if (playerHpLocal <= 0) {
          ended = true;
          playerDeathT = 0;
          pendingResult = "lose";
        }
      }

      // Chase camera keeps following/rendering even after the match ends,
      // so the loser's/bot's death animation actually plays out on screen
      // instead of the view freezing the instant HP hits zero.
      if (player) {
        // Chase camera: sits behind the player along cameraYaw and eases
        // toward that spot each frame instead of snapping, so turning
        // feels smooth rather than jittery. Movement is derived from this
        // same angle (see above), so the camera never needs to "catch up"
        // to the player — dragging to free-look simply turns cameraYaw
        // directly, and that's already where movement and the view both
        // point. The follow damping is frame-rate independent (an
        // exponential ease on dt, not a fixed per-frame lerp factor), and
        // it eases a little slower while the player's speed is changing
        // quickly — accelerating off the mark or braking to a stop — which
        // reads as a slight, natural lag instead of a rigid, glued-on rig.
        const facing = cameraYaw.current;
        camTargetPos.set(
          player.root.position.x - Math.sin(facing) * CAM_DISTANCE,
          CAM_HEIGHT + player.root.position.y,
          player.root.position.z - Math.cos(facing) * CAM_DISTANCE,
        );
        const accelMag = Math.abs(playerSpeedNow - prevSpeed) / Math.max(dt, 0.001);
        const dampFrac = clamp(1 - accelMag * CAM_ACCEL_LAG, CAM_MIN_DAMP_FRAC, 1);
        camera.position.lerp(camTargetPos, 1 - Math.exp(-CAM_DAMP_RATE * dampFrac * dt));

        // Subtle head bob synced to the same phase driving the legs (two
        // bob cycles per stride, matching each footfall), scaled by actual
        // speed so it's absent at a standstill and most pronounced at a
        // full sprint. Applied after the follow lerp so it stays crisp
        // instead of being smoothed away by the follow damping.
        const speedFracNow = clamp(playerSpeedNow / PLAYER_MAX_SPEED, 0, 1);
        camera.position.y += Math.cos(playerRunPhase * 2) * HEAD_BOB_AMOUNT * speedFracNow;

        camLookAt.set(player.root.position.x, CAM_LOOK_HEIGHT + player.root.position.y, player.root.position.z);
        camera.lookAt(camLookAt);

        // A small camera roll while turning quickly — banking into the
        // turn — smoothed on top of the raw turn rate so it doesn't
        // jitter frame to frame. Applied after lookAt() since lookAt()
        // sets the camera's orientation outright.
        const turnRate = wrapAngle(player.root.rotation.y - prevPlayerYaw) / Math.max(dt, 0.0001);
        const targetRoll = clamp(-turnRate * CAM_TILT_RATE, -CAM_TILT_MAX, CAM_TILT_MAX);
        camRoll = approach(camRoll, targetRoll, CAM_TILT_DAMP, dt);
        camera.rotateZ(camRoll);

        prevSpeed = playerSpeedNow;
        prevPlayerYaw = player.root.rotation.y;
      }

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  const updateJoystick = (clientX: number, clientY: number) => {
    const base = joystickBaseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > radius) {
      dx = (dx / dist) * radius;
      dy = (dy / dist) * radius;
    }
    joystickVec.current = { x: dx / radius, y: dy / radius };
    const knob = joystickKnobRef.current;
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const resetJoystick = () => {
    joystickVec.current = { x: 0, y: 0 };
    joystickTouchId.current = null;
    const knob = joystickKnobRef.current;
    if (knob) knob.style.transform = "translate(0px, 0px)";
  };

  const handleLookDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    lookTouchId.current = e.pointerId;
    lookLastX.current = e.clientX;
  };
  const handleLookMove = (e: React.PointerEvent) => {
    if (lookTouchId.current !== e.pointerId) return;
    const dx = e.clientX - lookLastX.current;
    lookLastX.current = e.clientX;
    cameraYaw.current -= dx * LOOK_SENSITIVITY_BASE * lookSensitivity;
  };

  const changeSensitivity = (value: number) => {
    const clamped = clamp(value, LOOK_SENSITIVITY_MIN, LOOK_SENSITIVITY_MAX);
    setLookSensitivity(clamped);
    localStorage.setItem(LOOK_SENSITIVITY_STORAGE_KEY, String(clamped));
  };
  const handleLookUp = () => {
    lookTouchId.current = null;
  };

  return (
    <div
      role="dialog"
      aria-label="DEPLOY"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        background: "linear-gradient(160deg, #0a1220 0%, #060a14 100%)",
        overflow: "hidden",
        touchAction: "none",
      }}
    >
      <div
        ref={containerRef}
        onPointerDown={handleLookDown}
        onPointerMove={handleLookMove}
        onPointerUp={handleLookUp}
        onPointerCancel={handleLookUp}
        style={{ position: "absolute", inset: 0, touchAction: "none" }}
      />

      {/* Health bars */}
      <div style={{ position: "absolute", top: 16, left: 16, width: "min(38%, 260px)" }}>
        <div style={{ color: "#dce8f5", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", marginBottom: 4 }}>
          YOU{phase === "bot2" ? " ⚔ SWORD" : ""}
        </div>
        <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${playerHp}%`, background: "linear-gradient(90deg,#4fd8ff,#6be2ff)", transition: "width 150ms ease-out" }} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 16, right: 16, width: "min(38%, 260px)" }}>
        <div style={{ color: "#dce8f5", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", marginBottom: 4, textAlign: "right" }}>
          {phase === "bot1" ? "BOT 1 / 2" : "BOT 2 / 2"}
        </div>
        <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${botHp}%`, marginLeft: `${100 - botHp}%`, background: "linear-gradient(90deg,#ff8a6b,#ff5e4e)", transition: "width 150ms ease-out, margin-left 150ms ease-out" }} />
        </div>
      </div>

      <button
        onClick={onExit}
        aria-label="Exit match"
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          padding: "6px 18px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(200,220,240,0.4)",
          borderRadius: 4,
          color: "#dce8f5",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        EXIT
      </button>

      {/* Look-sensitivity settings */}
      <button
        onClick={() => setSettingsOpen((v) => !v)}
        aria-label="Camera settings"
        style={{
          position: "absolute",
          top: 58,
          right: 16,
          width: 32,
          height: 32,
          borderRadius: "50%",
          background: settingsOpen ? "rgba(107,216,255,0.25)" : "rgba(255,255,255,0.08)",
          border: "1px solid rgba(200,220,240,0.4)",
          color: "#dce8f5",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        ⚙
      </button>
      {settingsOpen && (
        <div
          style={{
            position: "absolute",
            top: 96,
            right: 16,
            width: "min(72vw, 260px)",
            padding: "12px 14px",
            background: "rgba(8,14,24,0.92)",
            border: "1px solid rgba(150,200,230,0.35)",
            borderRadius: 8,
            touchAction: "none",
          }}
        >
          <div
            style={{
              color: "#dce8f5",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.06em",
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>LOOK SENSITIVITY</span>
            <span>{lookSensitivity.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={LOOK_SENSITIVITY_MIN}
            max={LOOK_SENSITIVITY_MAX}
            step={0.1}
            value={lookSensitivity}
            onChange={(e) => changeSensitivity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {/* Virtual joystick */}
      <div
        ref={joystickBaseRef}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          joystickTouchId.current = e.pointerId;
          updateJoystick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (joystickTouchId.current === e.pointerId) updateJoystick(e.clientX, e.clientY);
        }}
        onPointerUp={() => resetJoystick()}
        onPointerCancel={() => resetJoystick()}
        style={{
          position: "absolute",
          left: "6%",
          bottom: "8%",
          width: "clamp(90px, 16vw, 130px)",
          height: "clamp(90px, 16vw, 130px)",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
          border: "1.5px solid rgba(150,200,230,0.4)",
          touchAction: "none",
        }}
      >
        <div
          ref={joystickKnobRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "42%",
            height: "42%",
            marginLeft: "-21%",
            marginTop: "-21%",
            borderRadius: "50%",
            background: "rgba(107,216,255,0.5)",
            border: "1.5px solid rgba(190,235,255,0.85)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Attack button */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          attackRequested.current = true;
        }}
        aria-label="Attack"
        style={{
          position: "absolute",
          right: "7%",
          bottom: "9%",
          width: "clamp(72px, 13vw, 100px)",
          height: "clamp(72px, 13vw, 100px)",
          borderRadius: "50%",
          background: "radial-gradient(circle, #ff8a6b, #d8402c)",
          border: "2px solid rgba(255,220,210,0.85)",
          boxShadow: "0 0 20px rgba(255,90,60,0.6)",
          color: "#fff8f0",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.05em",
          fontSize: "clamp(13px, 2vw, 16px)",
          cursor: "pointer",
        }}
      >
        ATTACK
      </button>

      {/* Jump button */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          jumpRequested.current = true;
        }}
        aria-label="Jump"
        style={{
          position: "absolute",
          right: "calc(7% + clamp(72px, 13vw, 100px) + 14px)",
          bottom: "9%",
          width: "clamp(56px, 10vw, 76px)",
          height: "clamp(56px, 10vw, 76px)",
          borderRadius: "50%",
          background: "radial-gradient(circle, #7fd8ff, #2b8fd8)",
          border: "2px solid rgba(210,240,255,0.85)",
          boxShadow: "0 0 20px rgba(80,180,255,0.55)",
          color: "#f0faff",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.05em",
          fontSize: "clamp(11px, 1.7vw, 14px)",
          cursor: "pointer",
        }}
      >
        JUMP
      </button>

      {result !== "playing" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            background: "rgba(3,6,13,0.75)",
          }}
        >
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px, 6vw, 52px)",
              letterSpacing: "0.15em",
              color: result === "win" ? "#6be2ff" : "#ff6b5e",
              textShadow: result === "win" ? "0 0 24px rgba(107,216,255,0.8)" : "0 0 24px rgba(255,107,94,0.8)",
            }}
          >
            {result === "win" ? "VICTORY" : "DEFEAT"}
          </div>
          <button
            onClick={onExit}
            style={{
              padding: "10px 32px",
              background: "rgba(120,140,160,0.28)",
              border: "1px solid rgba(180,200,220,0.4)",
              borderRadius: 4,
              color: "#eef4fa",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              letterSpacing: "0.1em",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            RETURN TO LOBBY
          </button>
        </div>
      )}
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
      {mapOpen && <MapSelectionPanel onClose={() => setMapOpen(false)} />}
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
      {deployOpen && <CombatArena onExit={() => setDeployOpen(false)} />}
    </div>
  );
}
