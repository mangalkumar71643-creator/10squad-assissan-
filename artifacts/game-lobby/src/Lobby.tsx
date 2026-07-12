// Main hub screen shown after the splash/loading sequence: the approved
// concept-art mockup, natively 16:9, rendered full-bleed edge-to-edge
// (object-fit: cover, same scale as the rest of the app's backgrounds,
// no letterboxing). The mockup originally had UI (profile panel,
// currency panel, Deploy Now, bottom nav) baked right up to its edges,
// which a `cover` fit crops on devices wider than 16:9. Those pieces
// have been cut out of the background (with the gap blended back in)
// and are layered back on top here as their own sprites pinned to a
// small fixed safe-area margin, so they stay fully visible on every
// device no matter how much the background itself gets cropped.
const BOTTOM_MARGIN = "max(14px, env(safe-area-inset-bottom, 0px) + 14px)";
// Top panels: shifted 60px inward from their original 10px corner position
// (>=60px side margin, as requested). The right panel also drops the full
// 35px (>=40px top margin) since there's open background below it. The
// left panel can only drop ~8px before its box starts covering the
// SYSTEM CORE panel title directly beneath it in the source art, so its
// vertical shift is capped there to avoid overlapping that panel.
const TOP_RIGHT_PANEL_TOP = "max(45px, env(safe-area-inset-top, 0px) + 45px)";
const TOP_LEFT_PANEL_TOP = "max(18px, env(safe-area-inset-top, 0px) + 18px)";
const TOP_LEFT_PANEL_LEFT = "max(70px, env(safe-area-inset-left, 0px) + 70px)";
const TOP_RIGHT_PANEL_RIGHT = "max(70px, env(safe-area-inset-right, 0px) + 70px)";

export default function Lobby({ visible }: { visible: boolean }) {
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
      {/* Whole lobby (background + all UI overlays) nudged down 7px as one
          unit so it lines up with the bottom of the real device screen. */}
      <div style={{ position: "absolute", inset: 0, transform: "translateY(7px)" }}>
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
            // height than 100% (mobile browser/WebView chrome), which left
            // a thin gap at the bottom under a plain `cover` fit. Scaling
            // up a touch from the top edge grows the image downward only,
            // so it always overshoots the bottom with zero gap while the
            // top stays exactly where it was.
            transform: "scale(1.04)",
            transformOrigin: "50% 0%",
          }}
        />
        <img
          src="/lobby-bar-top-left.png"
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", top: TOP_LEFT_PANEL_TOP, left: TOP_LEFT_PANEL_LEFT, width: "21.875%" }}
        />
        <img
          src="/lobby-bar-top-right.png"
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", top: TOP_RIGHT_PANEL_TOP, right: TOP_RIGHT_PANEL_RIGHT, width: "24.48%" }}
        />
        <img
          src="/lobby-bar-bottom.png"
          alt=""
          aria-hidden="true"
          style={{ position: "absolute", bottom: BOTTOM_MARGIN, left: 0, width: "100%" }}
        />
      </div>
    </div>
  );
}
