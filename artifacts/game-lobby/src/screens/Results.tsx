import type { MatchResult, Sector } from "../state/progress";

interface Summary {
  sector: Sector;
  result: MatchResult;
  hostilesDown: number;
  xpEarned: number;
  creditsEarned: number;
  durationSec: number;
  rankedUp: boolean;
}

function StatRow({ label, value, color = "#eef4fa" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid rgba(140,160,200,0.15)" }}>
      <span style={{ color: "#8fa3c9", fontFamily: "'Barlow', sans-serif", fontSize: 13, letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ color, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15 }}>{value}</span>
    </div>
  );
}

export default function Results({ summary, onReturn }: { summary: Summary; onReturn: () => void }) {
  const won = summary.result === "victory";
  const mm = Math.floor(summary.durationSec / 60);
  const ss = summary.durationSec % 60;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: won ? "radial-gradient(ellipse at 50% 20%, #0e2436 0%, #050a12 70%)" : "radial-gradient(ellipse at 50% 20%, #2a0e0e 0%, #050a12 70%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "6vh 6vw",
      }}
    >
      <div style={{ color: "#8fa3c9", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: "0.2em" }}>
        {summary.sector.index} — {summary.sector.codename.toUpperCase()}
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(30px, 9vw, 46px)",
          letterSpacing: "0.12em",
          color: won ? "#6be2ff" : "#ff6b5e",
          textShadow: won ? "0 0 26px rgba(107,226,255,0.75)" : "0 0 26px rgba(255,107,94,0.75)",
        }}
      >
        {won ? "MISSION COMPLETE" : "MISSION FAILED"}
      </div>

      {summary.rankedUp && (
        <div
          style={{
            marginTop: 10,
            padding: "5px 16px",
            borderRadius: 999,
            background: "rgba(255,210,63,0.14)",
            border: "1px solid rgba(255,210,63,0.5)",
            color: "#ffd23f",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: "0.08em",
          }}
        >
          ★ RANK UP
        </div>
      )}

      <div style={{ marginTop: 26, width: "min(360px, 100%)", padding: "16px 20px", borderRadius: 12, background: "rgba(8,14,24,0.7)", border: "1px solid rgba(107,226,255,0.25)" }}>
        <StatRow label="HOSTILES ELIMINATED" value={String(summary.hostilesDown)} />
        <StatRow label="TIME IN SECTOR" value={`${mm}m ${ss.toString().padStart(2, "0")}s`} />
        <StatRow label="XP EARNED" value={`+${summary.xpEarned}`} color="#6be2ff" />
        <StatRow label="CREDITS EARNED" value={`+${summary.creditsEarned}`} color="#ffd23f" />
      </div>

      <button
        onClick={onReturn}
        style={{
          marginTop: 28,
          padding: "13px 44px",
          borderRadius: 8,
          border: "1px solid rgba(107,226,255,0.6)",
          background: "linear-gradient(90deg, #1a6fa8, #2fa8d8)",
          color: "#eafcff",
          fontFamily: "'Rajdhani', sans-serif",
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: "0.12em",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        RETURN TO BASE
      </button>
    </div>
  );
}
