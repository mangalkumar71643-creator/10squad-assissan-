// Main hub screen shown after the splash/loading sequence. Currently just
// the background chamber art with a soft dark vignette so it reads well
// once foreground content is designed and added back in.
export default function Lobby({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
        pointerEvents: visible ? "auto" : "none",
        overflow: "hidden",
      }}
    >
      <img
        src="/lobby-hub-bg.jpg"
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(4,3,10,0.35) 0%, rgba(4,3,10,0.05) 22%, rgba(4,3,10,0.1) 60%, rgba(4,3,10,0.75) 100%)",
        }}
      />
    </div>
  );
}
