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
const TOP_MARGIN = "max(10px, env(safe-area-inset-top, 0px) + 10px)";
const BOTTOM_MARGIN = "max(14px, env(safe-area-inset-bottom, 0px) + 14px)";
const SIDE_MARGIN = "max(10px, env(safe-area-inset-left, 0px) + 10px)";

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
      <img
        src="/lobby-full-mockup.jpg"
        alt="10 Squad Assassin lobby"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <img
        src="/lobby-bar-top-left.png"
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", top: TOP_MARGIN, left: SIDE_MARGIN, width: "21.875%" }}
      />
      <img
        src="/lobby-bar-top-right.png"
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", top: TOP_MARGIN, right: SIDE_MARGIN, width: "24.48%" }}
      />
      <img
        src="/lobby-bar-bottom.png"
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", bottom: BOTTOM_MARGIN, left: 0, width: "100%" }}
      />
    </div>
  );
}
