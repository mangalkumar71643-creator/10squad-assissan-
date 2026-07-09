import { useEffect, useState } from "react";

// The native splash screen is only shown briefly (just to cover the gap
// before the WebView paints — its icon rendering is unreliable across
// Android versions/OEMs). This component is the actual source of truth for
// the "3 second logo" experience: shows immediately, holds, fades out once.
const HOLD_MS = 3000;
const FADE_MS = 400;

export default function App() {
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadingOut(true), HOLD_MS);
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
