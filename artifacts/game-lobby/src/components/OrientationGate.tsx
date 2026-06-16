import React, { useEffect, useState } from "react";

export default function OrientationGate({ children }: { children: React.ReactNode }) {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    // Try to lock orientation via API
    const tryLock = async () => {
      try {
        await (screen.orientation as any).lock("landscape");
      } catch (_) {
        // Not supported on all browsers — fallback to CSS overlay
      }
    };
    tryLock();

    const check = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (isPortrait) {
    return (
      <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center gap-6">
        {/* Animated phone rotate icon */}
        <div className="relative">
          <div className="w-20 h-32 border-4 border-cyan-400 rounded-2xl flex items-center justify-center animate-bounce shadow-[0_0_20px_rgba(0,255,255,0.5)]">
            <div className="w-12 h-2 bg-cyan-400 rounded" />
          </div>
          {/* Rotation arrows */}
          <svg
            className="absolute -right-8 top-1/2 -translate-y-1/2 w-8 h-8 text-cyan-400 animate-spin"
            style={{ animationDuration: "2s" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
            <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
          </svg>
        </div>

        <div className="flex flex-col items-center gap-2 text-center px-8">
          <p className="text-cyan-400 font-bold text-xl tracking-widest uppercase font-mono neon-text-cyan">
            ROTATE DEVICE
          </p>
          <p className="text-gray-400 font-mono text-sm">
            Phone ghuma lo — landscape mode mein khulega
          </p>
          <p className="text-purple-400 font-mono text-xs mt-1 animate-pulse">
            ↔ PUBG jaisa wide screen experience
          </p>
        </div>

        {/* Neon lines decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-60" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60" />
      </div>
    );
  }

  return <>{children}</>;
}
