// Main hub screen shown after the splash/loading sequence. Layout and
// color-coding (purple = character/nexus, orange = map/energy, blue =
// missions) mirror the approved concept art: a symmetrical sci-fi/fantasy
// chamber with an empty ceremonial platform and clear side margins, onto
// which this component lays out the actual interactive HUD.
import { useState } from "react";

type NavKey = "character" | "map" | "missions" | "nexus";

const NAV: { key: NavKey; label: string; sub?: string; accent: string; accentDim: string; icon: JSX.Element }[] = [
  {
    key: "character",
    label: "CHARACTER",
    accent: "#b48cff",
    accentDim: "#5a3f99",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2l7 3v6c0 5-3 8.5-7 11-4-2.5-7-6-7-11V5l7-3z" />
        <path d="M9 11l2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "map",
    label: "MAP SELECTION",
    accent: "#ffab3d",
    accentDim: "#9a5f14",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.4" />
      </svg>
    ),
  },
  {
    key: "missions",
    label: "MISSIONS",
    accent: "#4db3ff",
    accentDim: "#1f5f8f",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3l8 14H4L12 3z" />
        <path d="M12 9l4.5 8h-9L12 9z" />
      </svg>
    ),
  },
  {
    key: "nexus",
    label: "NEXUS MODE",
    accent: "#b48cff",
    accentDim: "#5a3f99",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M12 3a5 5 0 1 1-5 5" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

const SIDE_NAV = [
  { label: "Core Vault", icon: "◆" },
  { label: "Tactical Lab", icon: "⚗" },
  { label: "Squad Log", icon: "▤" },
  { label: "Achievements", icon: "✦" },
  { label: "Codex Archive", icon: "▥" },
];

export default function Lobby({ visible }: { visible: boolean }) {
  const [active, setActive] = useState<NavKey>("character");

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
        @keyframes lobby-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
        .lobby-gem { transition: transform 0.18s ease, filter 0.18s ease; cursor: pointer; }
        .lobby-gem:hover { transform: translateY(-6px); }
        .lobby-side-item { transition: color 0.15s ease, transform 0.15s ease; cursor: pointer; }
        .lobby-side-item:hover { color: #eae6ff; transform: translateX(3px); }
        .lobby-icon-btn { transition: border-color 0.15s ease, color 0.15s ease; cursor: pointer; }
        .lobby-icon-btn:hover { border-color: #b48cff; color: #d9c8ff; }
        .lobby-deploy { transition: filter 0.15s ease, transform 0.1s ease; cursor: pointer; }
        .lobby-deploy:hover { filter: brightness(1.15); }
        .lobby-deploy:active { transform: translateY(1px); }
        @media (prefers-reduced-motion: reduce) {
          .lobby-ring-a, .lobby-ring-b, .lobby-pip { animation: none !important; }
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

      {/* ---------- Top-left: profile ---------- */}
      <div
        style={{
          position: "absolute",
          left: "clamp(12px,2.2vw,28px)",
          top: "clamp(10px,2vh,22px)",
          display: "flex",
          alignItems: "center",
          gap: "clamp(8px,1.1vw,14px)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "clamp(38px,5.2vw,58px)",
            height: "clamp(38px,5.2vw,58px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "1.5px solid rgba(180,140,255,0.55)",
              boxShadow: "0 0 12px rgba(140,90,255,0.45), inset 0 0 10px rgba(140,90,255,0.3)",
              background: "radial-gradient(circle at 35% 30%, #241a3d, #0a0714)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "22%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#b48cff",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: "100%", height: "100%" }}>
              <path d="M12 2l8 4v6c0 5.2-3.4 9-8 10-4.6-1-8-4.8-8-10V6l8-4z" />
            </svg>
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(11px,1.5vw,15px)",
              letterSpacing: "0.05em",
              color: "#f2eeff",
            }}
          >
            10SQUAD ASSISSAN
          </div>
          <div style={{ fontSize: "clamp(8.5px,1vw,10.5px)", color: "#9089ab", letterSpacing: "0.03em" }}>
            ID: 10SA-00001 &nbsp;·&nbsp; LV. 45
          </div>
          <div
            style={{
              marginTop: "4px",
              width: "clamp(90px,10vw,130px)",
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

      {/* ---------- Left: system core panel ---------- */}
      <div
        style={{
          position: "absolute",
          left: "clamp(10px,1.8vw,24px)",
          top: "clamp(78px,15vh,150px)",
          width: "clamp(140px,15vw,196px)",
          background: "rgba(9,7,18,0.6)",
          border: "1px solid rgba(140,100,255,0.22)",
          borderRadius: "8px",
          padding: "clamp(10px,1.4vh,16px) clamp(10px,1.2vw,14px)",
          backdropFilter: "blur(3px)",
        }}
      >
        <div
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(9px,1vw,11px)",
            letterSpacing: "0.16em",
            color: "#ffab3d",
            marginBottom: "clamp(8px,1.4vh,14px)",
          }}
        >
          ◈ SYSTEM CORE
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
          <div
            style={{
              position: "relative",
              width: "clamp(64px,7vw,84px)",
              height: "clamp(64px,7vw,84px)",
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
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset="0"
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ filter: "drop-shadow(0 0 4px rgba(255,171,61,0.7))" }}
              />
            </svg>
            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "clamp(13px,1.6vw,17px)" }}>
              100%
            </span>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: "clamp(8px,0.9vw,9.5px)", color: "#9089ab", letterSpacing: "0.08em" }}>
          SQUAD POWER
        </div>
        <div
          style={{
            textAlign: "center",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(14px,1.7vw,18px)",
            marginBottom: "8px",
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
            marginBottom: "clamp(10px,1.6vh,16px)",
          }}
        >
          <div style={{ width: "72%", height: "100%", background: "linear-gradient(90deg,#9a5f14,#ffab3d)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(6px,1vh,10px)" }}>
          {SIDE_NAV.map((item) => (
            <div
              key={item.label}
              className="lobby-side-item"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "clamp(9.5px,1.05vw,11.5px)",
                color: "#a99bd1",
                letterSpacing: "0.02em",
              }}
            >
              <span style={{ color: "#7c5fc4", fontSize: "11px", width: "12px", textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Top-right: clock, currency, icons ---------- */}
      <div style={{ position: "absolute", right: "clamp(12px,2.2vw,28px)", top: "clamp(10px,2vh,22px)", textAlign: "right" }}>
        <div
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 600,
            fontSize: "clamp(11px,1.3vw,14px)",
            color: "#c9bfe8",
            letterSpacing: "0.06em",
            marginBottom: "clamp(6px,1.2vh,12px)",
          }}
        >
          09:47 PM
        </div>

        <div style={{ display: "flex", gap: "clamp(5px,0.8vw,8px)", marginBottom: "clamp(6px,1vh,10px)" }}>
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
                gap: "6px",
                background: "rgba(9,7,18,0.65)",
                border: "1px solid rgba(140,100,255,0.22)",
                borderRadius: "999px",
                padding: "4px 10px 4px 4px",
              }}
            >
              <span
                style={{
                  width: "clamp(16px,2vw,20px)",
                  height: "clamp(16px,2vw,20px)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  color: c.color,
                  border: `1px solid ${c.color}66`,
                }}
              >
                {c.icon}
              </span>
              <span
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(10.5px,1.2vw,12.5px)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {c.val}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "clamp(5px,0.8vw,8px)", justifyContent: "flex-end" }}>
          {["shield", "mail", "gear"].map((k) => (
            <div
              key={k}
              className="lobby-icon-btn"
              style={{
                width: "clamp(28px,3.2vw,36px)",
                height: "clamp(28px,3.2vw,36px)",
                borderRadius: "6px",
                border: "1px solid rgba(140,100,255,0.25)",
                background: "rgba(9,7,18,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9089ab",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: "48%", height: "48%" }}>
                {k === "shield" && <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />}
                {k === "mail" && (
                  <>
                    <rect x="3" y="5" width="18" height="14" rx="1.5" />
                    <path d="M3.5 6l8.5 6 8.5-6" />
                  </>
                )}
                {k === "gear" && (
                  <>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
                  </>
                )}
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- Center: logo ---------- */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "clamp(8px,4vh,30px)",
          transform: "translateX(-50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ position: "relative", width: "clamp(180px,22vw,300px)", height: "clamp(90px,11vh,150px)" }}>
          <svg
            className="lobby-ring-a"
            viewBox="0 0 200 200"
            style={{
              position: "absolute",
              left: "50%",
              top: "10%",
              width: "clamp(140px,16vw,220px)",
              transformOrigin: "center",
              animation: "lobby-ring-spin 22s linear infinite",
              opacity: 0.65,
            }}
          >
            <circle cx="100" cy="100" r="92" fill="none" stroke="#ffab3d" strokeWidth="0.6" strokeDasharray="2 6" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="#ffab3d" strokeWidth="0.8" strokeDasharray="10 4" opacity="0.6" />
          </svg>
          <svg
            className="lobby-ring-b"
            viewBox="0 0 200 200"
            style={{
              position: "absolute",
              left: "50%",
              top: "16%",
              width: "clamp(105px,12.5vw,170px)",
              transformOrigin: "center",
              animation: "lobby-ring-spin-rev 16s linear infinite",
              opacity: 0.8,
            }}
          >
            <circle cx="100" cy="100" r="88" fill="none" stroke="#ffd9a0" strokeWidth="1.1" />
          </svg>

          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(30px,5.4vw,58px)",
              lineHeight: 0.85,
              letterSpacing: "0.02em",
              color: "#f4ede0",
              textShadow: "0 0 18px rgba(255,171,61,0.85), 0 0 40px rgba(255,140,30,0.5)",
              paddingTop: "clamp(10px,3vh,22px)",
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
              fontSize: "clamp(13px,2vw,22px)",
              letterSpacing: "0.14em",
              color: "#e9e4f5",
              marginTop: "2px",
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
              fontSize: "clamp(9px,1.3vw,14px)",
              letterSpacing: "0.32em",
              color: "#ffab3d",
            }}
          >
            ASSASSIN
          </div>
        </div>
      </div>

      {/* ---------- Center-bottom: gem nav buttons ---------- */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "clamp(78px,15vh,150px)",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "clamp(10px,1.6vw,20px)",
        }}
      >
        {NAV.map((item) => {
          const isActive = active === item.key;
          return (
            <div
              key={item.key}
              className="lobby-gem"
              onClick={() => setActive(item.key)}
              style={{
                position: "relative",
                width: "clamp(74px,8.6vw,108px)",
                height: "clamp(104px,12vh,150px)",
                clipPath: "polygon(50% 0%, 100% 22%, 100% 78%, 50% 100%, 0% 78%, 0% 22%)",
                background: isActive
                  ? `linear-gradient(160deg, rgba(20,14,34,0.95), rgba(6,4,12,0.95))`
                  : "linear-gradient(160deg, rgba(14,11,24,0.82), rgba(5,4,10,0.82))",
                border: `1px solid ${item.accent}`,
                boxShadow: isActive
                  ? `0 0 0 1px ${item.accent}55, 0 0 26px ${item.accent}88, 0 10px 24px rgba(0,0,0,0.5)`
                  : `0 0 10px ${item.accentDim}55, 0 6px 16px rgba(0,0,0,0.4)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(6px,1vh,10px)",
                padding: "0 6px",
              }}
            >
              <div style={{ width: "clamp(24px,2.8vw,34px)", height: "clamp(24px,2.8vw,34px)", color: item.accent }}>
                {item.icon}
              </div>
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontWeight: 700,
                  fontSize: "clamp(9px,1vw,11.5px)",
                  letterSpacing: "0.03em",
                  color: isActive ? item.accent : "#c7bfe0",
                  textAlign: "center",
                  lineHeight: 1.15,
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Right: live intel card ---------- */}
      <div
        style={{
          position: "absolute",
          right: "clamp(10px,1.8vw,24px)",
          top: "clamp(210px,42vh,420px)",
          width: "clamp(150px,16vw,210px)",
          background: "rgba(9,7,18,0.6)",
          border: "1px solid rgba(140,100,255,0.22)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: "clamp(9px,1vw,11px)",
            letterSpacing: "0.14em",
            color: "#ffab3d",
            padding: "clamp(8px,1.2vh,12px) clamp(10px,1.2vw,14px) clamp(6px,0.8vh,8px)",
          }}
        >
          ◈ LIVE INTEL
        </div>
        <div
          style={{
            width: "100%",
            aspectRatio: "16/10",
            backgroundImage: "url(/char-oni-full.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 18%",
          }}
        />
        <div style={{ padding: "clamp(8px,1.2vh,12px) clamp(10px,1.2vw,14px)" }}>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(11px,1.3vw,14px)",
              color: "#b48cff",
              letterSpacing: "0.03em",
            }}
          >
            DARK FRONTIER
          </div>
          <div style={{ fontSize: "clamp(8px,0.9vw,9.5px)", color: "#9089ab", letterSpacing: "0.08em", marginTop: "2px" }}>
            SEASON EVENT
          </div>
          <div style={{ display: "flex", gap: "4px", marginTop: "clamp(6px,1vh,10px)" }}>
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

      {/* ---------- Bottom-left: squad broadcast ---------- */}
      <div
        style={{
          position: "absolute",
          left: "clamp(10px,1.8vw,24px)",
          bottom: "clamp(10px,2vh,22px)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          background: "rgba(9,7,18,0.6)",
          border: "1px solid rgba(140,100,255,0.2)",
          borderRadius: "8px",
          padding: "clamp(7px,1vh,10px) clamp(10px,1.3vw,16px)",
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: "18px", height: "18px", color: "#7c5fc4" }} fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12h2l2-6 3 12 2-9 2 6 2-4h5" />
        </svg>
        <div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(9.5px,1.05vw,11.5px)",
              letterSpacing: "0.05em",
              color: "#e9e4f5",
            }}
          >
            SQUAD BROADCAST
          </div>
          <div style={{ fontSize: "clamp(8.5px,0.95vw,10px)", color: "#9089ab" }}>Stay sharp, Assissan.</div>
        </div>
      </div>

      {/* ---------- Bottom-right: deploy ---------- */}
      <button
        className="lobby-deploy"
        style={{
          position: "absolute",
          right: "clamp(10px,1.8vw,24px)",
          bottom: "clamp(10px,2vh,22px)",
          border: "none",
          padding: "2px",
          clipPath: "polygon(4% 0%, 96% 0%, 100% 50%, 96% 100%, 4% 100%, 0% 50%)",
          background: "linear-gradient(100deg, #b48cff, #ffd9a0 45%, #ffab3d)",
          boxShadow: "0 0 20px rgba(180,140,255,0.35), 0 0 22px rgba(255,171,61,0.3)",
        }}
      >
        <div
          style={{
            clipPath: "polygon(4% 0%, 96% 0%, 100% 50%, 96% 100%, 4% 100%, 0% 50%)",
            background: "linear-gradient(100deg, rgba(14,8,26,0.94), rgba(10,7,18,0.94))",
            padding: "clamp(9px,1.4vh,13px) clamp(24px,3.4vw,40px)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(14px,1.8vw,19px)",
              letterSpacing: "0.1em",
              background: "linear-gradient(100deg, #b48cff, #ffd9a0 50%, #ffab3d)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            DEPLOY NOW
          </div>
          <div style={{ fontSize: "clamp(7.5px,0.85vw,9px)", color: "#a99bd1", letterSpacing: "0.06em", marginTop: "1px" }}>
            THE MISSION AWAITS
          </div>
        </div>
      </button>
    </div>
  );
}
