// Main hub screen shown after the splash/loading sequence: the approved
// background chamber art, untouched, with ONLY the four monolith nav
// buttons added on the platform. No other HUD (no logo, no currency, no
// side panels, no deploy button) — those are deliberately not present yet.
const BUTTONS = [
  {
    key: "character",
    label: "CHARACTER",
    accent: "#b48cff",
    accentDim: "#6b3fd9",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M12 2.6C8.4 2.6 6 5.4 6 9v1.4c0 1.6.6 2.9 1.7 3.9L6.4 18h11.2l-1.3-3.7c1.1-1 1.7-2.3 1.7-3.9V9c0-3.6-2.4-6.4-6-6.4z" />
        <circle cx="12" cy="9.4" r="2.1" />
        <path d="M8.6 21.4c1-.5 2.2-.8 3.4-.8s2.4.3 3.4.8" />
      </svg>
    ),
  },
  {
    key: "map",
    label: "MAP SELECTION",
    accent: "#ffab3d",
    accentDim: "#d9740f",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
        <path d="M8.3 10.4l1.9-2.3 1.6 1.8 1.1-1.4 1.9 2.3" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "missions",
    label: "MISSIONS",
    accent: "#4db3ff",
    accentDim: "#1c7fc2",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M12 3l8.5 14.7H3.5L12 3z" />
        <path d="M12 9.2l4.6 8H7.4L12 9.2z" />
        <path d="M12 3v6.2M6.3 13.4l2.7-1.4M17.7 13.4l-2.7-1.4" opacity="0.7" />
      </svg>
    ),
  },
  {
    key: "nexus",
    label: "NEXUS MODE",
    accent: "#b48cff",
    accentDim: "#6b3fd9",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M12 3a5 5 0 1 1-5 5" />
        <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

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
      <style>{`
        @keyframes monolith-glow {
          0%, 100% { opacity: 0.75; }
          50% { opacity: 1; }
        }
        @keyframes monolith-sheen {
          0% { transform: translateX(-120%) skewX(-12deg); }
          100% { transform: translateX(220%) skewX(-12deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .monolith-glow, .monolith-sheen { animation: none !important; }
        }
      `}</style>

      <img
        src="/lobby-hub-bg.jpg"
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "13%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {BUTTONS.map((b) => (
          <div key={b.key} style={{ position: "relative", width: "clamp(80px,9vw,118px)" }}>
            {/* Glow pool on the platform beneath the monolith */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                bottom: "-6px",
                transform: "translateX(-50%)",
                width: "clamp(70px,8vw,102px)",
                height: "18px",
                borderRadius: "50%",
                background: `radial-gradient(ellipse, ${b.accent}99 0%, ${b.accent}33 45%, transparent 75%)`,
                filter: "blur(3px)",
                zIndex: 0,
              }}
            />

            {/* Monolith body: pointed pentagon "roof" over a rectangular
                base, with a thick metallic frame (outer layer) wrapping a
                dark cracked-stone fill (inner layer). */}
            <div
              style={{
                position: "relative",
                width: "clamp(82px,9.2vw,122px)",
                height: "clamp(140px,16vh,208px)",
                margin: "0 clamp(2px,0.35vw,5px)",
                clipPath: "polygon(0% 26%, 33% 0%, 67% 0%, 100% 26%, 100% 100%, 0% 100%)",
                padding: "clamp(3px,0.5vh,5px)",
                background: `linear-gradient(155deg, #e9e2ff 0%, ${b.accent} 22%, ${b.accentDim} 50%, #1a1424 78%, #0a0812 100%)`,
                boxShadow: `0 0 18px ${b.accent}88, 0 0 42px ${b.accentDim}55, 0 16px 24px rgba(0,0,0,0.6)`,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  clipPath: "polygon(0% 26%, 33% 0%, 67% 0%, 100% 26%, 100% 100%, 0% 100%)",
                  background: `
                    radial-gradient(140% 70% at 50% 0%, ${b.accentDim}3d, transparent 60%),
                    radial-gradient(90% 60% at 20% 90%, rgba(255,255,255,0.05), transparent 60%),
                    linear-gradient(200deg, rgba(30,25,42,0.98) 0%, rgba(11,10,18,0.99) 55%, rgba(4,4,8,1) 100%)
                  `,
                  overflow: "hidden",
                }}
              >
                {/* Cracked-stone vein texture */}
                <svg
                  viewBox="0 0 100 190"
                  preserveAspectRatio="none"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.6 }}
                >
                  <path d="M2 10 L18 26 L10 44 L26 58 L14 80 L30 98 L18 122 L34 140 L24 168"
                    fill="none" stroke={b.accent} strokeWidth="0.55" opacity="0.45" />
                  <path d="M98 8 L80 24 L90 40 L70 54 L84 76 L64 94 L78 118 L60 136 L72 165"
                    fill="none" stroke={b.accent} strokeWidth="0.55" opacity="0.45" />
                  <path d="M50 4 L44 22 L56 36 L46 52" fill="none" stroke="#fff" strokeWidth="0.4" opacity="0.3" />
                  <path d="M8 100 L22 108 L16 122" fill="none" stroke={b.accent} strokeWidth="0.4" opacity="0.35" />
                  <path d="M90 105 L78 112 L84 128" fill="none" stroke={b.accent} strokeWidth="0.4" opacity="0.35" />
                  <path d="M20 150 L36 158 L28 178" fill="none" stroke={b.accent} strokeWidth="0.4" opacity="0.3" />
                  <path d="M78 155 L64 162 L74 180" fill="none" stroke={b.accent} strokeWidth="0.4" opacity="0.3" />
                </svg>

                {/* Sheen sweep for a "realistic reflection" pass */}
                <div
                  className="monolith-sheen"
                  style={{
                    position: "absolute",
                    top: "-20%",
                    left: 0,
                    width: "22%",
                    height: "140%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                    animation: "monolith-sheen 6s ease-in-out infinite",
                    animationDelay: `${BUTTONS.indexOf(b) * 1.1}s`,
                    pointerEvents: "none",
                  }}
                />

                {/* Content */}
                <div
                  className="monolith-glow"
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "clamp(9px,1.5vh,15px)",
                    padding: "0 6px clamp(14px,2.4vh,22px)",
                    animation: "monolith-glow 3.6s ease-in-out infinite",
                    animationDelay: `${BUTTONS.indexOf(b) * 0.4}s`,
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "clamp(38px,4.4vw,54px)",
                      height: "clamp(38px,4.4vw,54px)",
                      marginTop: "clamp(10px,3vh,26px)",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `radial-gradient(circle, ${b.accentDim}33 0%, transparent 72%)`,
                      border: `1px solid ${b.accent}66`,
                    }}
                  >
                    <div
                      style={{
                        width: "58%",
                        height: "58%",
                        color: b.accent,
                        filter: `drop-shadow(0 0 6px ${b.accent}) drop-shadow(0 1px 1px rgba(0,0,0,0.8))`,
                      }}
                    >
                      {b.icon}
                    </div>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Rajdhani', 'Arial Narrow', sans-serif",
                      fontWeight: 700,
                      fontSize: "clamp(8.5px,1vw,11.5px)",
                      letterSpacing: "0.04em",
                      color: "#f1ecff",
                      textAlign: "center",
                      lineHeight: 1.2,
                      textShadow: `0 1px 1px rgba(0,0,0,0.9), 0 -1px 0 rgba(255,255,255,0.15), 0 0 10px ${b.accent}bb`,
                    }}
                  >
                    {b.label}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
