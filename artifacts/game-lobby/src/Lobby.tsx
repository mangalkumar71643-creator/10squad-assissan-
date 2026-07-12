// Main hub screen shown after the splash/loading sequence: the approved
// concept-art mockup used directly as a single flat image, locked to a
// 16:9 frame and letterboxed so it never stretches or crops on devices
// with a different aspect ratio.
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
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
      </div>
    </div>
  );
}
