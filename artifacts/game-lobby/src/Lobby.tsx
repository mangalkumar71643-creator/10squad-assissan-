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

// Procedural sci-fi metal floor texture for the arena — dark blue-grey
// plating (layered value noise for subtle wear patches, fine speckle for
// grain) with beveled panel seams and a glowing cyan tactical-grid accent
// through each tile, echoing a holographic floor overlay.
function createFloorTexture(repeatCount: number, maxAnisotropy: number): THREE.CanvasTexture {
  // 1024px source (up from an earlier 256px pass) so panel seams and the
  // grain stay crisp instead of blurring/pixelating once the camera sits
  // this close to the ground — a low-res canvas was the main thing making
  // this look cheap up close, more than the actual art direction.
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const patch = valueNoise(x * 0.02, y * 0.02) * 0.6 + valueNoise(x * 0.06, y * 0.06) * 0.4;
      const speckle = hash2(x * 0.4, y * 0.4) * 0.1;
      const t = clamp(patch + speckle - 0.05, 0, 1);
      const r = Math.round(34 + t * 26);
      const g = Math.round(40 + t * 30);
      const b = Math.round(50 + t * 36);
      const i = (y * size + x) * 4;
      image.data[i] = r;
      image.data[i + 1] = g;
      image.data[i + 2] = b;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  // Beveled panel seams — a dark line with a lighter highlight offset a
  // couple pixels over, suggesting welded metal plating rather than a
  // flat color.
  const panels = 4;
  const step = size / panels;
  for (let i = 1; i < panels; i++) {
    ctx.strokeStyle = "rgba(8,12,18,0.7)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(i * step, 0);
    ctx.lineTo(i * step, size);
    ctx.moveTo(0, i * step);
    ctx.lineTo(size, i * step);
    ctx.stroke();
    ctx.strokeStyle = "rgba(90,110,130,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(i * step + 3, 0);
    ctx.lineTo(i * step + 3, size);
    ctx.moveTo(0, i * step + 3);
    ctx.lineTo(size, i * step + 3);
    ctx.stroke();
  }

  // Glowing cyan tactical-grid accent through the tile center.
  ctx.save();
  ctx.shadowColor = "#6be2ff";
  ctx.shadowBlur = 36;
  ctx.strokeStyle = "rgba(107,226,255,0.55)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.moveTo(0, size / 2);
  ctx.lineTo(size, size / 2);
  ctx.stroke();
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatCount, repeatCount);
  // Without this a ground plane viewed at the shallow grazing angle a
  // close chase camera sees goes visibly blurry/muddy at any distance,
  // regardless of source resolution — anisotropic filtering is what
  // actually fixes that.
  texture.anisotropy = maxAnisotropy;
  return texture;
}

// A dark recessed vent grate — thin light bars over a near-black base,
// dropped flat into the floor in the middle of the sci-fi room.
function createGrateTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#05080c";
  ctx.fillRect(0, 0, size, size);
  const bars = 9;
  const barGap = size / bars;
  ctx.strokeStyle = "rgba(120,150,170,0.8)";
  ctx.lineWidth = 5;
  for (let i = 0; i < bars; i++) {
    const y = barGap * i + barGap / 2;
    ctx.beginPath();
    ctx.moveTo(size * 0.08, y);
    ctx.lineTo(size * 0.92, y);
    ctx.stroke();
  }
  ctx.save();
  ctx.shadowColor = "#6be2ff";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "rgba(107,226,255,0.5)";
  ctx.lineWidth = 3;
  ctx.strokeRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9);
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Diagonal yellow/black hazard stripes for the floor decal at a doorway
// threshold.
function createHazardStripeTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#12100a";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#e8c23a";
  const stripeWidth = size / 4;
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(Math.PI / 4);
  ctx.translate(-size, -size);
  for (let x = -size; x < size * 2; x += stripeWidth * 2) {
    ctx.fillRect(x, -size, stripeWidth, size * 4);
  }
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// A simple vertical-gradient sky, painted onto a canvas and wrapped around
// a big inward-facing sphere — without this the scene has no background
// at all (the canvas is alpha-transparent, so it just shows the page's
// near-black CSS background through it), which reads as floating in open
// space rather than standing outdoors, especially now that the arena is
// big enough for its edges to be visible in the distance.
function createSkyTexture(): THREE.CanvasTexture {
  const width = 4;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // A sphere's equator (v=0.5) is what a roughly-horizontal camera actually
  // sees, so the lit "horizon glow" band needs to sit there, not near the
  // bottom of the gradient — the very bottom of the sphere is hidden below
  // the ground plane and never visible anyway.
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#050a14"); // zenith — near-black, matching the arena's night tone
  gradient.addColorStop(0.38, "#0d1f34");
  gradient.addColorStop(0.52, "#2f5678"); // lit horizon band, where the camera actually looks
  gradient.addColorStop(0.62, "#5f8aa3");
  gradient.addColorStop(1, "#5f8aa3");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
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

const ARENA_HALF = 350; // 700x700 arena, centered on the origin
// Everything else that depends on the arena's size — floor tile density,
// grid line density, fog distance, the sky sphere and the camera's far
// clip plane — is derived from ARENA_HALF below instead of hand-tuned
// constants, so resizing the arena again later is a one-line change
// instead of a multi-spot retune.
const FLOOR_TILE_SIZE = 1.667; // world units per floor texture tile, kept constant regardless of arena size
const FLOOR_REPEAT = (ARENA_HALF * 2) / FLOOR_TILE_SIZE;
const GRID_DIVISIONS = ARENA_HALF * 2; // 1 world unit per grid cell
const FOG_NEAR = ARENA_HALF - 5;
const FOG_FAR = ARENA_HALF * 2.5;
const SKY_RADIUS = Math.max(350, ARENA_HALF * 4); // stays comfortably beyond the fog and the arena's own far corners
const CAMERA_FAR = SKY_RADIUS + 50;
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
const GUN_RANGE = 14; // a shootout distance, not a melee reach
const BODY_SEPARATION = 0.85; // minimum center-to-center distance the fighters can close to

// A sci-fi outpost room off to the side of the arena — four walls around a
// 40x40 footprint, each with its own door gap (one "entrance" side, three
// "exit" sides, all functionally identical openings), dressed with crates,
// a floor grate, hazard stripes and a wall screen to match the reference
// sci-fi interior. Placed well away from the default spawn points so it
// doesn't interfere with the immediate spawn-adjacent fight.
const ROOM_SIZE = 20; // doubled from the original 10 — rooms 1-5 only, room 6 has its own fixed ROOM6_WIDTH/ROOM6_DEPTH
const ROOM_WALL_HEIGHT = 2.5;
const ROOM_WALL_THICKNESS = 0.6;
const ROOM_DOOR_WIDTH = 2;
const ROOM_POS = { x: 60, z: -50 };
// Room 2-5 centers are pushed out by the same amount ROOM_SIZE grew (5 extra
// half-extent per room facing a corridor), so every corridor's actual open
// length (see CORRIDOR_Z_NEAR/FAR etc. below) stays exactly what it was
// before the rooms doubled in size, instead of shrinking as the bigger
// rooms eat into the gap.
const ROOM2_POS = { x: 60, z: -160 }; // a second, identical room, corridor length unchanged from before the resize
const ROOM3_POS = { x: 60, z: -220 }; // a third, identical room, corridor length unchanged from before the resize
const ROOM4_POS = { x: ROOM3_POS.x + 60, z: ROOM3_POS.z }; // a fourth room, off the main line — corridor length unchanged from before the resize
const ROOM5_POS = { x: ROOM4_POS.x, z: ROOM4_POS.z - 60 }; // a fifth room, branching again — corridor length unchanged from before the resize
const ROOM_POSITIONS = [ROOM_POS, ROOM2_POS, ROOM3_POS, ROOM4_POS, ROOM5_POS];
const ROOM_SEG_WIDTH = (ROOM_SIZE - ROOM_DOOR_WIDTH) / 2;
const ROOM_SEG_OFFSET = ROOM_DOOR_WIDTH / 2 + ROOM_SEG_WIDTH / 2;
const ROOM_PAD = 0.4; // padded out by a fighter's body radius

interface Obstacle {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  pad: number;
}

// Two wall segments per side (north/south run along x, east/west run along
// z), flanking a door-width gap at the room's center on that side.
function roomWallObstacles(pos: { x: number; z: number }): Obstacle[] {
  return [
    { x: pos.x - ROOM_SEG_OFFSET, z: pos.z - ROOM_SIZE / 2, halfX: ROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north-west
    { x: pos.x + ROOM_SEG_OFFSET, z: pos.z - ROOM_SIZE / 2, halfX: ROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north-east
    { x: pos.x - ROOM_SEG_OFFSET, z: pos.z + ROOM_SIZE / 2, halfX: ROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-west
    { x: pos.x + ROOM_SEG_OFFSET, z: pos.z + ROOM_SIZE / 2, halfX: ROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-east
    { x: pos.x - ROOM_SIZE / 2, z: pos.z - ROOM_SEG_OFFSET, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM_SEG_WIDTH / 2, pad: ROOM_PAD }, // west-north
    { x: pos.x - ROOM_SIZE / 2, z: pos.z + ROOM_SEG_OFFSET, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM_SEG_WIDTH / 2, pad: ROOM_PAD }, // west-south
    { x: pos.x + ROOM_SIZE / 2, z: pos.z - ROOM_SEG_OFFSET, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM_SEG_WIDTH / 2, pad: ROOM_PAD }, // east-north
    { x: pos.x + ROOM_SIZE / 2, z: pos.z + ROOM_SEG_OFFSET, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM_SEG_WIDTH / 2, pad: ROOM_PAD }, // east-south
  ];
}

// Storage crates (mirrors the addCrate(...) calls below) — axis-aligned
// half-extents padded out to cover each crate's rotated footprint so a
// fighter can't walk straight through the decoration.
function roomCrateObstacles(pos: { x: number; z: number }): Obstacle[] {
  return [
    { x: pos.x - 2.5, z: pos.z - 2.5, halfX: 0.8, halfZ: 1.12, pad: ROOM_PAD }, // crate 1
    { x: pos.x + 2.75, z: pos.z - 2, halfX: 0.86, halfZ: 1.13, pad: ROOM_PAD }, // crate 2
    { x: pos.x + 2, z: pos.z + 2.75, halfX: 1.08, halfZ: 1.07, pad: ROOM_PAD }, // crate 3
  ];
}

// A covered corridor connecting the two rooms' facing doors — walled on
// both sides and roofed to match, so the two rooms read as one connected
// outpost. Runs from ROOM_POS's north (entrance) wall to ROOM2_POS's south
// (exit) wall. Wider than the ROOM_DOOR_WIDTH door gap it passes through,
// so it necks down at each end rather than being a uniform width.
const CORRIDOR_WIDTH = 3.5;
const CORRIDOR_Z_NEAR = ROOM_POS.z - ROOM_SIZE / 2;
const CORRIDOR_Z_FAR = ROOM2_POS.z + ROOM_SIZE / 2;
const CORRIDOR_CENTER_Z = (CORRIDOR_Z_NEAR + CORRIDOR_Z_FAR) / 2;
const CORRIDOR_SIDE_OFFSET = CORRIDOR_WIDTH / 2 + ROOM_WALL_THICKNESS / 2;

// A small 6x6 outpost built directly into the middle of the corridor, with
// a door on each of the two walls facing the corridor (ROOM_POS's side and
// ROOM2_POS's side) so all three rooms connect through one continuous path.
const MIDROOM_SIZE = 6;
const MIDROOM_POS = { x: ROOM_POS.x, z: CORRIDOR_CENTER_Z };
const MIDROOM_DOOR_WIDTH = ROOM_DOOR_WIDTH;
const MIDROOM_SEG_WIDTH = (MIDROOM_SIZE - MIDROOM_DOOR_WIDTH) / 2;
const MIDROOM_SEG_OFFSET = MIDROOM_DOOR_WIDTH / 2 + MIDROOM_SEG_WIDTH / 2;
const MIDROOM_SOUTH_Z = MIDROOM_POS.z + MIDROOM_SIZE / 2; // door side, facing ROOM_POS
const MIDROOM_NORTH_Z = MIDROOM_POS.z - MIDROOM_SIZE / 2; // door side, facing ROOM2_POS
const MIDROOM_WALLS: Obstacle[] = [
  { x: MIDROOM_POS.x - MIDROOM_SEG_OFFSET, z: MIDROOM_SOUTH_Z, halfX: MIDROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-west (door side)
  { x: MIDROOM_POS.x + MIDROOM_SEG_OFFSET, z: MIDROOM_SOUTH_Z, halfX: MIDROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-east (door side)
  { x: MIDROOM_POS.x - MIDROOM_SEG_OFFSET, z: MIDROOM_NORTH_Z, halfX: MIDROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north-west (door side)
  { x: MIDROOM_POS.x + MIDROOM_SEG_OFFSET, z: MIDROOM_NORTH_Z, halfX: MIDROOM_SEG_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north-east (door side)
  { x: MIDROOM_POS.x - MIDROOM_SIZE / 2, z: MIDROOM_POS.z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: MIDROOM_SIZE / 2, pad: ROOM_PAD }, // west — solid
  { x: MIDROOM_POS.x + MIDROOM_SIZE / 2, z: MIDROOM_POS.z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: MIDROOM_SIZE / 2, pad: ROOM_PAD }, // east — solid
];

// The corridor is split into two segments by MIDROOM sitting in the middle:
// one running from ROOM_POS to the midroom's doored south wall, the other
// from ROOM2_POS to the midroom's solid north wall (a dead end).
const CORRIDOR_NEAR_Z1 = MIDROOM_SOUTH_Z + ROOM_WALL_THICKNESS / 2; // outer face of midroom's south wall
const CORRIDOR_NEAR_Z2 = CORRIDOR_Z_NEAR;
const CORRIDOR_NEAR_LENGTH = CORRIDOR_NEAR_Z2 - CORRIDOR_NEAR_Z1;
const CORRIDOR_NEAR_CENTER_Z = (CORRIDOR_NEAR_Z1 + CORRIDOR_NEAR_Z2) / 2;
const CORRIDOR_FAR_Z1 = CORRIDOR_Z_FAR;
const CORRIDOR_FAR_Z2 = MIDROOM_NORTH_Z - ROOM_WALL_THICKNESS / 2; // outer face of midroom's north wall
const CORRIDOR_FAR_LENGTH = CORRIDOR_FAR_Z2 - CORRIDOR_FAR_Z1;
const CORRIDOR_FAR_CENTER_Z = (CORRIDOR_FAR_Z1 + CORRIDOR_FAR_Z2) / 2;
const CORRIDOR_SEGMENTS = [
  { length: CORRIDOR_NEAR_LENGTH, centerZ: CORRIDOR_NEAR_CENTER_Z },
  { length: CORRIDOR_FAR_LENGTH, centerZ: CORRIDOR_FAR_CENTER_Z },
];
const CORRIDOR_WALLS: Obstacle[] = CORRIDOR_SEGMENTS.flatMap((seg) => [
  { x: ROOM_POS.x - CORRIDOR_SIDE_OFFSET, z: seg.centerZ, halfX: ROOM_WALL_THICKNESS / 2, halfZ: seg.length / 2, pad: ROOM_PAD }, // west
  { x: ROOM_POS.x + CORRIDOR_SIDE_OFFSET, z: seg.centerZ, halfX: ROOM_WALL_THICKNESS / 2, halfZ: seg.length / 2, pad: ROOM_PAD }, // east
]);

// A second, plain corridor (no mid-house this time) connecting ROOM2_POS's
// entrance wall to ROOM3_POS's exit wall.
const CORRIDOR2_Z_NEAR = ROOM2_POS.z - ROOM_SIZE / 2;
const CORRIDOR2_Z_FAR = ROOM3_POS.z + ROOM_SIZE / 2;
const CORRIDOR2_LENGTH = CORRIDOR2_Z_NEAR - CORRIDOR2_Z_FAR;
const CORRIDOR2_CENTER_Z = (CORRIDOR2_Z_NEAR + CORRIDOR2_Z_FAR) / 2;
const CORRIDOR2_WALLS: Obstacle[] = [
  { x: ROOM_POS.x - CORRIDOR_SIDE_OFFSET, z: CORRIDOR2_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR2_LENGTH / 2, pad: ROOM_PAD }, // west
  { x: ROOM_POS.x + CORRIDOR_SIDE_OFFSET, z: CORRIDOR2_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR2_LENGTH / 2, pad: ROOM_PAD }, // east
];

// A third corridor, running east-west this time (ROOM4_POS branches off to
// the side rather than continuing the north-south line), joining ROOM3_POS's
// east wall to ROOM4_POS's west wall. Same width/style, just rotated 90°:
// its walls flank the north/south sides instead of east/west.
const CORRIDOR3_X_NEAR = ROOM3_POS.x + ROOM_SIZE / 2;
const CORRIDOR3_X_FAR = ROOM4_POS.x - ROOM_SIZE / 2;
const CORRIDOR3_LENGTH = CORRIDOR3_X_FAR - CORRIDOR3_X_NEAR;
const CORRIDOR3_CENTER_X = (CORRIDOR3_X_NEAR + CORRIDOR3_X_FAR) / 2;
const CORRIDOR3_WALLS: Obstacle[] = [
  { x: CORRIDOR3_CENTER_X, z: ROOM3_POS.z - CORRIDOR_SIDE_OFFSET, halfX: CORRIDOR3_LENGTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north
  { x: CORRIDOR3_CENTER_X, z: ROOM3_POS.z + CORRIDOR_SIDE_OFFSET, halfX: CORRIDOR3_LENGTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south
];

// A fourth corridor, back to running north-south, joining ROOM4_POS's north
// wall to ROOM5_POS's south wall — ROOM5_POS branches off again instead of
// continuing straight along corridor3's east-west line.
const CORRIDOR4_Z_NEAR = ROOM4_POS.z - ROOM_SIZE / 2;
const CORRIDOR4_Z_FAR = ROOM5_POS.z + ROOM_SIZE / 2;
const CORRIDOR4_LENGTH = CORRIDOR4_Z_NEAR - CORRIDOR4_Z_FAR;
const CORRIDOR4_CENTER_Z = (CORRIDOR4_Z_NEAR + CORRIDOR4_Z_FAR) / 2;
const CORRIDOR4_WALLS: Obstacle[] = [
  { x: ROOM4_POS.x - CORRIDOR_SIDE_OFFSET, z: CORRIDOR4_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR4_LENGTH / 2, pad: ROOM_PAD }, // west
  { x: ROOM4_POS.x + CORRIDOR_SIDE_OFFSET, z: CORRIDOR4_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR4_LENGTH / 2, pad: ROOM_PAD }, // east
];

// ROOM6 — a larger 40x30 (width x depth) room built directly in front of
// ROOM5_POS, i.e. continuing further along the same north direction ROOM5
// branched off in. Unlike the other rooms it isn't square, so its wall
// segments are computed independently per axis rather than reusing
// roomWallObstacles(). Only one door (south, back to ROOM5_POS) remains —
// see ROOM6_WALLS below.
const ROOM6_WIDTH = 40;
const ROOM6_DEPTH = 30;
const ROOM6_DOOR_WIDTH = ROOM_DOOR_WIDTH;
const ROOM6_POS = { x: ROOM5_POS.x, z: ROOM5_POS.z - (ROOM_SIZE / 2 + 40 + ROOM6_DEPTH / 2) };
const ROOM6_SEG_WIDTH_X = (ROOM6_WIDTH - ROOM6_DOOR_WIDTH) / 2;
const ROOM6_SEG_OFFSET_X = ROOM6_DOOR_WIDTH / 2 + ROOM6_SEG_WIDTH_X / 2;
// Only the south wall keeps its door (the one linking back to ROOM5_POS via
// CORRIDOR5_WALLS) — north, east and west are sealed solid since they led
// nowhere but open exterior.
const ROOM6_WALLS: Obstacle[] = [
  { x: ROOM6_POS.x, z: ROOM6_POS.z - ROOM6_DEPTH / 2, halfX: ROOM6_WIDTH / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // north — solid
  { x: ROOM6_POS.x - ROOM6_SEG_OFFSET_X, z: ROOM6_POS.z + ROOM6_DEPTH / 2, halfX: ROOM6_SEG_WIDTH_X / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-west (door side)
  { x: ROOM6_POS.x + ROOM6_SEG_OFFSET_X, z: ROOM6_POS.z + ROOM6_DEPTH / 2, halfX: ROOM6_SEG_WIDTH_X / 2, halfZ: ROOM_WALL_THICKNESS / 2, pad: ROOM_PAD }, // south-east (door side)
  { x: ROOM6_POS.x - ROOM6_WIDTH / 2, z: ROOM6_POS.z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM6_DEPTH / 2, pad: ROOM_PAD }, // west — solid
  { x: ROOM6_POS.x + ROOM6_WIDTH / 2, z: ROOM6_POS.z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: ROOM6_DEPTH / 2, pad: ROOM_PAD }, // east — solid
];

// Fifth corridor joining ROOM5_POS's north door to ROOM6_POS's south door.
const CORRIDOR5_Z_NEAR = ROOM5_POS.z - ROOM_SIZE / 2;
const CORRIDOR5_Z_FAR = ROOM6_POS.z + ROOM6_DEPTH / 2;
const CORRIDOR5_LENGTH = CORRIDOR5_Z_NEAR - CORRIDOR5_Z_FAR;
const CORRIDOR5_CENTER_Z = (CORRIDOR5_Z_NEAR + CORRIDOR5_Z_FAR) / 2;
const CORRIDOR5_WALLS: Obstacle[] = [
  { x: ROOM5_POS.x - CORRIDOR_SIDE_OFFSET, z: CORRIDOR5_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR5_LENGTH / 2, pad: ROOM_PAD }, // west
  { x: ROOM5_POS.x + CORRIDOR_SIDE_OFFSET, z: CORRIDOR5_CENTER_Z, halfX: ROOM_WALL_THICKNESS / 2, halfZ: CORRIDOR5_LENGTH / 2, pad: ROOM_PAD }, // east
];

// Extra crates scattered through the spots that don't already have any —
// the midroom, every corridor, and ROOM6 (rooms 1-5 already get their own
// via roomCrateObstacles). Each is offset to one side of its walkway so
// there's still room to pass, not a full blockage.
const EXTRA_CRATES: Obstacle[] = [
  { x: 61.5, z: MIDROOM_POS.z + 1.5, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // midroom
  { x: 59, z: CORRIDOR_NEAR_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor near segment (room1<->midroom)
  { x: 61, z: CORRIDOR_FAR_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor far segment (midroom<->room2)
  { x: 59, z: CORRIDOR2_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor2 (room2<->room3)
  { x: CORRIDOR3_CENTER_X, z: ROOM3_POS.z - 1, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor3 (room3<->room4, east-west)
  { x: ROOM4_POS.x + 1, z: CORRIDOR4_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor4 (room4<->room5)
  { x: ROOM5_POS.x - 1, z: CORRIDOR5_CENTER_Z, halfX: 0.5, halfZ: 0.5, pad: ROOM_PAD }, // corridor5 (room5<->room6)
  { x: ROOM6_POS.x - 12, z: ROOM6_POS.z - 8, halfX: 1, halfZ: 1, pad: ROOM_PAD }, // room6
  { x: ROOM6_POS.x + 10, z: ROOM6_POS.z + 5, halfX: 1, halfZ: 1, pad: ROOM_PAD }, // room6
  { x: ROOM6_POS.x, z: ROOM6_POS.z + 10, halfX: 1, halfZ: 1, pad: ROOM_PAD }, // room6
];

// An underground tunnel actually running beneath the real path between
// houses, at a lower Y (TUNNEL_Y) — not some separate tunnel off in
// unrelated empty arena. Since the collision system only checks X/Z (see
// resolveObstacleCollisions), reusing the exact same X/Z as the real
// walls/doors means the underground layer is automatically constrained
// to the exact same walkable route as the surface (the same door gaps,
// the same bend through the midroom and corridor 3's jog) — no separate
// collision needed, just every wall mirrored visually at TUNNEL_Y (see
// the scene-building code below) plus a staircase in each house dropping
// straight down through its own center, "piercing through the middle of
// the house" the way it was asked for, rather than tucked in a corner.
const TUNNEL_Y = -3.5;
const TUNNEL_WALL_HEIGHT = 2.2;
const HOLE_HALF_SIZE = 1.1; // square, not round — half-extent, so 2.2 units per side
const HOLE_INNER_SIZE = HOLE_HALF_SIZE * 2 - 0.4;
// The stairway's walkable footprint: a run of real steps descending from
// the house floor (y=0) all the way to the tunnel floor (y=TUNNEL_Y),
// oriented along the house's own tunnel connection (see ROOM_TUNNEL_DIR)
// rather than a single square hole, so it reads and plays like an actual
// staircase instead of a hole you fall through. RAMP_BAND lets the
// height-follow logic pick the player up a little before the first step
// and hold them a little after the last one, so there's no seam.
const RAMP_HALF_WIDTH = HOLE_INNER_SIZE / 2;
const RAMP_RUN_LENGTH = 4.5;
const RAMP_BAND = 0.5;
const ROOM_STAIRS_DOWN_POS = [ROOM_POS, ROOM2_POS, ROOM3_POS, ROOM4_POS, ROOM5_POS, ROOM6_POS];
const TUNNEL_STOPS = ROOM_STAIRS_DOWN_POS.map((p) => ({ x: p.x, z: p.z }));
// Which way each house's staircase actually descends, matching the real
// relative positions — the stairway (see RAMP_RUN_LENGTH) runs forward
// from the house center in this direction, toward the next house in the
// chain. Room 6 is the end of the chain, so it descends back toward Room
// 5 instead.
const ROOM_TUNNEL_DIR = [
  { x: 0, z: -1 }, // Room 1 -> Room 2
  { x: 0, z: -1 }, // Room 2 -> Room 3
  { x: 1, z: 0 }, // Room 3 -> Room 4
  { x: 0, z: -1 }, // Room 4 -> Room 5
  { x: 0, z: -1 }, // Room 5 -> Room 6
  { x: 0, z: 1 }, // Room 6 -> back toward Room 5 (end of the chain)
];
// The stairway's footprint at house i, as world-space (x,z) corners of
// the long rectangle running from the house center (along=0) out to
// RAMP_RUN_LENGTH in that house's descent direction, RAMP_HALF_WIDTH to
// each side — used to cut the matching hole through both the room floor
// and the tunnel ceiling below it.
function stairFootprintCorners(i: number) {
  const center = ROOM_STAIRS_DOWN_POS[i];
  const dir = ROOM_TUNNEL_DIR[i];
  const perpX = -dir.z;
  const perpZ = dir.x;
  const farX = center.x + dir.x * RAMP_RUN_LENGTH;
  const farZ = center.z + dir.z * RAMP_RUN_LENGTH;
  return {
    nearA: { x: center.x + perpX * RAMP_HALF_WIDTH, z: center.z + perpZ * RAMP_HALF_WIDTH },
    nearB: { x: center.x - perpX * RAMP_HALF_WIDTH, z: center.z - perpZ * RAMP_HALF_WIDTH },
    farA: { x: farX + perpX * RAMP_HALF_WIDTH, z: farZ + perpZ * RAMP_HALF_WIDTH },
    farB: { x: farX - perpX * RAMP_HALF_WIDTH, z: farZ - perpZ * RAMP_HALF_WIDTH },
  };
}
// A generous bounding box around every room/corridor, for the
// underground floor+ceiling slabs (see the scene-building code below).
const UNDERGROUND_MIN_X = Math.min(ROOM_POS.x, ROOM2_POS.x, ROOM3_POS.x, ROOM4_POS.x, ROOM5_POS.x, ROOM6_POS.x - ROOM6_WIDTH / 2) - ROOM_SIZE / 2 - 2;
const UNDERGROUND_MAX_X = Math.max(ROOM_POS.x, ROOM2_POS.x, ROOM3_POS.x, ROOM4_POS.x, ROOM5_POS.x, ROOM6_POS.x + ROOM6_WIDTH / 2) + ROOM_SIZE / 2 + 2;
const UNDERGROUND_MIN_Z = Math.min(ROOM_POS.z, ROOM2_POS.z, ROOM3_POS.z, ROOM4_POS.z, ROOM5_POS.z, ROOM6_POS.z - ROOM6_DEPTH / 2) - ROOM_SIZE / 2 - 2;
const UNDERGROUND_MAX_Z = Math.max(ROOM_POS.z, ROOM2_POS.z, ROOM3_POS.z, ROOM4_POS.z, ROOM5_POS.z, ROOM6_POS.z + ROOM6_DEPTH / 2) + ROOM_SIZE / 2 + 2;

const OBSTACLES: Obstacle[] = [
  ...ROOM_POSITIONS.flatMap((pos) => [...roomWallObstacles(pos), ...roomCrateObstacles(pos)]),
  ...MIDROOM_WALLS,
  ...CORRIDOR_WALLS,
  ...CORRIDOR2_WALLS,
  ...CORRIDOR3_WALLS,
  ...CORRIDOR4_WALLS,
  ...ROOM6_WALLS,
  ...CORRIDOR5_WALLS,
  ...EXTRA_CRATES,
];

// Every door opening in the map, catalogued so a sliding gate can be built
// for each one — closed by default, sliding apart automatically as a
// fighter approaches. `axis` is the direction the two panels slide apart:
// "x" for gaps in a wall that runs along x (north/south walls), "z" for
// gaps in a wall that runs along z (east/west walls).
interface Door {
  x: number;
  z: number;
  width: number;
  axis: "x" | "z";
}

function roomDoors(pos: { x: number; z: number }): Door[] {
  return [
    { x: pos.x, z: pos.z - ROOM_SIZE / 2, width: ROOM_DOOR_WIDTH, axis: "x" }, // north
    { x: pos.x, z: pos.z + ROOM_SIZE / 2, width: ROOM_DOOR_WIDTH, axis: "x" }, // south
    { x: pos.x - ROOM_SIZE / 2, z: pos.z, width: ROOM_DOOR_WIDTH, axis: "z" }, // west
    { x: pos.x + ROOM_SIZE / 2, z: pos.z, width: ROOM_DOOR_WIDTH, axis: "z" }, // east
  ];
}

const DOORS: Door[] = [
  ...ROOM_POSITIONS.flatMap(roomDoors),
  { x: ROOM6_POS.x, z: ROOM6_POS.z + ROOM6_DEPTH / 2, width: ROOM6_DOOR_WIDTH, axis: "x" }, // room6's one remaining door
  { x: MIDROOM_POS.x, z: MIDROOM_SOUTH_Z, width: MIDROOM_DOOR_WIDTH, axis: "x" },
  { x: MIDROOM_POS.x, z: MIDROOM_NORTH_Z, width: MIDROOM_DOOR_WIDTH, axis: "x" },
];

// Pushes a fighter's x/z position out of any obstacle's footprint, kicking
// it out along whichever axis has the least overlap.
function resolveObstacleCollisions(pos: { x: number; z: number }) {
  for (const ob of OBSTACLES) {
    const halfX = ob.halfX + ob.pad;
    const halfZ = ob.halfZ + ob.pad;
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

// Whether the straight segment from (x1,z1) to (x2,z2) crosses this
// obstacle's footprint — a standard slab test against its axis-aligned
// rectangle, walked with the segment's own parametric range so a hit
// outside [0,1] (before the start or past the end) doesn't count. Uses
// the bare halfX/halfZ, not the movement-collision `pad` — that padding
// exists to keep a fighter's body from clipping into a wall, not to
// decide whether a bullet's sightline is blocked.
function segmentHitsObstacle(x1: number, z1: number, x2: number, z2: number, ob: Obstacle): boolean {
  const minX = ob.x - ob.halfX;
  const maxX = ob.x + ob.halfX;
  const minZ = ob.z - ob.halfZ;
  const maxZ = ob.z + ob.halfZ;
  const dx = x2 - x1;
  const dz = z2 - z1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    let t1 = (minX - x1) / dx;
    let t2 = (maxX - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (z1 < minZ || z1 > maxZ) return false;
  } else {
    let t1 = (minZ - z1) / dz;
    let t2 = (maxZ - z1) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Each door opening's sliding gate occupies a *gap* in OBSTACLES (see
// roomWallObstacles) — the wall geometry itself never blocks a shot
// through a doorway, open or closed. The gate panels are what actually
// seal it, and they move (see updateGatePanels in the tick loop), so
// their current footprint can't be a fixed entry in OBSTACLES; it's
// recomputed into this module-level list every tick (see the gate-slide
// block below) and checked by hasLineOfSight right alongside the static
// walls, so a shot is blocked by a still-closed or half-open gate the
// same way it's blocked by a solid wall, and clears the instant the gate
// finishes sliding open.
let gateBlockers: Obstacle[] = [];

// Whether a shot fired from (x1,z1) toward (x2,z2) actually has a clear
// path — walls are modelled as gapped segments (see roomWallObstacles;
// each door opening is a real gap in the geometry, not a separate flag),
// so this needs no special-casing for doors on its own: a shot through an
// open doorway simply never intersects any wall rectangle. The gate
// panels filling that gap (see gateBlockers) are checked separately,
// since a closed door should still stop a shot even though the wall
// behind it has no geometry there.
function hasLineOfSight(x1: number, z1: number, x2: number, z2: number): boolean {
  for (const ob of OBSTACLES) {
    if (segmentHitsObstacle(x1, z1, x2, z2, ob)) return false;
  }
  for (const ob of gateBlockers) {
    if (segmentHitsObstacle(x1, z1, x2, z2, ob)) return false;
  }
  return true;
}

const PLAYER_DAMAGE = 14;
const BOT_DAMAGE = 10;
const PLAYER_ATTACK_COOLDOWN = 0.55;
const BOT_ATTACK_COOLDOWN = 1.3;
const LOOK_SENSITIVITY_BASE = 0.009;
const LOOK_SENSITIVITY_MIN = 0.4;
const LOOK_SENSITIVITY_MAX = 2.5;
const LOOK_SENSITIVITY_STORAGE_KEY = "10sa-look-sensitivity";
// A real firing/recoil animation ("RifleFire", grafted into the glb — see
// the merge that added it) plays on every shot, at its own native mocap
// pace (no artificial speed-up) — an earlier version compressed this into
// a fixed 0.4s window via timeScale, which made the motion look jerky
// instead of a clean recoil. Auto-fire (holding the FIRE button) can
// legitimately retrigger a shot before the previous one's animation
// finishes (the player's 0.55s cooldown is shorter than this), which
// simply restarts the clip from frame 0 — reads as continuous recoil
// rather than a glitch, the same way a real automatic weapon's cycle
// never fully completes between rounds.
const FIRE_ANIM_DURATION = 1.1667;
// How much of FIRE_ANIM_DURATION is spent blending in from / back out to
// whatever the idle/run blend already had that frame, rather than cutting
// straight to/from the fire clip.
const FIRE_FADE_IN = 0.15;
const FIRE_FADE_OUT = 0.4;
// How long a tracer stays visible before it's removed.
const TRACER_DURATION = 0.08;
// Roughly chest height — tracers aim here instead of at the root/feet.
const TRACER_TARGET_HEIGHT = 1.3;
const BOT1_TINT = 0xff6b5e;
const BOT2_TINT = 0xffb703;
const BOT3_TINT = 0x8a5cff;
const BOT4_TINT = 0x4dff9e;
const BOT5_TINT = 0x4dd0ff;
// Guards stand and patrol off to the side of their room's own center, not
// on top of it — the stairs down to the tunnel sit exactly at that center
// (see ROOM_STAIRS_DOWN_POS), and standing/fighting right there used to
// carry the player through the stairway's height-follow zone (see
// RAMP_HALF_WIDTH/RAMP_RUN_LENGTH) mid-fight, sinking them partway into
// the floor even though they never meant to go downstairs. Offsetting
// perpendicular to that house's own descent direction (see
// ROOM_TUNNEL_DIR), by more than the stairway's half-width plus the full
// patrol wander radius, keeps the whole guard post clear of that zone.
const GUARD_OFFSET = 6;
function guardOffsetFor(i: number) {
  const dir = ROOM_TUNNEL_DIR[i];
  return { x: -dir.z * GUARD_OFFSET, z: dir.x * GUARD_OFFSET };
}
const GUARD_POS = ROOM_POSITIONS.map((pos, i) => {
  const off = guardOffsetFor(i);
  return { x: pos.x + off.x, z: pos.z + off.z };
});
const BOT1_SPAWN = GUARD_POS[0];
const BOT2_SPAWN = GUARD_POS[1];
const BOT3_SPAWN = GUARD_POS[2];
const BOT4_SPAWN = GUARD_POS[3];
const BOT5_SPAWN = GUARD_POS[4];
const GUARD_ALERT_RADIUS = 6;
const ALERT_TELEGRAPH_DURATION = 0.7;
const ALERT_MARK_HEIGHT = 2.15; // just above a guard's head
const HP_BAR_HEIGHT = 1.95; // just above the head, below the alert mark
// While dormant, a guard doesn't just freeze on one spot — it wanders a
// short walking loop around its post (left/right/forward/back at random),
// well within its room's walls, until the player's entry wakes it up.
const PATROL_RADIUS = 3;
const PATROL_SPEED = BOT_SPEED * 0.5; // an unhurried walk, not a chase sprint
const PATROL_ARRIVE_DIST = 0.4;
// There's no dedicated walk clip on this rig (only Idle2 and a full-sprint
// Running clip) — slowing the run clip's timeScale down to match the
// patrol speed still keeps its full running stride, which reads as a
// slow-motion sprint rather than an actual stroll. Blending it down
// toward idle instead (a partial run weight) softens that stride into
// something closer to an unhurried, restrained walk.
const PATROL_RUN_WEIGHT = 0.42;
// The Boss — a tougher fifth enemy stationed in Room 6 rather than roaming
// with the other four. It doesn't chase; it stands its ground, already
// armed, and opens fire the moment the player comes within range.
const BOSS_TINT = 0xb3122b;
// Same reasoning as GUARD_POS above — Room 6 also has its own stairs down
// at ROOM6_POS's exact center, so the boss (index 5 in ROOM_TUNNEL_DIR)
// gets the same clear-of-the-stairs offset instead of standing right on it.
const BOSS_SPAWN_OFFSET = guardOffsetFor(5);
const BOSS_SPAWN = { x: ROOM6_POS.x + BOSS_SPAWN_OFFSET.x, z: ROOM6_POS.z + BOSS_SPAWN_OFFSET.z };
const BOSS_HP = 220;
const BOSS_DAMAGE = 14;
const BOSS_ATTACK_COOLDOWN = 1.1;
// Route to the Boss, as a floor-arrow marker at every gate along the way
// (not a HUD element) — one glowing arrow on the ground at each doorway,
// pointing which way to walk through it, from spawn all the way to Room 6.
const PATH_GATES: { x: number; z: number; dirX: number; dirZ: number }[] = [
  { x: ROOM_POS.x, z: ROOM_POS.z + ROOM_SIZE / 2, dirX: 0, dirZ: -1 }, // room1 south — from spawn
  { x: ROOM_POS.x, z: ROOM_POS.z - ROOM_SIZE / 2, dirX: 0, dirZ: -1 }, // room1 north — onward to midroom
  { x: MIDROOM_POS.x, z: MIDROOM_SOUTH_Z, dirX: 0, dirZ: -1 }, // midroom south
  { x: MIDROOM_POS.x, z: MIDROOM_NORTH_Z, dirX: 0, dirZ: -1 }, // midroom north
  { x: ROOM2_POS.x, z: ROOM2_POS.z + ROOM_SIZE / 2, dirX: 0, dirZ: -1 }, // room2 south
  { x: ROOM2_POS.x, z: ROOM2_POS.z - ROOM_SIZE / 2, dirX: 0, dirZ: -1 }, // room2 north
  { x: ROOM3_POS.x, z: ROOM3_POS.z + ROOM_SIZE / 2, dirX: 0, dirZ: -1 }, // room3 south
  { x: ROOM3_POS.x + ROOM_SIZE / 2, z: ROOM3_POS.z, dirX: 1, dirZ: 0 }, // room3 east — turn toward room4
  { x: ROOM4_POS.x - ROOM_SIZE / 2, z: ROOM4_POS.z, dirX: 1, dirZ: 0 }, // room4 west
  { x: ROOM4_POS.x, z: ROOM4_POS.z - ROOM_SIZE / 2, dirX: 0, dirZ: -1 }, // room4 north — turn toward room5
  { x: ROOM5_POS.x, z: ROOM5_POS.z + ROOM_SIZE / 2, dirX: 0, dirZ: -1 }, // room5 south
  { x: ROOM5_POS.x, z: ROOM5_POS.z - ROOM_SIZE / 2, dirX: 0, dirZ: -1 }, // room5 north
  { x: ROOM6_POS.x, z: ROOM6_POS.z + ROOM6_DEPTH / 2, dirX: 0, dirZ: -1 }, // room6's only door
];

// A new SMG model held in the hand — every fighter actually shoots with it
// (see the fire logic in the tick loop and applyFirePose/spawnTracer),
// with this rig's real finger joints curled around the grip on both
// hands (see curlGunGripFingers) instead of resting against a fixed
// open palm.
//
// Unlike the old rifle model (long axis on local X), this mesh's long
// axis is local Z, muzzle/silencer at -Z (the silencer part's bounding
// box sits at the most-negative Z of the whole mesh, the stock/latches at
// the most-positive Z) — measured directly off the converted glb's own
// part bounding boxes, not guessed. Grip is already a separate named part
// in this mesh, so its own bounding-box center is used directly as the
// hand target instead of a hand-tuned point.
const GUN_GRIP_LOCAL = new THREE.Vector3(0, -10.43, 18.33);
// A point on the handguard, between the grip and the muzzle, in the raw
// mesh's own local space — this SMG's own named "Grip" part measured
// directly; kept for reference/tuning even though updateOffHandReach no
// longer targets it (see GUN_OFFHAND_TARGET_LOCAL).
const GUN_FOREGRIP_LOCAL = new THREE.Vector3(0, -9.76, 2.01);
// Where the off-hand actually reaches for (see updateOffHandReach) — much
// further forward than GUN_FOREGRIP_LOCAL. That point sits only ~11cm
// from the main grip on this short SMG, which put both hands so close
// together they read as one bunched-up fist instead of a two-handed
// hold; interpolated most of the way from the grip toward the muzzle tip
// (see MUZZLE_TIP_LOCAL) gives the classic "rear hand on the trigger,
// front hand out near the muzzle" look the reference grip has.
const GUN_OFFHAND_TARGET_LOCAL = new THREE.Vector3(0, -10.43, 18.33).lerp(new THREE.Vector3(0, 0, -31.4), 0.75);
const GUN_MUZZLE_AXIS = new THREE.Vector3(0, 0, -1);
// A real SMG is roughly this long; the rest of the transform is derived
// from that, not guessed independently.
const GUN_TARGET_LENGTH = 0.55;
// Where the muzzle should point, in RightHand-local space, at the idle
// pose's frame 0 — measured directly (character-forward transformed into
// RightHand's local frame at that pose). The direction from the grip hand
// to the off-hand (offHandLocal, normalized) looks like the obvious
// choice for this, but measuring both independently showed they're
// nearly orthogonal in this rig's RifleIdle pose — the off-hand doesn't
// sit out along the barrel the way it would on a real two-handed hold, so
// using it for orientation pointed the gun sideways instead of forward.
const GUN_MUZZLE_TARGET_LOCAL = new THREE.Vector3(0.20400064267090037, 0.5153436536777963, -0.8323488792936196);

// The gun model is a static (unskinned) mesh, so one glTF load is shared
// and cloned for whichever fighter needs it.
let gunPrototypePromise: Promise<THREE.Object3D> | null = null;
function loadGunPrototype(): Promise<THREE.Object3D> {
  if (!gunPrototypePromise) {
    gunPrototypePromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        "/characters/gun-smg.glb",
        (gltf) => resolve(gltf.scene),
        undefined,
        reject,
      );
    });
  }
  return gunPrototypePromise;
}

// Parents a clone of the shared gun model onto a fighter's RightHand bone,
// sized and oriented so the barrel points forward (see
// GUN_MUZZLE_TARGET_LOCAL). Anchored purely off the grip hand — nudging
// the whole gun to also land the foregrip exactly on the off-hand
// (offHandLocal) dragged the grip itself away from RightHand and made it
// look like it was floating outside the hand instead of held in it; a
// solidly-gripped gun that isn't perfectly foregrip-touching reads better
// than a foregrip-perfect gun that visibly isn't in the hand at all.
function createGunAttachment(hand: THREE.Object3D, prototype: THREE.Object3D): THREE.Object3D {
  // hand.matrixWorld isn't guaranteed current here — this runs as soon as
  // the shared gun prototype resolves, which can be before the scene has
  // ever been rendered (matrixWorld only recomputes on render or an
  // explicit update), so a stale identity-scale matrix would silently
  // undo this rig's ~0.0094 model scale and shrink the gun to a speck.
  hand.updateWorldMatrix(true, false);
  const worldScale = new THREE.Vector3();
  hand.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), worldScale);
  const gun = prototype.clone(true);
  const rawLength = 79.03;
  const scale = (GUN_TARGET_LENGTH / rawLength) / (worldScale.x || 1);
  gun.scale.setScalar(scale);
  gun.quaternion.setFromUnitVectors(GUN_MUZZLE_AXIS, GUN_MUZZLE_TARGET_LOCAL.clone().normalize());
  gun.position.copy(GUN_GRIP_LOCAL).multiplyScalar(scale).applyQuaternion(gun.quaternion).multiplyScalar(-1);
  hand.add(gun);
  return gun;
}

// Rotates `bone` (in place, preserving its parent's current orientation)
// so the ray from `bone` to `child` points at `targetWorld` instead of
// wherever the baked animation clip currently has it — a single-joint
// aim, not a full two-bone IK solve, but enough to visibly plant the
// off-hand's forearm toward the gun's foregrip instead of leaving it
// hanging wherever RifleIdle's own arm pose happens to put it (that pose
// doesn't reach out along the barrel the way a real two-handed grip
// would — see GUN_MUZZLE_TARGET_LOCAL's comment). Computed in world
// space and converted back into the bone's own local space, since
// `bone.quaternion` is relative to its parent, not the world.
const reachDelta = new THREE.Quaternion();
const reachParentWorldQuat = new THREE.Quaternion();
const reachBoneWorldQuat = new THREE.Quaternion();
const reachBonePos = new THREE.Vector3();
const reachChildPos = new THREE.Vector3();
function pointBoneToward(bone: THREE.Object3D, child: THREE.Object3D, targetWorld: THREE.Vector3) {
  bone.updateWorldMatrix(true, false);
  child.updateWorldMatrix(true, false);
  bone.getWorldPosition(reachBonePos);
  child.getWorldPosition(reachChildPos);
  const currentDir = reachChildPos.clone().sub(reachBonePos).normalize();
  const targetDir = targetWorld.clone().sub(reachBonePos).normalize();
  reachDelta.setFromUnitVectors(currentDir, targetDir);
  bone.getWorldQuaternion(reachBoneWorldQuat);
  bone.parent!.getWorldQuaternion(reachParentWorldQuat);
  const newWorldQuat = reachDelta.multiply(reachBoneWorldQuat);
  bone.quaternion.copy(reachParentWorldQuat.invert().multiply(newWorldQuat));
}

// A real two-bone IK solve (law of cosines for the elbow bend, then
// pointBoneToward twice — once to swing the upper arm so the elbow
// lands where the math says it must, once to bend the forearm the rest
// of the way onto the target) instead of rotating only the forearm.
// Rotating just the forearm can only ever place the hand somewhere on a
// sphere centered on the (fixed-position) elbow, and if the real target
// is farther from the elbow than the forearm is long, it physically
// can't reach — the hand just points at the target and stops short,
// which is exactly why the off-hand used to land back near the grip
// hand instead of out at the foregrip. Swinging the shoulder first
// moves the elbow itself out along the target direction so the
// remaining forearm-only correction actually has enough reach.
const ikShoulderPos = new THREE.Vector3();
const ikElbowPos = new THREE.Vector3();
const ikHandPos = new THREE.Vector3();
const ikTargetDir = new THREE.Vector3();
const ikPoleDir = new THREE.Vector3();
const ikBendAxis = new THREE.Vector3();
const ikDesiredElbowPos = new THREE.Vector3();
function solveTwoBoneIK(shoulder: THREE.Object3D, elbow: THREE.Object3D, hand: THREE.Object3D, targetWorld: THREE.Vector3, poleWorld: THREE.Vector3) {
  shoulder.updateWorldMatrix(true, false);
  elbow.updateWorldMatrix(true, false);
  hand.updateWorldMatrix(true, false);
  shoulder.getWorldPosition(ikShoulderPos);
  elbow.getWorldPosition(ikElbowPos);
  hand.getWorldPosition(ikHandPos);

  const upperLen = ikShoulderPos.distanceTo(ikElbowPos);
  const foreLen = ikElbowPos.distanceTo(ikHandPos);

  ikTargetDir.copy(targetWorld).sub(ikShoulderPos);
  let targetDist = ikTargetDir.length();
  const maxReach = upperLen + foreLen - 0.001;
  const minReach = Math.abs(upperLen - foreLen) + 0.001;
  targetDist = clamp(targetDist, minReach, maxReach);
  ikTargetDir.normalize();

  // Angle at the shoulder, between shoulder->target and shoulder->elbow,
  // once the elbow is bent to actually put the hand on the target.
  const cosShoulderAngle = clamp(
    (upperLen * upperLen + targetDist * targetDist - foreLen * foreLen) / (2 * upperLen * targetDist),
    -1, 1,
  );
  const shoulderAngle = Math.acos(cosShoulderAngle);

  // The pole vector picks which side the elbow bends toward — without
  // it the shoulder angle alone leaves the bend direction undefined
  // (any point on a cone around the target direction would satisfy the
  // law of cosines).
  ikPoleDir.copy(poleWorld).sub(ikShoulderPos);
  ikBendAxis.crossVectors(ikTargetDir, ikPoleDir);
  if (ikBendAxis.lengthSq() < 1e-8) ikBendAxis.set(1, 0, 0);
  ikBendAxis.normalize();

  ikDesiredElbowPos.copy(ikTargetDir).applyAxisAngle(ikBendAxis, shoulderAngle).multiplyScalar(upperLen).add(ikShoulderPos);

  pointBoneToward(shoulder, elbow, ikDesiredElbowPos);
  pointBoneToward(elbow, hand, targetWorld);
}

// Bends a fighter's off-hand (shoulder + elbow), every tick, so the
// off-hand visibly reaches all the way to the gun's foregrip (see
// solveTwoBoneIK) — has to run every tick, not just once at gun-attach
// time, since the idle/run/fire mocap clips keep re-driving these arm
// bones' rotations on every mixer.update, which would otherwise
// immediately undo a one-time snap.
const offHandForward = new THREE.Vector3();
const offHandPoleWorld = new THREE.Vector3();
function updateOffHandReach(rig: FighterRig) {
  if (!rig.gun || !rig.leftArm || !rig.leftForeArm || !rig.leftHand) return;
  rig.gun.updateWorldMatrix(true, false);
  const foregripWorld = GUN_OFFHAND_TARGET_LOCAL.clone().applyMatrix4(rig.gun.matrixWorld);
  rig.leftArm.updateWorldMatrix(true, false);
  rig.leftArm.getWorldPosition(offHandPoleWorld);
  offHandForward.set(Math.sin(rig.root.rotation.y), 0, Math.cos(rig.root.rotation.y));
  // Elbow bends down and slightly forward from the shoulder, like a
  // natural two-handed grip, instead of an arbitrary/undefined direction.
  offHandPoleWorld.y -= 1;
  offHandPoleWorld.addScaledVector(offHandForward, 0.3);
  solveTwoBoneIK(rig.leftArm, rig.leftForeArm, rig.leftHand, foregripWorld, offHandPoleWorld);
}

// Curls a hand's finger joints in around the gun grip/foregrip — each
// joint gets a fixed rotation about its local Z axis, applied once at
// gun-attach time. This only needs to run once (not every tick): the
// rig's baked clips don't touch the finger bones at all, so there's
// nothing to fight frame to frame, and re-applying it every tick would
// just keep curling the fingers further closed. `mirror` flips the
// rotation sign for the off-hand, whose finger bones are mirrored across
// the skeleton's centerline.
const FINGER_CURL_AXIS = new THREE.Vector3(0, 0, 1);
const FINGER_CURL_ANGLES: Record<string, number> = {
  Index1: 0.55, Index2: 0.7, Index3: 0.6,
  Middle1: 0.6, Middle2: 0.75, Middle3: 0.65,
  Ring1: 0.65, Ring2: 0.8, Ring3: 0.7,
  Pinky1: 0.7, Pinky2: 0.85, Pinky3: 0.75,
  Thumb1: 0.2, Thumb2: 0.4, Thumb3: 0.35,
};
const fingerCurlQuat = new THREE.Quaternion();
function curlGunGripFingers(fingers: Record<string, THREE.Object3D>, mirror: 1 | -1) {
  for (const [joint, angle] of Object.entries(FINGER_CURL_ANGLES)) {
    const bone = fingers[joint];
    if (!bone) continue;
    fingerCurlQuat.setFromAxisAngle(FINGER_CURL_AXIS, angle * mirror);
    bone.quaternion.multiply(fingerCurlQuat);
  }
}

// A point roughly at the gun's muzzle tip, in the raw (unscaled, unrotated)
// mesh's own local space — the silencer's front face, at the mesh's own
// most-negative-Z extent (see the muzzle-axis measurement above).
const MUZZLE_TIP_LOCAL = new THREE.Vector3(0, 0, -31.4);

// Blends in the real "RifleFire" mocap clip (see the merge that grafted it
// into the glb) over whatever idle/run weights updateLocomotionAnim just
// set for this frame — replaces the old hand-tuned axis-angle recoil kick
// entirely now that a real firing animation exists. `rig.fireAction` is
// reset and (re)started once, right when the shot is fired (see the fire
// trigger sites in the tick loop); this runs every tick afterward purely
// to manage the crossfade weight while it plays out. Scaling the existing
// idle/run weights down by (1 - w), rather than just setting fireAction's
// weight alongside them unscaled, keeps the three actions properly
// normalized (summing to ~1) regardless of whether the fighter happens to
// be standing still or mid-run when the shot goes off.
function applyFirePose(rig: FighterRig, t: number) {
  if (!rig.fireAction) return;
  const w =
    t < FIRE_FADE_IN
      ? t / FIRE_FADE_IN
      : t > FIRE_ANIM_DURATION - FIRE_FADE_OUT
        ? clamp((FIRE_ANIM_DURATION - t) / FIRE_FADE_OUT, 0, 1)
        : 1;
  rig.fireAction.setEffectiveWeight(w);
  if (rig.idleAction) rig.idleAction.setEffectiveWeight(rig.idleAction.getEffectiveWeight() * (1 - w));
  if (rig.runAction) rig.runAction.setEffectiveWeight(rig.runAction.getEffectiveWeight() * (1 - w));
}

// A short-lived bright line from the gun's muzzle to whatever it just hit
// (or, on a miss, straight out to GUN_RANGE) — spawned per shot and ticked
// down by updateTracers until its lifetime runs out, at which point it's
// removed and disposed.
interface Tracer {
  line: THREE.Line;
  t: number;
}

function spawnTracer(scene: THREE.Scene, gun: THREE.Object3D | null, from: THREE.Vector3, to: THREE.Vector3): Tracer {
  const start = gun ? MUZZLE_TIP_LOCAL.clone().applyMatrix4(gun.matrixWorld) : from;
  const geometry = new THREE.BufferGeometry().setFromPoints([start, to]);
  const material = new THREE.LineBasicMaterial({ color: 0xfff59d, transparent: true, opacity: 1 });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  return { line, t: 0 };
}

function updateTracers(tracers: Tracer[], dt: number) {
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tracer = tracers[i];
    tracer.t += dt;
    if (tracer.t >= TRACER_DURATION) {
      tracer.line.geometry.dispose();
      (tracer.line.material as THREE.Material).dispose();
      tracer.line.parent?.remove(tracer.line);
      tracers.splice(i, 1);
    } else {
      (tracer.line.material as THREE.LineBasicMaterial).opacity = 1 - tracer.t / TRACER_DURATION;
    }
  }
}

// The rig ships two real motion-captured clips grafted into the same
// glb — "Idle" and "Running" (same skeleton, so no retargeting needed) —
// crossfaded by weight based on current speed. This replaces the earlier
// hand-guessed sine-wave/IK locomotion entirely: the actual footwork,
// hip motion and push-off now come from real human motion capture, not
// approximated biomechanics.
//
// `runWeight` (0..1) blends Idle -> Running. `actualSpeed` (world units
// per second) drives the clip's playback rate: at RUN_REFERENCE_SPEED it
// plays at its natural, captured pace (timeScale 1); faster or slower
// movement speeds the cycle up or down to match, which is what keeps the
// feet from sliding relative to how far the root is actually travelling.
const RUN_REFERENCE_SPEED = PLAYER_MAX_SPEED;
const RUN_CLIP_MIN_TIMESCALE = 0.35;
const RUN_CLIP_MAX_TIMESCALE = 1.6;

function updateLocomotionAnim(rig: FighterRig, runWeight: number, actualSpeed: number) {
  if (!rig.idleAction || !rig.runAction) return;
  const w = clamp(runWeight, 0, 1);
  rig.idleAction.setEffectiveWeight(1 - w);
  rig.runAction.setEffectiveWeight(w);
  rig.runAction.timeScale = clamp(actualSpeed / RUN_REFERENCE_SPEED, RUN_CLIP_MIN_TIMESCALE, RUN_CLIP_MAX_TIMESCALE);
}


// A bot's movement is otherwise just "walk straight at the target" — with
// no pathfinding at all, that reads as mindless the moment a wall, crate,
// or door frame sits between it and where it's trying to go: it just
// keeps shoving into the obstacle every frame, pinned in place. This
// tracks how much ground a bot is actually covering versus how much its
// straight-line heading implies; once it's been making close to zero
// progress for a bit, it starts steering mostly sideways (around whatever
// it's stuck on) instead of straight ahead, flipping which side it tries
// if that direction turns out blocked too, and only stops steering once
// it's making real progress again.
const STUCK_AVOID_DELAY = 0.35;
const STUCK_AVOID_FLIP_DELAY = 1.1;
function moveWithAvoidance(
  rig: FighterRig,
  st: { stuckT: number; avoidSign: 1 | -1 },
  dirX: number,
  dirZ: number,
  speed: number,
  dt: number,
) {
  const beforeX = rig.root.position.x;
  const beforeZ = rig.root.position.z;
  let moveX = dirX;
  let moveZ = dirZ;
  if (st.stuckT > STUCK_AVOID_DELAY) {
    // Mostly sideways (perpendicular to the blocked heading), with a
    // little forward bias so it still drifts back on course once clear.
    moveX = -dirZ * st.avoidSign * 0.85 + dirX * 0.25;
    moveZ = dirX * st.avoidSign * 0.85 + dirZ * 0.25;
  }
  rig.root.position.x = clamp(rig.root.position.x + moveX * speed * dt, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
  rig.root.position.z = clamp(rig.root.position.z + moveZ * speed * dt, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
  resolveObstacleCollisions(rig.root.position);
  const moved = Math.hypot(rig.root.position.x - beforeX, rig.root.position.z - beforeZ);
  if (moved < speed * dt * 0.3) {
    st.stuckT += dt;
    if (st.stuckT > STUCK_AVOID_FLIP_DELAY) {
      st.avoidSign = st.avoidSign === 1 ? -1 : 1;
      st.stuckT = STUCK_AVOID_DELAY;
    }
  } else {
    st.stuckT = Math.max(0, st.stuckT - dt * 2);
  }
}

// "DeathFromBackHeadshot" is a real mocap collapse clip (retargeted from
// Mixamo, same skeleton, grafted into the glb) — its length here must
// match the merged clip's actual duration (see the merge that grafted it
// in). Root motion (the stagger/fall itself) is baked into the Hips
// bone's own keyframes, so playing the clip is enough; nothing needs to
// drive rig.root's transform by hand anymore.
const DEATH_ANIM_DURATION = 3.7;
const DEATH_FADE_DELAY = 2.7;
const DEATH_FADE_DURATION = 1.0;
const DEATH_TOTAL_DURATION = DEATH_ANIM_DURATION;

// Starts a defeated fighter's real death animation — cuts idle/run/fire
// to silence (a terminal pose doesn't need to keep blending against
// them) and plays the mocap collapse once, holding its last frame.
function startDeath(rig: FighterRig) {
  rig.idleAction?.setEffectiveWeight(0);
  rig.runAction?.setEffectiveWeight(0);
  rig.fireAction?.setEffectiveWeight(0);
  if (rig.deathAction) {
    rig.deathAction.reset();
    rig.deathAction.setEffectiveWeight(1);
    rig.deathAction.play();
  }
}

// Fades a defeated fighter out once the death animation has had time to
// land — the clip itself doesn't disappear the body, so this still
// drives material opacity by hand.
function applyDeathPose(rig: FighterRig, t: number) {
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

interface FighterRig {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  // Real motion-captured clips (same skeleton as this rig, grafted into
  // the same glb) crossfaded by weight based on current speed — replaces
  // the old hand-guessed sine/IK locomotion entirely.
  idleAction: THREE.AnimationAction | null;
  runAction: THREE.AnimationAction | null;
  // The real "RifleFire" mocap clip — reset and (re)started once per shot
  // (see the fire trigger sites in the tick loop), crossfaded against
  // idle/run every tick afterward while it plays out (see applyFirePose).
  fireAction: THREE.AnimationAction | null;
  // The real "DeathFromBackHeadshot" mocap clip — reset and (re)started
  // once a fighter's HP hits zero (see startDeath), then just left to
  // play out and hold its last frame (LoopOnce + clampWhenFinished).
  deathAction: THREE.AnimationAction | null;
  rightArm: THREE.Object3D | null;
  rightForeArm: THREE.Object3D | null;
  rightHand: THREE.Object3D | null;
  leftArm: THREE.Object3D | null;
  leftForeArm: THREE.Object3D | null;
  leftHand: THREE.Object3D | null;
  // Set once the shared gun model resolves and gets parented to RightHand
  // (see equipGun) — used to find the muzzle's current world position when
  // firing, so the tracer actually starts from the gun instead of the hand.
  gun: THREE.Object3D | null;
  // Real per-finger joints on this rig (mixamorig standard skeleton),
  // keyed by e.g. "Index1"/"Thumb2" — curled once around the grip/foregrip
  // at gun-attach time (see curlGunGripFingers) rather than every tick,
  // since the rig's baked clips never touch them.
  rightFingers: Record<string, THREE.Object3D>;
  leftFingers: Record<string, THREE.Object3D>;
  materials: THREE.MeshStandardMaterial[];
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

      // This is a standard Mixamo skeleton (mixamorig-prefixed bone
      // names), including real per-finger joints on both hands — captured
      // below so the gun's grip hand can actually curl around it (see
      // curlGunGripFingers).
      let rightArm: THREE.Object3D | null = null;
      let rightForeArm: THREE.Object3D | null = null;
      let rightHand: THREE.Object3D | null = null;
      let leftArm: THREE.Object3D | null = null;
      let leftForeArm: THREE.Object3D | null = null;
      let leftHand: THREE.Object3D | null = null;
      const rightFingers: Record<string, THREE.Object3D> = {};
      const leftFingers: Record<string, THREE.Object3D> = {};
      const materials: THREE.MeshStandardMaterial[] = [];

      model.traverse((o) => {
        if (o.name === "mixamorigRightArm") rightArm = o;
        if (o.name === "mixamorigRightForeArm") rightForeArm = o;
        if (o.name === "mixamorigRightHand") rightHand = o;
        if (o.name === "mixamorigLeftArm") leftArm = o;
        if (o.name === "mixamorigLeftForeArm") leftForeArm = o;
        if (o.name === "mixamorigLeftHand") leftHand = o;
        const rightFinger = o.name.match(/^mixamorigRightHand(Thumb|Index|Middle|Ring|Pinky)(\d)$/);
        if (rightFinger) rightFingers[`${rightFinger[1]}${rightFinger[2]}`] = o;
        const leftFinger = o.name.match(/^mixamorigLeftHand(Thumb|Index|Middle|Ring|Pinky)(\d)$/);
        if (leftFinger) leftFingers[`${leftFinger[1]}${leftFinger[2]}`] = o;
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
      let idleAction: THREE.AnimationAction | null = null;
      let runAction: THREE.AnimationAction | null = null;
      let fireAction: THREE.AnimationAction | null = null;
      let deathAction: THREE.AnimationAction | null = null;
      if (gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        // "RifleIdle" is a real two-handed rifle-holding mocap clip
        // (retargeted from Mixamo, matched against a reference screenshot)
        // — every fighter is armed on spawn, so this is the default stance
        // now, ahead of the plain "IdleBreathing" clip.
        const idleClip = gltf.animations.find((c) => c.name === "RifleIdle") ?? gltf.animations.find((c) => c.name === "IdleBreathing") ?? gltf.animations.find((c) => c.tracks.length > 0) ?? gltf.animations[0];
        idleAction = mixer.clipAction(idleClip);
        idleAction.play();
        // "RifleRun" (retargeted from Mixamo) is preferred over the plain
        // "Running" clip's normal arm swing, to match the RifleIdle stance
        // above.
        const runClip = gltf.animations.find((c) => c.name === "RifleRun") ?? gltf.animations.find((c) => c.name === "Running");
        if (runClip) {
          runAction = mixer.clipAction(runClip);
          runAction.play();
          runAction.setEffectiveWeight(0);
        }
        // "RifleFire" is a real firing/recoil mocap clip — played once per
        // shot (LoopOnce + clampWhenFinished, so it holds its last frame
        // rather than looping), crossfaded in over idle/run by
        // applyFirePose. Kept at weight 0 and already playing here so the
        // mixer has it bound and ready; each shot just resets its time
        // back to 0 (see the fire trigger sites in the tick loop) rather
        // than creating a new action.
        const fireClip = gltf.animations.find((c) => c.name === "RifleFire");
        if (fireClip) {
          fireAction = mixer.clipAction(fireClip);
          fireAction.setLoop(THREE.LoopOnce, 1);
          fireAction.clampWhenFinished = true;
          fireAction.play();
          fireAction.setEffectiveWeight(0);
        }
        // "DeathFromBackHeadshot" — a real mocap collapse, played once on
        // death (LoopOnce + clampWhenFinished) and left holding its last
        // frame (see startDeath).
        const deathClip = gltf.animations.find((c) => c.name === "DeathFromBackHeadshot");
        if (deathClip) {
          deathAction = mixer.clipAction(deathClip);
          deathAction.setLoop(THREE.LoopOnce, 1);
          deathAction.clampWhenFinished = true;
          deathAction.play();
          deathAction.setEffectiveWeight(0);
        }
      }

      onLoaded({ root, mixer, idleAction, runAction, fireAction, deathAction, rightArm, rightForeArm, rightHand, leftArm, leftForeArm, leftHand, gun: null, rightFingers, leftFingers, materials });
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
  // Manual sprint toggle: tapping RUN forces full sprint on regardless of
  // how far the joystick is pushed, instead of requiring it held near max.
  const runToggled = useRef(false);
  const [runActive, setRunActive] = useState(false);
  const joystickTouchId = useRef<number | null>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  // One floating "?" mark per guard bot (bot1..bot5), screen-projected and
  // positioned directly via ref each tick (same reasoning as the joystick
  // knob above) — shown for the brief alert telegraph right before a
  // dormant guard wakes up and starts chasing.
  const alertRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null]);
  // Per-enemy floating health bar, positioned directly via ref each tick
  // the same way (screen-projected from that fighter's 3D head position)
  // instead of the old fixed corner list — index 5 is the Boss. The fill
  // width still comes from botHps/React state (only changes on a hit, not
  // every frame), just the position is imperative.
  const hpBarRefs = useRef<(HTMLDivElement | null)[]>([null, null, null, null, null, null]);
  // Free-look: dragging anywhere on the arena view (outside the joystick/
  // buttons) orbits the camera around the player, independent of movement.
  // Horizontal drag turns cameraYaw; vertical drag adds to cameraPitch,
  // which orbits the camera up/down around the player on top of its
  // default over-the-shoulder angle (see CAM_PITCH_MIN/MAX below).
  const cameraYaw = useRef(Math.PI);
  const cameraPitch = useRef(0);
  const lookTouchId = useRef<number | null>(null);
  const lookLastX = useRef(0);
  const lookLastY = useRef(0);

  const [playerHp, setPlayerHp] = useState(100);
  const [botHps, setBotHps] = useState<number[]>([100, 100, 100, 100, 100, 100]);
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
    // A sky sphere plus matching fog — without these the canvas has no
    // background at all (it's alpha-transparent over the page's near-black
    // CSS gradient), which reads as floating in open space with the ground
    // just cutting off into a void, rather than standing outdoors under a
    // sky that wraps all the way around.
    const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 24, 16);
    const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: createSkyTexture(), side: THREE.BackSide, fog: false }));
    scene.add(sky);
    scene.fog = new THREE.Fog(0x2f5678, FOG_NEAR, FOG_FAR);
    // Third-person chase camera (Free Fire / PUBG Mobile style): positioned
    // behind and above the player, following their facing direction, rather
    // than a fixed top-down view.
    // Close, tight framing (Free Fire / PUBG Mobile style) instead of a
    // distant, wide-angle view — camera sits just behind the shoulder and
    // a narrower FOV keeps the character filling most of the screen
    // height rather than looking small and far away.
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, CAMERA_FAR);
    const CAM_DISTANCE = 2.1;
    const CAM_HEIGHT = 1.55;
    const CAM_LOOK_HEIGHT = 1.25;
    const CAM_DAMP_RATE = 7; // per-second follow damping, frame-rate independent
    // The camera orbits the look-at point on a sphere of this radius —
    // derived from the original fixed CAM_DISTANCE/CAM_HEIGHT so pitch 0
    // (no vertical drag yet) reproduces the exact same default view as
    // before, with up/down drag then orbiting away from that angle.
    const CAM_ORBIT_RADIUS = Math.hypot(CAM_DISTANCE, CAM_HEIGHT - CAM_LOOK_HEIGHT);
    const CAM_BASE_PITCH = Math.atan2(CAM_HEIGHT - CAM_LOOK_HEIGHT, CAM_DISTANCE);
    const CAM_PITCH_MIN = -0.15; // near-level, looking slightly down at most
    const CAM_PITCH_MAX = 1.3; // steep overhead angle, short of straight down
    camera.position.set(0, CAM_HEIGHT, CAM_DISTANCE + 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x0a0e18, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(3, 6, 4);
    scene.add(key);

    // A real hole cut through the main floor at each house's stairwell
    // (not just a decal on top of a solid floor) — otherwise standing at
    // the hole and looking down would still hit this solid ground plane
    // a few units below the room's own floor, instead of actually seeing
    // down into the tunnel.
    const groundShape = new THREE.Shape();
    groundShape.moveTo(-ARENA_HALF, -ARENA_HALF);
    groundShape.lineTo(ARENA_HALF, -ARENA_HALF);
    groundShape.lineTo(ARENA_HALF, ARENA_HALF);
    groundShape.lineTo(-ARENA_HALF, ARENA_HALF);
    groundShape.lineTo(-ARENA_HALF, -ARENA_HALF);
    for (let i = 0; i < ROOM_STAIRS_DOWN_POS.length; i++) {
      // Shape-local Y maps to world -Z after the rotateX(-PI/2) below
      // (rotateX(θ) sends (x,y,z) to (x, z, -y) at θ=-90°), so world Z
      // needs to be negated to land the hole at its actual world
      // position — hence -c.z below for every corner.
      const { nearA, nearB, farA, farB } = stairFootprintCorners(i);
      const hole = new THREE.Path();
      hole.moveTo(nearA.x, -nearA.z);
      hole.lineTo(farA.x, -farA.z);
      hole.lineTo(farB.x, -farB.z);
      hole.lineTo(nearB.x, -nearB.z);
      hole.lineTo(nearA.x, -nearA.z);
      groundShape.holes.push(hole);
    }
    const groundGeo = new THREE.ShapeGeometry(groundShape);
    groundGeo.rotateX(-Math.PI / 2);
    const ground = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({ map: createFloorTexture(FLOOR_REPEAT, renderer.capabilities.getMaxAnisotropy()), roughness: 0.6, metalness: 0.35 }),
    );
    scene.add(ground);
    scene.add(new THREE.GridHelper(ARENA_HALF * 2, GRID_DIVISIONS, 0x6be2ff, 0x1c4560));

    // Sci-fi outpost room — the wall segments exactly match the OBSTACLES
    // rects above (built straight from that array, so visuals and
    // collision can never drift apart), plus crates, a floor grate, a
    // hazard-stripe decal and a wall screen for detail.
    const roomWallMat = new THREE.MeshStandardMaterial({ color: 0x2a323c, roughness: 0.55, metalness: 0.4 });
    const roomEdgeMat = new THREE.LineBasicMaterial({ color: 0x6be2ff });
    const doorGlowMat = new THREE.MeshStandardMaterial({ color: 0xff3355, emissive: 0xff3355, emissiveIntensity: 1.4, roughness: 0.4 });
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.7, metalness: 0.3 });
    const crateEdgeMat = new THREE.LineBasicMaterial({ color: 0x6be2ff });
    const crateAccentMat = new THREE.MeshStandardMaterial({ color: 0xd8402c, emissive: 0xd8402c, emissiveIntensity: 0.5, roughness: 0.5 });
    const hazardMat = new THREE.MeshStandardMaterial({ map: createHazardStripeTexture(), roughness: 0.8 });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, emissive: 0x6be2ff, emissiveIntensity: 0.9, roughness: 0.3 });
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x232a32, roughness: 0.6, metalness: 0.35, side: THREE.DoubleSide });
    const lightStripMat = new THREE.MeshStandardMaterial({ color: 0x6be2ff, emissive: 0x6be2ff, emissiveIntensity: 1.2, roughness: 0.3 });

    // Builds one full sci-fi outpost room (walls, door glows, crates, floor
    // grate, hazard stripe, wall screen, ceiling) at the given position —
    // called once per entry in ROOM_POSITIONS so every room stays visually
    // and structurally identical.
    const buildRoom = (pos: { x: number; z: number }) => {
      for (const ob of roomWallObstacles(pos)) {
        const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, ROOM_WALL_HEIGHT, ob.halfZ * 2), roomWallMat);
        wallMesh.position.set(ob.x, ROOM_WALL_HEIGHT / 2, ob.z);
        scene.add(wallMesh);
        const wallEdges = new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), roomEdgeMat);
        wallMesh.add(wallEdges);
      }

      // Glowing red door-frame lintel over each of the 4 openings.
      const addDoorGlow = (x: number, z: number, sizeX: number, sizeZ: number) => {
        const glow = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.15, sizeZ), doorGlowMat);
        glow.position.set(x, ROOM_WALL_HEIGHT - 0.3, z);
        scene.add(glow);
      };
      addDoorGlow(pos.x, pos.z - ROOM_SIZE / 2, ROOM_DOOR_WIDTH, ROOM_WALL_THICKNESS + 0.05); // north (entrance)
      addDoorGlow(pos.x, pos.z + ROOM_SIZE / 2, ROOM_DOOR_WIDTH, ROOM_WALL_THICKNESS + 0.05); // south (exit)
      addDoorGlow(pos.x - ROOM_SIZE / 2, pos.z, ROOM_WALL_THICKNESS + 0.05, ROOM_DOOR_WIDTH); // west (exit)
      addDoorGlow(pos.x + ROOM_SIZE / 2, pos.z, ROOM_WALL_THICKNESS + 0.05, ROOM_DOOR_WIDTH); // east (exit)

      // A few storage crates with a cross-braced accent on their front face.
      const addCrate = (x: number, z: number, width: number, depth: number, height: number, rotY: number) => {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), crateMat);
        crate.position.set(x, height / 2, z);
        crate.rotation.y = rotY;
        scene.add(crate);
        crate.add(new THREE.LineSegments(new THREE.EdgesGeometry(crate.geometry), crateEdgeMat));
        const diagLen = Math.hypot(width, height) * 1.02;
        const diagAngle = Math.atan2(height, width);
        const braceA = new THREE.Mesh(new THREE.BoxGeometry(diagLen, height * 0.12, 0.06), crateAccentMat);
        braceA.rotation.z = diagAngle;
        braceA.position.set(0, 0, depth / 2 + 0.03);
        const braceB = new THREE.Mesh(new THREE.BoxGeometry(diagLen, height * 0.12, 0.06), crateAccentMat);
        braceB.rotation.z = -diagAngle;
        braceB.position.set(0, 0, depth / 2 + 0.03);
        crate.add(braceA, braceB);
      };
      addCrate(pos.x - 2.5, pos.z - 2.5, 1, 2, 1.5, 0.3);
      addCrate(pos.x + 2.75, pos.z - 2, 1, 2, 1.5, -0.4);
      addCrate(pos.x + 2, pos.z + 2.75, 1, 2, 1.5, 0.8);

      // No floor decal at the room's exact center anymore — that's now the
      // tunnel-hole's spot (see addFloorHole), and a separate decal there
      // z-fought with it, reading as a flickering, jagged edge.

      // Hazard-stripe floor decal at the entrance threshold.
      const hazard = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_DOOR_WIDTH, 2), hazardMat);
      hazard.rotation.x = -Math.PI / 2;
      hazard.position.set(pos.x, 0.015, pos.z - ROOM_SIZE / 2 + 1);
      scene.add(hazard);

      // A glowing wall screen mounted on the interior face of the south wall.
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), screenMat);
      screen.position.set(pos.x - ROOM_SEG_OFFSET, ROOM_WALL_HEIGHT * 0.52, pos.z + ROOM_SIZE / 2 - ROOM_WALL_THICKNESS / 2 - 0.02);
      screen.rotation.y = Math.PI;
      scene.add(screen);

      // Ceiling slab sealing the room, with embedded cyan light-strip panels
      // matching the reference image's overhead detailing.
      const ceiling = new THREE.Mesh(new THREE.BoxGeometry(ROOM_SIZE, ROOM_WALL_THICKNESS, ROOM_SIZE), ceilingMat);
      ceiling.position.set(pos.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, pos.z);
      scene.add(ceiling);
      ceiling.add(new THREE.LineSegments(new THREE.EdgesGeometry(ceiling.geometry), roomEdgeMat));

      const addCeilingStrip = (x: number, z: number, sizeX: number, sizeZ: number) => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.08, sizeZ), lightStripMat);
        strip.position.set(x, ROOM_WALL_HEIGHT - 0.06, z);
        scene.add(strip);
      };
      addCeilingStrip(pos.x, pos.z - 2.5, 1.5, 0.3);
      addCeilingStrip(pos.x, pos.z, 1.5, 0.3);
      addCeilingStrip(pos.x, pos.z + 2.5, 1.5, 0.3);
    };

    for (const pos of ROOM_POSITIONS) {
      buildRoom(pos);
    }

    // A real, walkable staircase down through each house's own center to
    // the tunnel below (see ROOM_STAIRS_DOWN_POS/RAMP_RUN_LENGTH and the
    // tick loop's continuous height-follow) — a long run of real steps,
    // not a single square hole, spanning the full drop from the house
    // floor (y=0) all the way to the tunnel's actual floor (TUNNEL_Y), so
    // walking down it is a gradual descent you can stop partway through,
    // not a jump into a pit.
    const holeRimMat = new THREE.MeshStandardMaterial({ color: 0x6be2ff, emissive: 0x6be2ff, emissiveIntensity: 1.2, roughness: 0.3, side: THREE.DoubleSide });
    const holeShaftMat = new THREE.MeshStandardMaterial({ color: 0x0a0e12, roughness: 0.9, side: THREE.DoubleSide });
    // Bright enough (and lightly self-lit) to actually read as steps
    // against the shaft's dark walls — the darker gray used everywhere
    // else in the level disappeared completely into the shadow down
    // there with no direct light reaching it.
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x8a929c, emissive: 0x2a3138, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0.3 });
    const stairEdgeMat = new THREE.LineBasicMaterial({ color: 0xff9a4a });
    // Every stair element below is built in the stairway's own local
    // "along" (distance from the house center, in the direction it
    // descends — see ROOM_TUNNEL_DIR) / "perp" (distance off to the
    // side) axes, then converted to world X/Z here. Since every
    // ROOM_TUNNEL_DIR entry is axis-aligned, the along/perp axes are
    // always some (possibly swapped) combination of world X/Z, which is
    // all stairBoxSize is doing — no rotation needed.
    function stairWorldPos(x: number, z: number, dirX: number, dirZ: number, along: number, perp: number) {
      const perpX = -dirZ;
      const perpZ = dirX;
      return { x: x + dirX * along + perpX * perp, z: z + dirZ * along + perpZ * perp };
    }
    function stairBoxSize(dirX: number, dirZ: number, alongLen: number, widthLen: number) {
      return {
        sizeX: alongLen * Math.abs(dirX) + widthLen * Math.abs(dirZ),
        sizeZ: alongLen * Math.abs(dirZ) + widthLen * Math.abs(dirX),
      };
    }
    // A hollow frame (four border strips), not a solid plane — a solid
    // glowing rectangle here would just paper over the stairs inside it
    // instead of framing the opening around them.
    function addFloorHoleRim(x: number, y: number, z: number, dirX: number, dirZ: number) {
      const border = HOLE_HALF_SIZE - HOLE_INNER_SIZE / 2;
      const width = RAMP_HALF_WIDTH * 2;
      const addStrip = (along: number, perp: number, alongLen: number, widthLen: number) => {
        const pos = stairWorldPos(x, z, dirX, dirZ, along, perp);
        const { sizeX, sizeZ } = stairBoxSize(dirX, dirZ, alongLen, widthLen);
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(sizeX, sizeZ), holeRimMat);
        strip.rotation.x = -Math.PI / 2;
        strip.position.set(pos.x, y + 0.015, pos.z);
        scene.add(strip);
      };
      addStrip(RAMP_RUN_LENGTH / 2, -(RAMP_HALF_WIDTH + border / 2), RAMP_RUN_LENGTH + border * 2, border);
      addStrip(RAMP_RUN_LENGTH / 2, RAMP_HALF_WIDTH + border / 2, RAMP_RUN_LENGTH + border * 2, border);
      addStrip(-border / 2, 0, border, width);
      addStrip(RAMP_RUN_LENGTH + border / 2, 0, border, width);
    }
    // The pit's side walls and near-end cap, between a house's floor and
    // the tunnel ceiling below it — the far end is left open, since that
    // end just opens straight into the tunnel corridor's own space.
    function addHoleShaft(x: number, z: number, topY: number, bottomY: number, dirX: number, dirZ: number) {
      const height = topY - bottomY;
      const midY = (topY + bottomY) / 2;
      const width = RAMP_HALF_WIDTH * 2;
      const addWall = (along: number, perp: number, alongLen: number, widthLen: number) => {
        const pos = stairWorldPos(x, z, dirX, dirZ, along, perp);
        const { sizeX, sizeZ } = stairBoxSize(dirX, dirZ, alongLen, widthLen);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(sizeX, height, sizeZ), holeShaftMat);
        wall.position.set(pos.x, midY, pos.z);
        scene.add(wall);
      };
      addWall(RAMP_RUN_LENGTH / 2, -RAMP_HALF_WIDTH, RAMP_RUN_LENGTH, 0.05);
      addWall(RAMP_RUN_LENGTH / 2, RAMP_HALF_WIDTH, RAMP_RUN_LENGTH, 0.05);
      addWall(0, 0, 0.05, width);
    }
    // Real steps filling the stairway's exact footprint (RAMP_HALF_WIDTH
    // wide) and full height (topY to bottomY), descending along (dirX,
    // dirZ) — the direction that house's tunnel connection actually runs
    // (see ROOM_TUNNEL_DIR) — so it reads as one natural staircase
    // leading all the way down into the tunnel floor.
    function addStairsInHole(x: number, z: number, topY: number, bottomY: number, dirX: number, dirZ: number) {
      const steps = 14;
      const stepHeight = (topY - bottomY) / steps;
      const stepDepth = RAMP_RUN_LENGTH / steps;
      const width = RAMP_HALF_WIDTH * 2;
      for (let i = 0; i < steps; i++) {
        const stepCenterY = topY - stepHeight * (i + 0.5);
        const along = stepDepth * (i + 0.5);
        const pos = stairWorldPos(x, z, dirX, dirZ, along, 0);
        const { sizeX, sizeZ } = stairBoxSize(dirX, dirZ, stepDepth, width);
        const step = new THREE.Mesh(new THREE.BoxGeometry(sizeX, stepHeight, sizeZ), stairMat);
        step.position.set(pos.x, stepCenterY, pos.z);
        step.add(new THREE.LineSegments(new THREE.EdgesGeometry(step.geometry), stairEdgeMat));
        scene.add(step);
      }
    }
    // One stairway down through each house's own center, its matching rim
    // up at that same spot underground (in the ceiling there), the pit
    // walls between the two, and the real steps filling the whole run
    // down to the tunnel floor.
    for (let i = 0; i < ROOM_STAIRS_DOWN_POS.length; i++) {
      const tunnelCeilingY = TUNNEL_Y + TUNNEL_WALL_HEIGHT;
      const dir = ROOM_TUNNEL_DIR[i];
      addFloorHoleRim(ROOM_STAIRS_DOWN_POS[i].x, 0, ROOM_STAIRS_DOWN_POS[i].z, dir.x, dir.z);
      addFloorHoleRim(TUNNEL_STOPS[i].x, tunnelCeilingY, TUNNEL_STOPS[i].z, dir.x, dir.z);
      addHoleShaft(ROOM_STAIRS_DOWN_POS[i].x, ROOM_STAIRS_DOWN_POS[i].z, 0, tunnelCeilingY, dir.x, dir.z);
      addStairsInHole(ROOM_STAIRS_DOWN_POS[i].x, ROOM_STAIRS_DOWN_POS[i].z, 0, TUNNEL_Y, dir.x, dir.z);
      // Nothing else reaches down into the shaft otherwise (it sits
      // below the room's own ambient light and above the tunnel's floor
      // strip), which is exactly why the stairs were reading as a flat
      // black pit — these light the run from inside the stairwell
      // itself, one near the top and one near the tunnel floor since the
      // full run is too long now for a single point light to reach.
      const topLight = new THREE.PointLight(0x9fd8ff, 1.3, RAMP_RUN_LENGTH, 2);
      topLight.position.set(
        ROOM_STAIRS_DOWN_POS[i].x + dir.x * (RAMP_RUN_LENGTH * 0.2),
        -0.6,
        ROOM_STAIRS_DOWN_POS[i].z + dir.z * (RAMP_RUN_LENGTH * 0.2),
      );
      scene.add(topLight);
      const bottomLight = new THREE.PointLight(0x9fd8ff, 1.3, RAMP_RUN_LENGTH, 2);
      bottomLight.position.set(
        ROOM_STAIRS_DOWN_POS[i].x + dir.x * (RAMP_RUN_LENGTH * 0.8),
        TUNNEL_Y + 0.8,
        ROOM_STAIRS_DOWN_POS[i].z + dir.z * (RAMP_RUN_LENGTH * 0.8),
      );
      scene.add(bottomLight);
    }

    // The tunnel itself — every wall in the level, mirrored at TUNNEL_Y
    // (see the comment above ROOM_STAIRS_DOWN_POS for why this makes the
    // underground layer automatically follow the exact same walkable
    // route as the surface, no separate collision needed), plus a floor
    // and ceiling slab spanning the whole thing.
    const mirrorWallsUnderground = (obstacles: Obstacle[]) => {
      for (const ob of obstacles) {
        const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, TUNNEL_WALL_HEIGHT, ob.halfZ * 2), roomWallMat);
        wallMesh.position.set(ob.x, TUNNEL_Y + TUNNEL_WALL_HEIGHT / 2, ob.z);
        scene.add(wallMesh);
        wallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), roomEdgeMat));
      }
    };
    mirrorWallsUnderground(ROOM_POSITIONS.flatMap(roomWallObstacles));
    mirrorWallsUnderground(MIDROOM_WALLS);
    mirrorWallsUnderground(CORRIDOR_WALLS);
    mirrorWallsUnderground(CORRIDOR2_WALLS);
    mirrorWallsUnderground(CORRIDOR3_WALLS);
    mirrorWallsUnderground(CORRIDOR4_WALLS);
    mirrorWallsUnderground(CORRIDOR5_WALLS);
    mirrorWallsUnderground(ROOM6_WALLS);
    const undergroundWidth = UNDERGROUND_MAX_X - UNDERGROUND_MIN_X;
    const undergroundDepth = UNDERGROUND_MAX_Z - UNDERGROUND_MIN_Z;
    const undergroundCenterX = (UNDERGROUND_MIN_X + UNDERGROUND_MAX_X) / 2;
    const undergroundCenterZ = (UNDERGROUND_MIN_Z + UNDERGROUND_MAX_Z) / 2;
    const undergroundFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(undergroundWidth, undergroundDepth),
      new THREE.MeshStandardMaterial({ map: createFloorTexture(8, renderer.capabilities.getMaxAnisotropy()), roughness: 0.7, metalness: 0.25 }),
    );
    undergroundFloor.rotation.x = -Math.PI / 2;
    undergroundFloor.position.set(undergroundCenterX, TUNNEL_Y, undergroundCenterZ);
    scene.add(undergroundFloor);
    // A real hole cut through the ceiling slab at each house's stop (not
    // just a decal sitting on top of a solid slab) — otherwise standing
    // at the hole up on the surface, the view straight down would hit
    // this solid ceiling a few units below instead of actually seeing
    // into the tunnel.
    const ceilingShape = new THREE.Shape();
    const halfW = undergroundWidth / 2;
    const halfD = undergroundDepth / 2;
    ceilingShape.moveTo(-halfW, -halfD);
    ceilingShape.lineTo(halfW, -halfD);
    ceilingShape.lineTo(halfW, halfD);
    ceilingShape.lineTo(-halfW, halfD);
    ceilingShape.lineTo(-halfW, -halfD);
    for (let i = 0; i < TUNNEL_STOPS.length; i++) {
      // The shape's local Y axis ends up mapped to world -Z after the
      // rotateX(-PI/2) below (rotateX(θ) sends (x,y,z) to (x, z, -y) at
      // θ=-90°), so world Z needs to be negated to land the hole at its
      // actual world position instead of its mirror image — hence
      // -(c.z - undergroundCenterZ) below for every corner.
      const { nearA, nearB, farA, farB } = stairFootprintCorners(i);
      const toLocal = (c: { x: number; z: number }) => ({ x: c.x - undergroundCenterX, z: -(c.z - undergroundCenterZ) });
      const a = toLocal(nearA);
      const b = toLocal(farA);
      const c = toLocal(farB);
      const d = toLocal(nearB);
      const hole = new THREE.Path();
      hole.moveTo(a.x, a.z);
      hole.lineTo(b.x, b.z);
      hole.lineTo(c.x, c.z);
      hole.lineTo(d.x, d.z);
      hole.lineTo(a.x, a.z);
      ceilingShape.holes.push(hole);
    }
    const ceilingGeo = new THREE.ExtrudeGeometry(ceilingShape, { depth: ROOM_WALL_THICKNESS, bevelEnabled: false });
    ceilingGeo.rotateX(-Math.PI / 2);
    const undergroundCeiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    undergroundCeiling.position.set(undergroundCenterX, TUNNEL_Y + TUNNEL_WALL_HEIGHT, undergroundCenterZ);
    scene.add(undergroundCeiling);
    // A light strip over each house's own stop, so the tunnel doesn't
    // read as one featureless dark space.
    for (const stop of TUNNEL_STOPS) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), lightStripMat);
      strip.position.set(stop.x, TUNNEL_Y + TUNNEL_WALL_HEIGHT - 0.06, stop.z);
      scene.add(strip);
    }

    // Covered corridor joining the two rooms' facing doors — same wall/
    // ceiling materials as the rooms so it reads as one connected structure.
    // Built in two segments since MIDROOM sits in the middle of it.
    for (const ob of CORRIDOR_WALLS) {
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, ROOM_WALL_HEIGHT, ob.halfZ * 2), roomWallMat);
      wallMesh.position.set(ob.x, ROOM_WALL_HEIGHT / 2, ob.z);
      scene.add(wallMesh);
      wallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), roomEdgeMat));
    }
    const addCorridorStrip = (z: number) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), lightStripMat);
      strip.position.set(ROOM_POS.x, ROOM_WALL_HEIGHT - 0.06, z);
      scene.add(strip);
    };
    for (const seg of CORRIDOR_SEGMENTS) {
      const segCeiling = new THREE.Mesh(
        new THREE.BoxGeometry(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, ROOM_WALL_THICKNESS, seg.length),
        ceilingMat,
      );
      segCeiling.position.set(ROOM_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, seg.centerZ);
      scene.add(segCeiling);
      segCeiling.add(new THREE.LineSegments(new THREE.EdgesGeometry(segCeiling.geometry), roomEdgeMat));
      addCorridorStrip(seg.centerZ - seg.length / 4);
      addCorridorStrip(seg.centerZ + seg.length / 4);
    }

    // MIDROOM — a small single-door outpost built into the middle of the
    // corridor (see MIDROOM_WALLS above for its wall layout).
    for (const ob of MIDROOM_WALLS) {
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, ROOM_WALL_HEIGHT, ob.halfZ * 2), roomWallMat);
      wallMesh.position.set(ob.x, ROOM_WALL_HEIGHT / 2, ob.z);
      scene.add(wallMesh);
      wallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), roomEdgeMat));
    }
    const midDoorGlowSouth = new THREE.Mesh(new THREE.BoxGeometry(MIDROOM_DOOR_WIDTH, 0.15, ROOM_WALL_THICKNESS + 0.05), doorGlowMat);
    midDoorGlowSouth.position.set(MIDROOM_POS.x, ROOM_WALL_HEIGHT - 0.3, MIDROOM_SOUTH_Z);
    scene.add(midDoorGlowSouth);
    const midDoorGlowNorth = new THREE.Mesh(new THREE.BoxGeometry(MIDROOM_DOOR_WIDTH, 0.15, ROOM_WALL_THICKNESS + 0.05), doorGlowMat);
    midDoorGlowNorth.position.set(MIDROOM_POS.x, ROOM_WALL_HEIGHT - 0.3, MIDROOM_NORTH_Z);
    scene.add(midDoorGlowNorth);
    const midCeiling = new THREE.Mesh(new THREE.BoxGeometry(MIDROOM_SIZE, ROOM_WALL_THICKNESS, MIDROOM_SIZE), ceilingMat);
    midCeiling.position.set(MIDROOM_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, MIDROOM_POS.z);
    scene.add(midCeiling);
    midCeiling.add(new THREE.LineSegments(new THREE.EdgesGeometry(midCeiling.geometry), roomEdgeMat));

    // Second corridor — a plain walled/roofed passage (no mid-house) joining
    // ROOM2_POS to ROOM3_POS.
    for (const ob of CORRIDOR2_WALLS) {
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, ROOM_WALL_HEIGHT, ob.halfZ * 2), roomWallMat);
      wallMesh.position.set(ob.x, ROOM_WALL_HEIGHT / 2, ob.z);
      scene.add(wallMesh);
      wallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), roomEdgeMat));
    }
    const corridor2Ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, ROOM_WALL_THICKNESS, CORRIDOR2_LENGTH),
      ceilingMat,
    );
    corridor2Ceiling.position.set(ROOM_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, CORRIDOR2_CENTER_Z);
    scene.add(corridor2Ceiling);
    corridor2Ceiling.add(new THREE.LineSegments(new THREE.EdgesGeometry(corridor2Ceiling.geometry), roomEdgeMat));
    addCorridorStrip(CORRIDOR2_CENTER_Z - CORRIDOR2_LENGTH / 4);
    addCorridorStrip(CORRIDOR2_CENTER_Z + CORRIDOR2_LENGTH / 4);

    // Third corridor — runs east-west, joining ROOM3_POS to ROOM4_POS which
    // branches off to the side instead of continuing the main line.
    for (const ob of CORRIDOR3_WALLS) {
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, ROOM_WALL_HEIGHT, ob.halfZ * 2), roomWallMat);
      wallMesh.position.set(ob.x, ROOM_WALL_HEIGHT / 2, ob.z);
      scene.add(wallMesh);
      wallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), roomEdgeMat));
    }
    const corridor3Ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR3_LENGTH, ROOM_WALL_THICKNESS, CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2),
      ceilingMat,
    );
    corridor3Ceiling.position.set(CORRIDOR3_CENTER_X, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, ROOM3_POS.z);
    scene.add(corridor3Ceiling);
    corridor3Ceiling.add(new THREE.LineSegments(new THREE.EdgesGeometry(corridor3Ceiling.geometry), roomEdgeMat));
    const addCorridor3Strip = (x: number) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 1.5), lightStripMat);
      strip.position.set(x, ROOM_WALL_HEIGHT - 0.06, ROOM3_POS.z);
      scene.add(strip);
    };
    addCorridor3Strip(CORRIDOR3_CENTER_X - CORRIDOR3_LENGTH / 4);
    addCorridor3Strip(CORRIDOR3_CENTER_X + CORRIDOR3_LENGTH / 4);

    // Fourth corridor — north-south again, joining ROOM4_POS to ROOM5_POS.
    for (const ob of CORRIDOR4_WALLS) {
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, ROOM_WALL_HEIGHT, ob.halfZ * 2), roomWallMat);
      wallMesh.position.set(ob.x, ROOM_WALL_HEIGHT / 2, ob.z);
      scene.add(wallMesh);
      wallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), roomEdgeMat));
    }
    const corridor4Ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, ROOM_WALL_THICKNESS, CORRIDOR4_LENGTH),
      ceilingMat,
    );
    corridor4Ceiling.position.set(ROOM4_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, CORRIDOR4_CENTER_Z);
    scene.add(corridor4Ceiling);
    corridor4Ceiling.add(new THREE.LineSegments(new THREE.EdgesGeometry(corridor4Ceiling.geometry), roomEdgeMat));
    const addCorridor4Strip = (z: number) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), lightStripMat);
      strip.position.set(ROOM4_POS.x, ROOM_WALL_HEIGHT - 0.06, z);
      scene.add(strip);
    };
    addCorridor4Strip(CORRIDOR4_CENTER_Z - CORRIDOR4_LENGTH / 4);
    addCorridor4Strip(CORRIDOR4_CENTER_Z + CORRIDOR4_LENGTH / 4);

    // Fifth corridor — joins ROOM5_POS to the larger ROOM6_POS ahead of it.
    for (const ob of CORRIDOR5_WALLS) {
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, ROOM_WALL_HEIGHT, ob.halfZ * 2), roomWallMat);
      wallMesh.position.set(ob.x, ROOM_WALL_HEIGHT / 2, ob.z);
      scene.add(wallMesh);
      wallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), roomEdgeMat));
    }
    const corridor5Ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(CORRIDOR_WIDTH + ROOM_WALL_THICKNESS * 2, ROOM_WALL_THICKNESS, CORRIDOR5_LENGTH),
      ceilingMat,
    );
    corridor5Ceiling.position.set(ROOM5_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, CORRIDOR5_CENTER_Z);
    scene.add(corridor5Ceiling);
    corridor5Ceiling.add(new THREE.LineSegments(new THREE.EdgesGeometry(corridor5Ceiling.geometry), roomEdgeMat));
    const addCorridor5Strip = (z: number) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), lightStripMat);
      strip.position.set(ROOM5_POS.x, ROOM_WALL_HEIGHT - 0.06, z);
      scene.add(strip);
    };
    addCorridor5Strip(CORRIDOR5_CENTER_Z - CORRIDOR5_LENGTH / 4);
    addCorridor5Strip(CORRIDOR5_CENTER_Z + CORRIDOR5_LENGTH / 4);

    // ROOM6 — the larger 40x30 room, built from ROOM6_WALLS directly (not
    // buildRoom(), since it isn't square) plus door glows on all 4 sides
    // and a matching ceiling.
    for (const ob of ROOM6_WALLS) {
      const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(ob.halfX * 2, ROOM_WALL_HEIGHT, ob.halfZ * 2), roomWallMat);
      wallMesh.position.set(ob.x, ROOM_WALL_HEIGHT / 2, ob.z);
      scene.add(wallMesh);
      wallMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(wallMesh.geometry), roomEdgeMat));
    }
    const addRoom6DoorGlow = (x: number, z: number, sizeX: number, sizeZ: number) => {
      const glow = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.15, sizeZ), doorGlowMat);
      glow.position.set(x, ROOM_WALL_HEIGHT - 0.3, z);
      scene.add(glow);
    };
    addRoom6DoorGlow(ROOM6_POS.x, ROOM6_POS.z + ROOM6_DEPTH / 2, ROOM6_DOOR_WIDTH, ROOM_WALL_THICKNESS + 0.05); // south — the only remaining door
    const room6Ceiling = new THREE.Mesh(new THREE.BoxGeometry(ROOM6_WIDTH, ROOM_WALL_THICKNESS, ROOM6_DEPTH), ceilingMat);
    room6Ceiling.position.set(ROOM6_POS.x, ROOM_WALL_HEIGHT + ROOM_WALL_THICKNESS / 2, ROOM6_POS.z);
    scene.add(room6Ceiling);
    room6Ceiling.add(new THREE.LineSegments(new THREE.EdgesGeometry(room6Ceiling.geometry), roomEdgeMat));

    // Path arrows — a glowing marker flat on the floor right at each gate
    // along the route to the Boss, pointing which way to walk through it.
    // Unlike a HUD compass, this sits in the world at ground level exactly
    // where the player needs it, gate by gate, all the way to Room 6.
    const pathArrowMat = new THREE.MeshStandardMaterial({
      color: 0xffd23f,
      emissive: 0xffd23f,
      emissiveIntensity: 1.6,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    for (const gate of PATH_GATES) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 1.4, -0.7, 0, -0.7, 0.7, 0, -0.7], 3),
      );
      geo.computeVertexNormals();
      const arrow = new THREE.Mesh(geo, pathArrowMat);
      arrow.position.set(gate.x, 0.03, gate.z);
      arrow.rotation.y = Math.atan2(gate.dirX, gate.dirZ);
      scene.add(arrow);
    }

    // Simple crate visuals matching EXTRA_CRATES above (one per corridor and
    // midroom, three scattered through the much bigger ROOM6).
    for (const ob of EXTRA_CRATES) {
      const size = ob.halfX * 2;
      const crate = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), crateMat);
      crate.position.set(ob.x, size / 2, ob.z);
      scene.add(crate);
      crate.add(new THREE.LineSegments(new THREE.EdgesGeometry(crate.geometry), crateEdgeMat));
    }

    // Sliding gates — one pair of panels per door, closed by default and
    // sliding apart automatically as the player gets close (see the gate
    // update loop further down, in the per-frame tick).
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x30383f, roughness: 0.5, metalness: 0.5 });
    const gateEdgeMat = new THREE.LineBasicMaterial({ color: 0x6be2ff });
    const GATE_PANEL_HEIGHT = ROOM_WALL_HEIGHT - 0.4;
    const GATE_THICKNESS = ROOM_WALL_THICKNESS * 0.9;
    const GATE_OPEN_RADIUS = 3.5;
    const GATE_SLIDE_RATE = 4;
    const gates = DOORS.map((door) => {
      const panelWidth = door.width / 2;
      const geo =
        door.axis === "x"
          ? new THREE.BoxGeometry(panelWidth, GATE_PANEL_HEIGHT, GATE_THICKNESS)
          : new THREE.BoxGeometry(GATE_THICKNESS, GATE_PANEL_HEIGHT, panelWidth);
      const panelA = new THREE.Mesh(geo, gateMat);
      const panelB = new THREE.Mesh(geo, gateMat);
      panelA.position.y = GATE_PANEL_HEIGHT / 2;
      panelB.position.y = GATE_PANEL_HEIGHT / 2;
      panelA.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), gateEdgeMat));
      panelB.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), gateEdgeMat));
      scene.add(panelA, panelB);
      return { door, panelA, panelB, panelWidth, openAmount: 0 };
    });
    const updateGatePanels = (g: (typeof gates)[number]) => {
      const slide = g.panelWidth * g.openAmount;
      if (g.door.axis === "x") {
        g.panelA.position.set(g.door.x - g.panelWidth / 2 - slide, GATE_PANEL_HEIGHT / 2, g.door.z);
        g.panelB.position.set(g.door.x + g.panelWidth / 2 + slide, GATE_PANEL_HEIGHT / 2, g.door.z);
      } else {
        g.panelA.position.set(g.door.x, GATE_PANEL_HEIGHT / 2, g.door.z - g.panelWidth / 2 - slide);
        g.panelB.position.set(g.door.x, GATE_PANEL_HEIGHT / 2, g.door.z + g.panelWidth / 2 + slide);
      }
    };
    gates.forEach(updateGatePanels); // start fully closed

    let player: FighterRig | null = null;
    let bot1: FighterRig | null = null;
    let bot2: FighterRig | null = null;
    let bot3: FighterRig | null = null;
    let bot4: FighterRig | null = null;
    let bot5: FighterRig | null = null;
    let boss: FighterRig | null = null;

    // Preloaded here so it's very likely already resolved by the time each
    // fighter's rig finishes loading — every fighter is armed on spawn now,
    // it's the weapon every fighter actually shoots with (see the fire
    // logic in the tick loop below).
    const gunPrototype = loadGunPrototype();
    const equipGun = (rig: FighterRig) => {
      if (!rig.rightHand) return;
      gunPrototype.then((proto) => {
        rig.gun = createGunAttachment(rig.rightHand as THREE.Object3D, proto);
        curlGunGripFingers(rig.rightFingers, 1);
        curlGunGripFingers(rig.leftFingers, -1);
      });
    };

    loadFighter(scene, 0xffffff, (rig) => {
      if (disposed) return;
      rig.root.position.set(0, 0, 3);
      rig.root.rotation.y = Math.PI; // face into the dungeon at the start
      player = rig;
      equipGun(rig);
    });
    // Each bot stands guard inside its own room, dormant until the player
    // actually walks in (see GUARD_POS / the alert check in the tick loop)
    // rather than roaming near spawn.
    loadFighter(scene, BOT1_TINT, (rig) => {
      if (disposed) return;
      rig.root.position.set(BOT1_SPAWN.x, 0, BOT1_SPAWN.z);
      rig.root.rotation.y = Math.PI;
      bot1 = rig;
      equipGun(rig);
    });
    loadFighter(scene, BOT2_TINT, (rig) => {
      if (disposed) return;
      rig.root.position.set(BOT2_SPAWN.x, 0, BOT2_SPAWN.z);
      rig.root.rotation.y = Math.PI;
      bot2 = rig;
      equipGun(rig);
    });
    loadFighter(scene, BOT3_TINT, (rig) => {
      if (disposed) return;
      rig.root.position.set(BOT3_SPAWN.x, 0, BOT3_SPAWN.z);
      rig.root.rotation.y = Math.PI;
      bot3 = rig;
      equipGun(rig);
    });
    loadFighter(scene, BOT4_TINT, (rig) => {
      if (disposed) return;
      rig.root.position.set(BOT4_SPAWN.x, 0, BOT4_SPAWN.z);
      rig.root.rotation.y = Math.PI;
      bot4 = rig;
      equipGun(rig);
    });
    loadFighter(scene, BOT5_TINT, (rig) => {
      if (disposed) return;
      rig.root.position.set(BOT5_SPAWN.x, 0, BOT5_SPAWN.z);
      rig.root.rotation.y = Math.PI;
      bot5 = rig;
      equipGun(rig);
    });
    // The Boss stands guard in Room 6 — tougher and hitting harder, still
    // fighting bare-handed like everyone else, just holding a gun too.
    loadFighter(scene, BOSS_TINT, (rig) => {
      if (disposed) return;
      rig.root.position.set(BOSS_SPAWN.x, 0, BOSS_SPAWN.z);
      rig.root.rotation.y = Math.PI;
      boss = rig;
      equipGun(rig);
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
    let playerCooldown = 0;
    let playerFireT = -1;
    // Smoothed horizontal ground velocity — movement eases toward the
    // joystick-derived target instead of snapping to it, which is what
    // gives the accel/decel and the turning its weight.
    let playerVelX = 0;
    let playerVelZ = 0;
    let sprintBlend = 0;
    let playerSpeedNow = 0;
    let ended = false;
    // All four regular bots plus the Boss fight simultaneously (not one at
    // a time) — each has its own hp/cooldown/pose/death timeline, tracked
    // in parallel here rather than a single shared set of "the current
    // bot" variables. Index 4 is the Boss: stationary and much tougher.
    const botMaxHp = [100, 100, 100, 100, 100, BOSS_HP];
    const botStates = botMaxHp.map((hp, i) => ({
      hp,
      cooldown: 0,
      fireT: -1,
      deathT: -1,
      dead: false,
      isBoss: i === 5,
      // Guard bots start dormant (idle, not attacking) until the player
      // steps into their room; the Boss has no guard behavior to wait on.
      awake: i === 5,
      alertT: -1,
      patrolTarget: null as { x: number; z: number } | null,
      stuckT: 0,
      avoidSign: 1 as 1 | -1,
    }));
    // Short-lived tracer lines from a gun to its target, spawned per shot
    // and cleaned up once their life runs out (see spawnTracer/updateTracers).
    const tracers: Tracer[] = [];
    let playerDeathT = -1;
    let pendingResult: "win" | "lose" | null = null;
    let resultRevealT = 0;
    const camTargetPos = new THREE.Vector3();
    const camLookAt = new THREE.Vector3();

    // Applies damage to one bot by index, handling its death (topple pose)
    // and the overall win condition (every bot dead).
    const damageBot = (idx: number, amount: number) => {
      const st = botStates[idx];
      if (st.dead) return;
      st.hp = Math.max(0, st.hp - amount);
      setBotHps((prev) => {
        const next = prev.slice();
        next[idx] = (st.hp / botMaxHp[idx]) * 100;
        return next;
      });
      if (st.hp <= 0) {
        st.dead = true;
        st.deathT = 0;
        const rig = [bot1, bot2, bot3, bot4, bot5, boss][idx];
        if (rig) startDeath(rig);
        if (botStates.every((s) => s.dead)) {
          ended = true;
          pendingResult = "win";
        }
      }
    };
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      player?.mixer?.update(dt);
      bot1?.mixer?.update(dt);
      bot2?.mixer?.update(dt);
      bot3?.mixer?.update(dt);
      bot4?.mixer?.update(dt);
      bot5?.mixer?.update(dt);
      boss?.mixer?.update(dt);
      // Re-bend the off-hand toward the gun's foregrip after the mixer has
      // (re)applied this frame's idle/run/fire pose — see
      // updateOffHandReach. Skipped once a fighter is dead: the death clip
      // already drives the arm bones for the collapse, and re-bending the
      // off-hand onto the gun every frame would fight that pose (and just
      // looks wrong — a dropped body shouldn't still be gripping the gun).
      if (player && playerDeathT < 0) updateOffHandReach(player);
      if (bot1 && botStates[0].deathT < 0) updateOffHandReach(bot1);
      if (bot2 && botStates[1].deathT < 0) updateOffHandReach(bot2);
      if (bot3 && botStates[2].deathT < 0) updateOffHandReach(bot3);
      if (bot4 && botStates[3].deathT < 0) updateOffHandReach(bot4);
      if (bot5 && botStates[4].deathT < 0) updateOffHandReach(bot5);
      if (boss && botStates[5].deathT < 0) updateOffHandReach(boss);
      updateTracers(tracers, dt);

      const rigs = [bot1, bot2, bot3, bot4, bot5, boss];
      for (let i = 0; i < 6; i++) {
        const rig = rigs[i];
        const st = botStates[i];
        if (rig && st.deathT >= 0) {
          applyDeathPose(rig, st.deathT);
          st.deathT += dt;
        }
        // Float this fighter's health bar above its own head instead of a
        // fixed corner list — same screen-projection approach as the alert
        // marker above, hidden once dead, once it's behind the camera, or
        // while it's still above half health (only worth calling out once
        // a fighter is actually hurting).
        const barEl = hpBarRefs.current[i];
        if (barEl) {
          if (rig && !st.dead && st.hp / botMaxHp[i] <= 0.5) {
            const markPoint = rig.root.position.clone();
            markPoint.y += HP_BAR_HEIGHT;
            markPoint.project(camera);
            if (markPoint.z < 1) {
              const w = container.clientWidth;
              const h = container.clientHeight;
              barEl.style.display = "block";
              barEl.style.left = `${(markPoint.x + 1) * 0.5 * w}px`;
              barEl.style.top = `${(1 - markPoint.y) * 0.5 * h}px`;
            } else {
              barEl.style.display = "none";
            }
          } else {
            barEl.style.display = "none";
          }
        }
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

      if (!ended && player && bot1 && bot2 && bot3 && bot4 && bot5 && boss) {
        const jv = joystickVec.current;
        const joyMag = Math.min(1, Math.hypot(jv.x, jv.y));

        // Sprint eases in once the stick is held past SPRINT_ENGAGE_MAG (or
        // the RUN button is toggled on) and eases back out the instant
        // neither is true, rather than snapping a speed multiplier on or off.
        const wantSprint = runToggled.current || joyMag > SPRINT_ENGAGE_MAG;
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
        // With the RUN toggle on and the stick untouched, run straight
        // ahead (camera-forward) instead of standing still — RUN is meant
        // to start the character moving on its own, not just raise the
        // speed cap for whenever the stick happens to be pushed. Touching
        // the stick while RUN is on still steers normally.
        // Pushing the stick straight up (jv.y negative) works out to
        // -camForward once run through rawX/rawZ above (jv.y's sign flips
        // it), so "forward" to match that same convention is -camForward,
        // not camForward directly.
        const runningInPlace = runToggled.current && joyMag <= 0.0001;
        const dirX = joyMag > 0.0001 ? rawX / joyMag : runningInPlace ? -camForwardX : 0;
        const dirZ = joyMag > 0.0001 ? rawZ / joyMag : runningInPlace ? -camForwardZ : 0;
        const effectiveMag = runningInPlace ? 1 : joyMag;

        // How far the stick is pushed sets the target speed continuously —
        // a light tap walks, a full push runs, and holding full tilt ramps
        // sprint in on top — so there's no discrete walk/jog/run jump.
        const targetSpeed = effectiveMag * PLAYER_MAX_SPEED * (1 + PLAYER_SPRINT_BONUS * sprintBlend);
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

        // Each house's stairs down through its own center to the
        // underground tunnel — real, walkable stairs, not a teleport.
        // Y is a continuous function of where the player physically is
        // relative to the stair run: "along" is signed distance from the
        // house center in the direction the stairs descend (see
        // ROOM_TUNNEL_DIR), "perp" is signed distance off to the side of
        // that line. Standing anywhere within the stairway's width and
        // run length pins the player's height to the matching point on
        // the slope, so walking forward/back moves them up/down
        // gradually and stopping mid-stride just holds them there —
        // exactly like real stairs, including being able to pause partway
        // and look around at whichever floor is above.
        for (let i = 0; i < ROOM_STAIRS_DOWN_POS.length; i++) {
          const spot = ROOM_STAIRS_DOWN_POS[i];
          const dir = ROOM_TUNNEL_DIR[i];
          const dx = player.root.position.x - spot.x;
          const dz = player.root.position.z - spot.z;
          const along = dx * dir.x + dz * dir.z;
          const perp = dz * dir.x - dx * dir.z;
          if (Math.abs(perp) < RAMP_HALF_WIDTH && along > -RAMP_BAND && along < RAMP_RUN_LENGTH + RAMP_BAND) {
            const progress = clamp(along / RAMP_RUN_LENGTH, 0, 1);
            player.root.position.y = THREE.MathUtils.lerp(0, TUNNEL_Y, progress);
            break;
          }
        }

        // Slide each gate open as the player nears its door, closed again
        // once they've moved away.
        for (const g of gates) {
          const gateDx = player.root.position.x - g.door.x;
          const gateDz = player.root.position.z - g.door.z;
          const gateTarget = Math.hypot(gateDx, gateDz) < GATE_OPEN_RADIUS ? 1 : 0;
          g.openAmount = approach(g.openAmount, gateTarget, GATE_SLIDE_RATE, dt);
          updateGatePanels(g);
        }
        // Recomputed every tick from each gate's current slide position —
        // see gateBlockers/hasLineOfSight — so a shot is stopped by a
        // still-closed or half-open gate exactly like a wall, and clears
        // the instant it finishes sliding open.
        gateBlockers = gates.flatMap((g) =>
          g.door.axis === "x"
            ? [
                { x: g.panelA.position.x, z: g.panelA.position.z, halfX: g.panelWidth / 2, halfZ: GATE_THICKNESS / 2, pad: 0 },
                { x: g.panelB.position.x, z: g.panelB.position.z, halfX: g.panelWidth / 2, halfZ: GATE_THICKNESS / 2, pad: 0 },
              ]
            : [
                { x: g.panelA.position.x, z: g.panelA.position.z, halfX: GATE_THICKNESS / 2, halfZ: g.panelWidth / 2, pad: 0 },
                { x: g.panelB.position.x, z: g.panelB.position.z, halfX: GATE_THICKNESS / 2, halfZ: g.panelWidth / 2, pad: 0 },
              ],
        );

        playerSpeedNow = Math.hypot(playerVelX, playerVelZ);
        // Face the direction actually being moved in (not the raw stick
        // input) and ease into it instead of snapping, which keeps the
        // body orientation looking natural through a direction change
        // instead of instantly spinning to face it.
        if (playerSpeedNow > 0.05) {
          const targetYaw = Math.atan2(playerVelX, playerVelZ);
          player.root.rotation.y = dampAngle(player.root.rotation.y, targetYaw, PLAYER_TURN_RATE, dt);
        }

        // How far into Idle -> Running the real mocap clips are blended,
        // continuously off actual speed so there's no hard on/off cut.
        const speedFrac = clamp(playerSpeedNow / PLAYER_MAX_SPEED, 0, 1.15);
        updateLocomotionAnim(player, speedFrac, playerSpeedNow);

        // All bots act independently and simultaneously — every one still
        // alive chases the player and can land its own hit, rather than
        // only "the current" one taking its turn. Track the nearest alive
        // one as we go, as the player's own melee target.
        let nearestIdx = -1;
        let nearestDist = Infinity;
        for (let i = 0; i < 6; i++) {
          const rig = rigs[i];
          const st = botStates[i];
          if (!rig || st.dead) continue;

          let dx = player.root.position.x - rig.root.position.x;
          let dz = player.root.position.z - rig.root.position.z;
          let dist = Math.hypot(dx, dz);
          // Every distance/collision check above is X/Z only, so a player
          // standing in the underground tunnel directly below a bot's
          // room (same X/Z, ~3.5 units lower) would otherwise read as
          // point-blank range — bots never change floor, so comparing Y
          // is enough to tell whether the player is actually reachable.
          const sameFloor = Math.abs(player.root.position.y - rig.root.position.y) < 1;

          // Keep fighters from walking through each other's bodies — push
          // the player back out to the minimum separation distance.
          if (sameFloor && dist < BODY_SEPARATION) {
            const nx = dist > 0.0001 ? dx / dist : 0;
            const nz = dist > 0.0001 ? dz / dist : 1;
            player.root.position.x = clamp(rig.root.position.x + nx * BODY_SEPARATION, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
            player.root.position.z = clamp(rig.root.position.z + nz * BODY_SEPARATION, -ARENA_HALF + 0.4, ARENA_HALF - 0.4);
            dx = player.root.position.x - rig.root.position.x;
            dz = player.root.position.z - rig.root.position.z;
            dist = Math.hypot(dx, dz);
          }

          if (st.isBoss) {
            // The Boss holds its ground in Room 6 — it never chases, but
            // opens fire the instant the player comes within range.
            updateLocomotionAnim(rig, 0, 0);
            rig.root.rotation.y = Math.atan2(dx, dz);

            st.cooldown = Math.max(0, st.cooldown - dt);
            if (sameFloor && dist <= GUN_RANGE && st.cooldown <= 0 && hasLineOfSight(rig.root.position.x, rig.root.position.z, player.root.position.x, player.root.position.z)) {
              playerHpLocal = Math.max(0, playerHpLocal - BOSS_DAMAGE);
              setPlayerHp(playerHpLocal);
              st.cooldown = BOSS_ATTACK_COOLDOWN;
              st.fireT = 0;
              rig.fireAction?.reset().play();
              const targetPoint = new THREE.Vector3(player.root.position.x, TRACER_TARGET_HEIGHT, player.root.position.z);
              tracers.push(spawnTracer(scene, rig.gun, rig.root.position, targetPoint));
            }
            if (st.fireT >= 0) {
              applyFirePose(rig, st.fireT);
              st.fireT = st.fireT + dt > FIRE_ANIM_DURATION ? -1 : st.fireT + dt;
            }
          } else if (!st.awake) {
            // Dormant guard: rather than freezing on one spot, it wanders a
            // short walking loop around its post — until the player
            // actually walks into the room, at which point it freezes,
            // faces them, and shows a "?" over its head for a beat before
            // waking into the normal chase/attack behavior below.
            const guard = GUARD_POS[i];
            if (st.alertT < 0) {
              if (
                !st.patrolTarget ||
                Math.hypot(rig.root.position.x - st.patrolTarget.x, rig.root.position.z - st.patrolTarget.z) < PATROL_ARRIVE_DIST
              ) {
                st.patrolTarget = {
                  x: guard.x + (Math.random() * 2 - 1) * PATROL_RADIUS,
                  z: guard.z + (Math.random() * 2 - 1) * PATROL_RADIUS,
                };
              }
              const pdx = st.patrolTarget.x - rig.root.position.x;
              const pdz = st.patrolTarget.z - rig.root.position.z;
              const pdist = Math.hypot(pdx, pdz);
              if (pdist > 0.0001) {
                moveWithAvoidance(rig, st, pdx / pdist, pdz / pdist, PATROL_SPEED, dt);
                rig.root.rotation.y = Math.atan2(pdx, pdz);
                updateLocomotionAnim(rig, PATROL_RUN_WEIGHT, PATROL_SPEED);
              }

              const gdx = player.root.position.x - guard.x;
              const gdz = player.root.position.z - guard.z;
              if (Math.hypot(gdx, gdz) <= GUARD_ALERT_RADIUS) {
                st.alertT = ALERT_TELEGRAPH_DURATION;
              }
            } else {
              updateLocomotionAnim(rig, 0, 0);
              rig.root.rotation.y = Math.atan2(dx, dz);
              st.alertT -= dt;
              if (st.alertT <= 0) {
                st.awake = true;
              }
            }
            if (st.alertT >= 0 && alertRefs.current[i]) {
              const markPoint = rig.root.position.clone();
              markPoint.y += ALERT_MARK_HEIGHT;
              markPoint.project(camera);
              const el = alertRefs.current[i]!;
              if (markPoint.z < 1) {
                const w = container.clientWidth;
                const h = container.clientHeight;
                el.style.display = "block";
                el.style.left = `${(markPoint.x + 1) * 0.5 * w}px`;
                el.style.top = `${(1 - markPoint.y) * 0.5 * h}px`;
              } else {
                el.style.display = "none";
              }
            } else if (alertRefs.current[i]) {
              alertRefs.current[i]!.style.display = "none";
            }
          } else {
            // A wall between here and the player blocks the shot (see
            // hasLineOfSight) same as it blocks a real bullet — so being
            // "in range" by distance alone isn't enough to stop and camp;
            // keep closing the gap (moveWithAvoidance's existing stuck
            // detection routes it around the wall) until there's an
            // actual clear line to fire down.
            const canSeePlayer = sameFloor && hasLineOfSight(rig.root.position.x, rig.root.position.z, player.root.position.x, player.root.position.z);
            if (dist > GUN_RANGE * 0.85 || !canSeePlayer) {
              moveWithAvoidance(rig, st, dx / dist, dz / dist, BOT_SPEED, dt);
              updateLocomotionAnim(rig, 1, BOT_SPEED);
            } else {
              updateLocomotionAnim(rig, 0, 0);
            }
            rig.root.rotation.y = Math.atan2(dx, dz);

            st.cooldown = Math.max(0, st.cooldown - dt);
            if (dist <= GUN_RANGE && st.cooldown <= 0 && canSeePlayer) {
              playerHpLocal = Math.max(0, playerHpLocal - BOT_DAMAGE);
              setPlayerHp(playerHpLocal);
              st.cooldown = BOT_ATTACK_COOLDOWN;
              st.fireT = 0;
              rig.fireAction?.reset().play();
              const targetPoint = new THREE.Vector3(player.root.position.x, TRACER_TARGET_HEIGHT, player.root.position.z);
              tracers.push(spawnTracer(scene, rig.gun, rig.root.position, targetPoint));
            }
            if (st.fireT >= 0) {
              applyFirePose(rig, st.fireT);
              st.fireT = st.fireT + dt > FIRE_ANIM_DURATION ? -1 : st.fireT + dt;
            }
          }

          // Only a bot the player can actually see counts as a target — a
          // closer bot hidden behind a wall (or on a different floor —
          // see sameFloor) shouldn't steal the auto-aim (or the shot's
          // damage) from a farther one actually in view.
          if (sameFloor && dist < nearestDist && hasLineOfSight(player.root.position.x, player.root.position.z, rig.root.position.x, rig.root.position.z)) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }

        // While stationary, the player's body keeps whatever facing it had
        // from its last movement — free-look camera drags orbit the view
        // around the character without spinning the character itself
        // (matching Free Fire: panning the screen doesn't turn your body).

        playerCooldown = Math.max(0, playerCooldown - dt);

        // Auto-fire: attackRequested stays true for as long as the FIRE
        // button is held (set on pointer down, cleared on pointer up/
        // leave/cancel — see the button below), rather than being
        // consumed after one shot, so holding it down keeps firing every
        // time the cooldown clears until the finger lifts.
        if (attackRequested.current) {
          if (playerCooldown <= 0) {
            // The shot always fires — recoil, cooldown, tracer, the works —
            // on press, whether or not a bot is actually in range right
            // now; the character's hands respond the same way regardless.
            // Only the damage is conditional on a bot actually being in
            // range. Snap the body to face wherever the camera is pointed
            // the instant it fires, so it always visibly faces the shot
            // direction rather than whatever it happened to face before.
            player.root.rotation.y = cameraYaw.current;
            playerCooldown = PLAYER_ATTACK_COOLDOWN;
            playerFireT = 0;
            player.fireAction?.reset().play();
            const aimYaw = cameraYaw.current;
            const targetPoint =
              nearestIdx !== -1 && nearestDist <= GUN_RANGE
                ? new THREE.Vector3(rigs[nearestIdx]!.root.position.x, TRACER_TARGET_HEIGHT, rigs[nearestIdx]!.root.position.z)
                : new THREE.Vector3(
                    player.root.position.x + Math.sin(aimYaw) * GUN_RANGE,
                    TRACER_TARGET_HEIGHT,
                    player.root.position.z + Math.cos(aimYaw) * GUN_RANGE,
                  );
            tracers.push(spawnTracer(scene, player.gun, player.root.position, targetPoint));
            if (nearestIdx !== -1 && nearestDist <= GUN_RANGE) {
              damageBot(nearestIdx, PLAYER_DAMAGE);
            }
          }
        }

        if (playerFireT >= 0) {
          applyFirePose(player, playerFireT);
          playerFireT = playerFireT + dt > FIRE_ANIM_DURATION ? -1 : playerFireT + dt;
        }

        if (playerHpLocal <= 0) {
          ended = true;
          playerDeathT = 0;
          startDeath(player);
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
        const pitch = clamp(CAM_BASE_PITCH + cameraPitch.current, CAM_PITCH_MIN, CAM_PITCH_MAX);
        const orbitHoriz = CAM_ORBIT_RADIUS * Math.cos(pitch);
        const orbitVert = CAM_ORBIT_RADIUS * Math.sin(pitch);
        camTargetPos.set(
          player.root.position.x - Math.sin(facing) * orbitHoriz,
          CAM_LOOK_HEIGHT + player.root.position.y + orbitVert,
          player.root.position.z - Math.cos(facing) * orbitHoriz,
        );
        // The follow used to add a head bob synced to the running phase
        // and a slight roll while turning, for a more cinematic feel —
        // but on a small phone screen that reads as the whole view
        // shaking rather than adding life, so the camera now just tracks
        // the player's position and facing with nothing layered on top:
        // fully stable regardless of how fast the player is moving.
        camera.position.lerp(camTargetPos, 1 - Math.exp(-CAM_DAMP_RATE * dt));

        camLookAt.set(player.root.position.x, CAM_LOOK_HEIGHT + player.root.position.y, player.root.position.z);
        camera.lookAt(camLookAt);
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
      gateBlockers = [];
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
    lookLastY.current = e.clientY;
  };
  const handleLookMove = (e: React.PointerEvent) => {
    if (lookTouchId.current !== e.pointerId) return;
    const dx = e.clientX - lookLastX.current;
    const dy = e.clientY - lookLastY.current;
    lookLastX.current = e.clientX;
    lookLastY.current = e.clientY;
    cameraYaw.current -= dx * LOOK_SENSITIVITY_BASE * lookSensitivity;
    // Dragging up (dy negative) looks up, so subtract dy rather than add it.
    cameraPitch.current = clamp(cameraPitch.current - dy * LOOK_SENSITIVITY_BASE * lookSensitivity, -1.6, 1.6);
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

      {/* Guard alert marks — a "?" popping up over a dormant guard's head
          for a beat right before it wakes and attacks, positioned each
          tick via alertRefs (screen-projected from its 3D position),
          hidden by default. */}
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          ref={(el) => {
            alertRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            display: "none",
            transform: "translate(-50%, -100%)",
            color: "#ffe14d",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 800,
            fontSize: 26,
            textShadow: "0 0 8px rgba(255,225,77,0.9), 0 0 2px rgba(0,0,0,0.8)",
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          ❓
        </div>
      ))}

      {/* Health bars */}
      <div style={{ position: "absolute", top: 16, left: 16, width: "min(38%, 260px)" }}>
        <div style={{ color: "#dce8f5", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", marginBottom: 4 }}>
          YOU
        </div>
        <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${playerHp}%`, background: "linear-gradient(90deg,#4fd8ff,#6be2ff)", transition: "width 150ms ease-out" }} />
        </div>
      </div>
      {/* Each bot/Boss's own health bar floats directly over its head in
          the 3D view instead of a fixed corner list — positioned each
          tick via hpBarRefs (screen-projected from its 3D position, same
          approach as the alert marker above), hidden once that fighter is
          dead or off-screen. Width still comes from botHps/React state. */}
      {botHps.map((hp, i) => (
        <div
          key={i}
          ref={(el) => {
            hpBarRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            display: "none",
            transform: "translate(-50%, -100%)",
            width: i === 5 ? 90 : 64,
            pointerEvents: "none",
            zIndex: 6,
          }}
        >
          <div
            style={{
              color: i === 5 ? "#ff8a8a" : "#dce8f5",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.08em",
              marginBottom: 2,
              textAlign: "center",
              textShadow: "0 0 4px rgba(0,0,0,0.9)",
            }}
          >
            {i === 5 ? "BOSS" : `BOT ${i + 1}`}
          </div>
          <div style={{ height: i === 5 ? 8 : 6, borderRadius: 3, background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.25)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${hp}%`,
                background: i === 5 ? "linear-gradient(90deg,#ff3b3b,#8a0000)" : "linear-gradient(90deg,#ff8a6b,#ff5e4e)",
                transition: "width 150ms ease-out",
              }}
            />
          </div>
        </div>
      ))}

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

      {/* Fire button — auto-fires for as long as it's held down (see the
          attackRequested consumption in the tick loop), not just once per
          tap. setPointerCapture keeps the up/cancel events firing on this
          button even if the finger slides off it while held, so a drag-off
          reliably stops the fire instead of leaving it stuck on. */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          attackRequested.current = true;
        }}
        onPointerUp={() => {
          attackRequested.current = false;
        }}
        onPointerCancel={() => {
          attackRequested.current = false;
        }}
        aria-label="Fire"
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
        FIRE
      </button>

      {/* Run toggle button */}
      <button
        onPointerDown={(e) => {
          e.preventDefault();
          runToggled.current = !runToggled.current;
          setRunActive(runToggled.current);
        }}
        aria-label="Run"
        style={{
          position: "absolute",
          right: "calc(7% + clamp(72px, 13vw, 100px) + 14px)",
          bottom: "9%",
          width: "clamp(56px, 10vw, 76px)",
          height: "clamp(56px, 10vw, 76px)",
          borderRadius: "50%",
          background: runActive ? "radial-gradient(circle, #baffb0, #3fd85a)" : "radial-gradient(circle, #8fe89a, #2f8f45)",
          border: runActive ? "2px solid rgba(220,255,220,0.95)" : "2px solid rgba(210,255,210,0.7)",
          boxShadow: runActive ? "0 0 26px rgba(90,255,120,0.85)" : "0 0 14px rgba(90,255,120,0.4)",
          color: "#f0fff2",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.05em",
          fontSize: "clamp(11px, 1.7vw, 14px)",
          cursor: "pointer",
        }}
      >
        RUN
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
