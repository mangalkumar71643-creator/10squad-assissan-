import { useEffect, useState } from "react";

// The native Capacitor SplashScreen already shows this same logo (on the
// same black background) for the full 3 seconds before the WebView is
// revealed. This component just continues that exact same frame seamlessly
// — no fade-in, no second hold — then fades out once, briefly after.
const BUFFER_MS = 300;
const FADE_MS = 400;

export default function App() {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadingOut(true), BUFFER_MS);
    return () => clearTimeout(timer);
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
          opacity: fadingOut ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease`,
        }}
      />
    </div>
  );
}
