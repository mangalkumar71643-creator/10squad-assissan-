import { useEffect, useState } from "react";

export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const hide = setTimeout(() => setFadeOut(true), 1800);
    const done = setTimeout(() => onDone(), 2400);
    return () => { clearTimeout(hide); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.6s ease",
        pointerEvents: fadeOut ? "none" : "all",
      }}
    >
      <img
        src="/logo.png"
        alt="10 Squad Assassin"
        style={{
          width: "240px",
          height: "240px",
          objectFit: "contain",
        }}
      />
      <p
        style={{
          color: "#ffffff",
          fontSize: "18px",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 400,
          letterSpacing: "0.02em",
          margin: 0,
        }}
      >
        10 Squad Assassin
      </p>
    </div>
  );
}
