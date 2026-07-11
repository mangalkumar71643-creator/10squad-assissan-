// Main hub screen shown after the splash/loading sequence. Layout and
// color-coding (purple = character/nexus, orange = map/energy, blue =
// missions) mirror the approved concept art: a symmetrical sci-fi/fantasy
// chamber with an empty ceremonial platform and clear side margins, onto
// which this component lays out the actual interactive HUD.
//
// Left/right HUD columns are top-anchored flex stacks (not independently
// guessed vh offsets) so nothing collides on short, wide landscape phone
// viewports where vh-based positioning used to push panels into each other.

const SIDE_NAV: { label: string; icon: JSX.Element }[] = [
  {
    label: "Core Vault",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2.5l8.5 4.9v9.2L12 21.5l-8.5-4.9V7.4L12 2.5z" />
        <path d="M12 8l3.2 1.9v3.8L12 15.6l-3.2-1.9V9.9L12 8z" />
      </svg>
    ),
  },
  {
    label: "Tactical Lab",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9.5 3h5M10.5 3v5.5L6.8 15c-.7 1.3.2 2.9 1.7 2.9h7c1.5 0 2.4-1.6 1.7-2.9L13.5 8.5V3" />
        <path d="M8.7 13.5h6.6" />
      </svg>
    ),
  },
  {
    label: "Squad Log",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4.5" y="3" width="15" height="18" rx="1.2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </svg>
    ),
  },
  {
    label: "Achievements",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 2.5l2.4 5 5.4.6-4 3.8 1 5.4L12 14.6 7.2 17.3l1-5.4-4-3.8 5.4-.6L12 2.5z" />
      </svg>
    ),
  },
  {
    label: "Codex Archive",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 4.5h9.5A3.5 3.5 0 0 1 18 8v11.5H8.5A3.5 3.5 0 0 1 5 16V4.5z" />
        <path d="M5 4.5v11.5A3.5 3.5 0 0 0 8.5 19.5H18" />
        <path d="M8 8.5h6.5M8 11.5h6.5" />
      </svg>
    ),
  },
];

const TICKS = Array.from({ length: 20 }, (_, i) => i);

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
        fontFamily: "'Barlow', sans-serif",
        color: "#eae6ff",
      }}
    >
      <style>{`
        @keyframes lobby-ring-spin {
          from { transform: translateX(-50%) rotate(0deg); }
          to { transform: translateX(-50%) rotate(360deg); }
        }
        @keyframes lobby-ring-spin-rev {
          from { transform: translateX(-50%) rotate(360deg); }
          to { transform: translateX(-50%) rotate(0deg); }
        }
        @keyframes lobby-avatar-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes lobby-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        @keyframes lobby-beam {
          0%, 100% { opacity: 0.4; transform: scaleY(0.9); }
          50% { opacity: 0.9; transform: scaleY(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lobby-ring-a, .lobby-ring-b, .lobby-pip, .lobby-avatar-ring, .lobby-beam { animation: none !important; }
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
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(4,3,10,0.35) 0%, rgba(4,3,10,0.05) 22%, rgba(4,3,10,0.1) 60%, rgba(4,3,10,0.75) 100%)",
        }}
      />

      {/* ---------- Left column: profile + system core (top-anchored, natural height) ---------- */}
      <div
        style={{
          position: "absolute",
          left: "clamp(10px,1.8vw,24px)",
          top: "clamp(8px,1.6vh,18px)",
          width: "clamp(136px,14.4vw,190px)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(6px,1.2vh,12px)",
          maxHeight: "calc(100% - clamp(50px,9vh,72px))",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(7px,1vw,12px)" }}>
          <div style={{ position: "relative", width: "clamp(34px,4.6vw,50px)", height: "clamp(34px,4.6vw,50px)", flexShrink: 0 }}>
            <svg
              className="lobby-avatar-ring"
              viewBox="0 0 100 100"
              style={{ position: "absolute", inset: 0, animation: "lobby-avatar-spin 30s linear infinite" }}
            >
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(180,140,255,0.35)" strokeWidth="1" />
              {TICKS.map((i) => {
                const a = (i / TICKS.length) * Math.PI * 2;
                const x1 = 50 + Math.cos(a) * 47,
                  y1 = 50 + Math.sin(a) * 47;
                const x2 = 50 + Math.cos(a) * 43,
                  y2 = 50 + Math.sin(a) * 43;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b48cff" strokeWidth="1.2" opacity="0.6" />;
              })}
            </svg>
            <div
              style={{
                position: "absolute",
                inset: "12%",
                borderRadius: "50%",
                background: "radial-gradient(circle at 35% 30%, #241a3d, #0a0714)",
                border: "1px solid rgba(180,140,255,0.5)",
                boxShadow: "0 0 10px rgba(140,90,255,0.45), inset 0 0 8px rgba(140,90,255,0.3)",
              }}
            />
            <div style={{ position: "absolute", inset: "30%", display: "flex", alignItems: "center", justifyContent: "center", color: "#b48cff" }}>
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "100%", height: "100%" }}>
                <path d="M12 2l9 5v6c0 5.5-3.8 9.5-9 11-5.2-1.5-9-5.5-9-11V7l9-5z" opacity="0.18" />
                <path d="M12 4.5l6.3 3.5v4.1c0 4-2.7 6.9-6.3 8-3.6-1.1-6.3-4-6.3-8V8l6.3-3.5z" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(10.5px,1.4vw,14px)",
                letterSpacing: "0.05em",
                color: "#f2eeff",
                whiteSpace: "nowrap",
              }}
            >
              10SQUAD ASSISSAN
            </div>
            <div style={{ fontSize: "clamp(8px,0.95vw,10px)", color: "#9089ab", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
              ID: 10SA-00001 · LV. 45
            </div>
            <div
              style={{
                marginTop: "4px",
                width: "clamp(70px,8vw,110px)",
                height: "3px",
                borderRadius: "2px",
                background: "rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div style={{ width: "58%", height: "100%", background: "linear-gradient(90deg,#5a3f99,#b48cff)" }} />
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(9,7,18,0.62)",
            border: "1px solid rgba(140,100,255,0.22)",
            borderRadius: "8px",
            padding: "clamp(8px,1.2vh,14px) clamp(9px,1.1vw,13px)",
            backdropFilter: "blur(3px)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(8.5px,0.95vw,10.5px)",
              letterSpacing: "0.16em",
              color: "#ffab3d",
              marginBottom: "clamp(6px,1vh,10px)",
            }}
          >
            ◈ SYSTEM CORE
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
            <div
              style={{
                position: "relative",
                width: "clamp(48px,5.6vw,68px)",
                height: "clamp(48px,5.6vw,68px)",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0 }}>
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#ffab3d"
                  strokeWidth="3"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ filter: "drop-shadow(0 0 4px rgba(255,171,61,0.7))" }}
                />
              </svg>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "clamp(11px,1.4vw,15px)" }}>100%</span>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: "clamp(7.5px,0.85vw,9px)", color: "#9089ab", letterSpacing: "0.08em" }}>
            SQUAD POWER
          </div>
          <div
            style={{
              textAlign: "center",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(12.5px,1.5vw,16px)",
              marginBottom: "6px",
            }}
          >
            8,750
          </div>
          <div
            style={{
              width: "100%",
              height: "3px",
              borderRadius: "2px",
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
              marginBottom: "clamp(7px,1.1vh,12px)",
            }}
          >
            <div style={{ width: "72%", height: "100%", background: "linear-gradient(90deg,#9a5f14,#ffab3d)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "clamp(4px,0.8vh,8px)" }}>
            {SIDE_NAV.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  fontSize: "clamp(8.5px,0.98vw,10.5px)",
                  color: "#a99bd1",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: "#7c5fc4", width: "12px", height: "12px", flexShrink: 0 }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Bottom-left: squad broadcast (independent, fixed footprint) ---------- */}
      <div
        style={{
          position: "absolute",
          left: "clamp(10px,1.8vw,24px)",
          bottom: "clamp(8px,1.6vh,18px)",
          display: "flex",
          alignItems: "center",
          gap: "9px",
          background: "rgba(9,7,18,0.68)",
          border: "1px solid rgba(140,100,255,0.2)",
          borderRadius: "8px",
          padding: "clamp(6px,0.9vh,9px) clamp(9px,1.2vw,14px)",
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px", flexShrink: 0, color: "#7c5fc4" }} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12h2l2-6 3 12 2-9 2 6 2-4h5" />
        </svg>
        <div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(9px,1vw,11px)",
              letterSpacing: "0.05em",
              color: "#e9e4f5",
              whiteSpace: "nowrap",
            }}
          >
            SQUAD BROADCAST
          </div>
          <div style={{ fontSize: "clamp(8px,0.9vw,9.5px)", color: "#9089ab", whiteSpace: "nowrap" }}>Stay sharp, Assissan.</div>
        </div>
      </div>

      {/* ---------- Right column: clock/currency/icons + live intel (top-anchored, natural height) ---------- */}
      <div
        style={{
          position: "absolute",
          right: "clamp(10px,1.8vw,24px)",
          top: "clamp(8px,1.6vh,18px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "clamp(10px,1.8vh,18px)",
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600,
              fontSize: "clamp(10px,1.2vw,13px)",
              color: "#c9bfe8",
              letterSpacing: "0.06em",
              marginBottom: "clamp(5px,1vh,10px)",
            }}
          >
            09:47 PM
          </div>

          <div style={{ display: "flex", gap: "clamp(5px,0.8vw,8px)", marginBottom: "clamp(4px,0.7vh,7px)" }}>
            {[
              { icon: "▲", val: "4,280", color: "#b48cff" },
              { icon: "◈", val: "125,750", color: "#ffab3d" },
              { icon: "◆", val: "215", color: "#4db3ff" },
            ].map((c) => (
              <div
                key={c.val}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  width: "clamp(56px,6.4vw,78px)",
                  height: "clamp(22px,2.6vw,30px)",
                  clipPath: "polygon(22% 0%,78% 0%,100% 50%,78% 100%,22% 100%,0% 50%)",
                  background: `linear-gradient(155deg, ${c.color}66, rgba(9,7,18,0.9))`,
                  border: `1px solid ${c.color}cc`,
                  boxShadow: `0 0 10px ${c.color}66, inset 0 1px 0 ${c.color}55`,
                }}
              >
                <span style={{ fontSize: "10px", color: c.color }}>{c.icon}</span>
                <span
                  style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 700,
                    fontSize: "clamp(9.5px,1.1vw,11.5px)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {c.val}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: "clamp(130px,14vw,182px)",
            background: "rgba(9,7,18,0.62)",
            border: "1px solid rgba(140,100,255,0.22)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(8.5px,0.95vw,10.5px)",
              letterSpacing: "0.14em",
              color: "#ffab3d",
              padding: "clamp(7px,1vh,10px) clamp(9px,1.1vw,13px) clamp(5px,0.7vh,7px)",
            }}
          >
            ◈ LIVE INTEL
          </div>
          <div
            style={{
              width: "100%",
              aspectRatio: "16/9",
              backgroundImage: "url(/lobby-intel-thumb.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div style={{ padding: "clamp(7px,1vh,10px) clamp(9px,1.1vw,13px)" }}>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: "clamp(10px,1.2vw,13px)",
                color: "#b48cff",
                letterSpacing: "0.03em",
              }}
            >
              DARK FRONTIER
            </div>
            <div style={{ fontSize: "clamp(7.5px,0.85vw,9px)", color: "#9089ab", letterSpacing: "0.08em", marginTop: "2px" }}>
              SEASON EVENT
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "clamp(5px,0.8vh,8px)" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="lobby-pip"
                  style={{
                    width: "5px",
                    height: "5px",
                    borderRadius: "50%",
                    background: i === 0 ? "#ffab3d" : "rgba(255,255,255,0.2)",
                    animation: i === 0 ? "lobby-pulse 2.4s ease-in-out infinite" : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Center: logo ---------- */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "clamp(4px,3vh,26px)",
          transform: "translateX(-50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ position: "relative", width: "clamp(170px,20vw,290px)", height: "clamp(80px,10vh,140px)" }}>
          <svg
            className="lobby-ring-a"
            viewBox="0 0 200 200"
            style={{
              position: "absolute",
              left: "50%",
              top: "6%",
              width: "clamp(150px,18vw,250px)",
              transformOrigin: "center",
              animation: "lobby-ring-spin 22s linear infinite",
              opacity: 0.7,
            }}
          >
            <circle cx="100" cy="100" r="94" fill="none" stroke="#ffab3d" strokeWidth="0.7" strokeDasharray="1 5" />
            <circle cx="100" cy="100" r="78" fill="none" stroke="#ffab3d" strokeWidth="0.9" strokeDasharray="12 5" opacity="0.6" />
            <circle cx="100" cy="100" r="62" fill="none" stroke="#ffd9a0" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.4" />
          </svg>
          <svg
            className="lobby-ring-b"
            viewBox="0 0 200 200"
            style={{
              position: "absolute",
              left: "50%",
              top: "12%",
              width: "clamp(112px,13vw,180px)",
              transformOrigin: "center",
              animation: "lobby-ring-spin-rev 16s linear infinite",
              opacity: 0.85,
            }}
          >
            <circle cx="100" cy="100" r="88" fill="none" stroke="#ffe4b8" strokeWidth="1.3" />
          </svg>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(28px,5vw,54px)",
              lineHeight: 0.85,
              letterSpacing: "0.02em",
              color: "#f6efe2",
              textShadow:
                "1px 1px 0 rgba(255,120,20,0.55), -1px -1px 0 rgba(255,190,90,0.3), 0 0 20px rgba(255,171,61,0.9), 0 0 44px rgba(255,140,30,0.55)",
              paddingTop: "clamp(9px,2.6vh,20px)",
            }}
          >
            10
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(12px,1.9vw,20px)",
              letterSpacing: "0.14em",
              color: "#e9e4f5",
              marginTop: "1px",
            }}
          >
            SQUAD
          </div>
          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 600,
              fontSize: "clamp(8.5px,1.25vw,13px)",
              letterSpacing: "0.32em",
              color: "#ffab3d",
            }}
          >
            ASSASSIN
          </div>

          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "clamp(-30px,-4vh,-16px)",
              transform: "translateX(-50%)",
              width: "14px",
              height: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <svg viewBox="0 0 20 20" style={{ width: "10px", height: "10px", color: "#ffab3d" }}>
              <path d="M10 2l8 16H2L10 2z" fill="currentColor" opacity="0.85" />
            </svg>
            <div
              className="lobby-beam"
              style={{
                width: "1.5px",
                height: "clamp(18px,3vh,34px)",
                background: "linear-gradient(180deg, #ffd9a0, rgba(255,171,61,0))",
                animation: "lobby-beam 2.6s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
