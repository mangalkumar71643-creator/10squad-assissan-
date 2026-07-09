import { useEffect, useState } from "react";

const HOLD_MS = 3000;
const FADE_MS = 400;

export default function App() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeInId = requestAnimationFrame(() => setVisible(true));
    const fadeOutTimer = setTimeout(() => setFadingOut(true), HOLD_MS);
    return () => {
      cancelAnimationFrame(fadeInId);
      clearTimeout(fadeOutTimer);
    };
  }, []);

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <img
        src="/logo.png"
        alt="10 Squad Assassin"
        style={{
          maxWidth: "55%",
          maxHeight: "55%",
          objectFit: "contain",
          opacity: fadingOut ? 0 : visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />
    </div>
  );
}
