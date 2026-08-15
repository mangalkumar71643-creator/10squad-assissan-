import { useState, type ReactNode } from "react";
import {
  OUTPOST_BUILDINGS,
  OUTPOST_BUILDING_ORDER,
  outpostUpgradeCost,
  type OutpostBuildingId,
  type PlayerProgress,
} from "../state/progress";

const ICONS: Record<OutpostBuildingId, ReactNode> = {
  command: (
    <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none">
      <path d="M4 11L12 4l8 7" stroke="#6be2ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9.5h12V10" stroke="#6be2ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="14" width="4" height="5.5" stroke="#6be2ff" strokeWidth="1.4" />
    </svg>
  ),
  armory: (
    <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none">
      <rect x="3.5" y="9" width="17" height="10" rx="1.4" stroke="#ff9a4d" strokeWidth="1.8" />
      <path d="M7 9V6.5a5 5 0 0110 0V9" stroke="#ff9a4d" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="14" r="1.6" fill="#ff9a4d" />
    </svg>
  ),
  labs: (
    <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none">
      <circle cx="11" cy="11" r="6.5" stroke="#c9a8ff" strokeWidth="1.8" />
      <path d="M20 20l-4.6-4.6" stroke="#c9a8ff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M11 7.5v7M7.5 11h7" stroke="#c9a8ff" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  depot: (
    <svg viewBox="0 0 24 24" width="60%" height="60%" fill="none">
      <path d="M3.5 8L12 3.5 20.5 8v9L12 21.5 3.5 17V8z" stroke="#7fe0a8" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M3.5 8L12 12.5 20.5 8M12 12.5V21.5" stroke="#7fe0a8" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
};

const ACCENT: Record<OutpostBuildingId, string> = {
  command: "#6be2ff",
  armory: "#ff9a4d",
  labs: "#c9a8ff",
  depot: "#7fe0a8",
};

function BuildingTile({ id, level, selected, onSelect }: { id: OutpostBuildingId; level: number; selected: boolean; onSelect: () => void }) {
  const def = OUTPOST_BUILDINGS[id];
  const accent = ACCENT[id];
  const maxed = level >= def.maxLevel;
  return (
    <button
      onClick={onSelect}
      aria-label={def.name}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "16px 8px 12px",
        borderRadius: 10,
        border: selected ? `1.5px solid ${accent}` : "1px solid rgba(140,160,200,0.28)",
        background: "rgba(10,14,26,0.7)",
        boxShadow: selected ? `0 0 22px ${accent}55` : maxed ? `0 0 14px ${accent}30` : "none",
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.4)",
          border: `1px solid ${accent}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {ICONS[id]}
      </div>
      <div style={{ color: "#eef4fa", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12.5 }}>{def.tag}</div>
      <div style={{ padding: "1px 8px", borderRadius: 999, background: "rgba(0,0,0,0.4)", color: accent, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 11 }}>
        {maxed ? "MAX" : `LV. ${level}`}
      </div>
    </button>
  );
}

export default function Base({
  progress,
  onUpgrade,
  onBack,
}: {
  progress: PlayerProgress;
  onUpgrade: (id: OutpostBuildingId) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<OutpostBuildingId>("command");
  const def = OUTPOST_BUILDINGS[selected];
  const level = progress.outpost[selected];
  const maxed = level >= def.maxLevel;
  const cost = outpostUpgradeCost(selected, level);
  const canAfford = progress.credits >= cost;
  const accent = ACCENT[selected];

  return (
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, #0a1220 0%, #060a14 100%)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5vh 5vw 14px", flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "0.1em", color: "#6be2ff" }}>
            OUTPOST
          </h1>
          <div style={{ color: "#ffd23f", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13 }}>{progress.credits.toLocaleString()} CREDITS</div>
        </div>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{ width: 34, height: 34, borderRadius: "50%", border: "1px solid rgba(107,226,255,0.4)", background: "rgba(255,255,255,0.05)", color: "#eef4fa", fontSize: 18, cursor: "pointer" }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: "6px 5vw", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {OUTPOST_BUILDING_ORDER.map((id) => (
          <BuildingTile key={id} id={id} level={progress.outpost[id]} selected={id === selected} onSelect={() => setSelected(id)} />
        ))}
      </div>

      <div style={{ padding: "18px 5vw calc(3vh + env(safe-area-inset-bottom))", flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
        <div style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${accent}40`, background: "rgba(0,0,0,0.3)" }}>
          <div style={{ color: "#eef4fa", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16 }}>
            {def.name} — LV.{level}
          </div>
          <div style={{ color: "#9db0d4", fontFamily: "'Barlow', sans-serif", fontSize: 12.5, marginTop: 6, lineHeight: 1.4 }}>{def.description}</div>
          <div style={{ color: accent, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12.5, marginTop: 8 }}>CURRENT: {def.effectAtLevel(level)}</div>
          {!maxed && <div style={{ color: "#7fe0a8", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 12.5, marginTop: 2 }}>NEXT: {def.effectAtLevel(level + 1)}</div>}
        </div>

        <button
          onClick={() => !maxed && canAfford && onUpgrade(selected)}
          disabled={maxed || !canAfford}
          style={{
            width: "100%",
            marginTop: 12,
            padding: "13px 0",
            borderRadius: 8,
            border: `1px solid ${maxed ? "rgba(140,160,200,0.3)" : accent + "99"}`,
            background: maxed ? "rgba(120,130,150,0.15)" : canAfford ? `linear-gradient(90deg, ${accent}99, ${accent})` : "rgba(120,130,150,0.2)",
            color: maxed || !canAfford ? "#7a8494" : "#08131a",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.1em",
            cursor: maxed || !canAfford ? "not-allowed" : "pointer",
          }}
        >
          {maxed ? "MAX LEVEL" : `UPGRADE — ${cost.toLocaleString()} CREDITS`}
        </button>
      </div>
    </div>
  );
}
