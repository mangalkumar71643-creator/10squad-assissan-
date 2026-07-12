// Main hub screen shown after the splash/loading sequence: the approved
// concept-art mockup, natively 16:9. The mockup has UI (Deploy Now,
// bottom nav, System Core, Live Intel, etc.) baked right up to its edges,
// so on a device wider than 16:9 a `cover` fit crops those elements off.
// Shown via `contain` instead (never crops the artwork) inset by a safe
// margin, with a blurred copy of the same image filling the space around
// it so there are no black bars.
export default function Lobby({ visible }: { visible: boolean }) {
  const inset = "max(70px, env(safe-area-inset-top, 0px) + 70px)";
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
        alt=""
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "blur(40px) brightness(0.5)",
          transform: "scale(1.1)",
        }}
      />
      <img
        src="/lobby-full-mockup.jpg"
        alt="10 Squad Assassin lobby"
        style={{
          position: "absolute",
          top: inset,
          bottom: inset,
          left: inset,
          right: inset,
          width: `calc(100% - 2 * ${inset})`,
          height: `calc(100% - 2 * ${inset})`,
          objectFit: "contain",
        }}
      />
    </div>
  );
}
