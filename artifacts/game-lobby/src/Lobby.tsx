// Main hub screen shown after the splash/loading sequence: the approved
// background chamber art, untouched, with only the provided Character
// Selection button placed on the platform. No other UI has been added.
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

      {/* Contact shadow, anchored at the same point the button rests on the platform */}
      <div
        style={{
          position: "absolute",
          left: "32%",
          top: "73%",
          transform: "translate(-50%, -14%)",
          width: "clamp(70px,9vw,128px)",
          height: "clamp(14px,1.8vw,26px)",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 72%)",
          filter: "blur(2px)",
        }}
      />

      <img
        src="/btn-character.png"
        alt="Character"
        style={{
          position: "absolute",
          left: "32%",
          top: "73%",
          transform: "translate(-50%, -100%)",
          width: "clamp(96px,12vw,168px)",
          height: "auto",
        }}
      />
    </div>
  );
}
