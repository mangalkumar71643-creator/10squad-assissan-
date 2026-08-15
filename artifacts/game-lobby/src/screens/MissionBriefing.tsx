import { useState } from "react";
import {
  SECTORS,
  type Sector,
  type PlayerProgress,
  type ThreatTier,
  isSectorUnlocked,
  effectiveSectorReward,
  threatLabel,
} from "../state/progress";

const TIER_COLOR: Record<ThreatTier, string> = { 1: "#5adc8c", 2: "#ffd23f", 3: "#ff9a4d", 4: "#ff6b5e" };

function SectorCard({
  sector,
  progress,
  unlocked,
  selected,
  onSelect,
}: {
  sector: Sector;
  progress: PlayerProgress;
  unlocked: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { xp, credits } = effectiveSectorReward(progress, sector);
  const cleared = progress.sectorsCleared.includes(sector.id);
  const color = TIER_COLOR[sector.tier];

  return (
    <button
      onClick={unlocked ? onSelect : undefined}
      aria-label={sector.codename}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "14px 16px",
        borderRadius: 10,
        border: selected ? "1.5px solid rgba(107,226,255,0.85)" : "1px solid rgba(140,160,200,0.28)",
        background: selected ? "linear-gradient(135deg, rgba(20,40,60,0.85), rgba(10,16,30,0.9))" : "rgba(10,14,26,0.6)",
        boxShadow: selected ? "0 0 22px rgba(107,226,255,0.25)" : "none",
        cursor: unlocked ? "pointer" : "default",
        opacity: unlocked ? 1 : 0.5,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#6be2ff", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: "0.14em" }}>
            {sector.index}
          </div>
          <div style={{ color: "#eef4fa", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: "clamp(16px, 4vw, 19px)" }}>
            {sector.codename}
            {cleared && <span style={{ color: "#5adc8c", fontSize: 12, marginLeft: 8 }}>✓ CLEARED</span>}
          </div>
        </div>
        <div
          style={{
            flexShrink: 0,
            height: "fit-content",
            padding: "3px 10px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.35)",
            border: `1px solid ${color}55`,
            color,
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 11,
          }}
        >
          {threatLabel(sector.tier).toUpperCase()}
        </div>
      </div>

      <div style={{ color: "#9db0d4", fontFamily: "'Barlow', sans-serif", fontSize: 12.5, marginTop: 6, lineHeight: 1.4 }}>
        {sector.briefing}
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid rgba(140,160,200,0.18)",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ color: "#c8d4ea", fontFamily: "'Barlow', sans-serif", fontSize: 12 }}>
          🎯 Eliminate hostiles, extract
        </span>
        {unlocked ? (
          <div style={{ display: "flex", gap: 12 }}>
            <span style={{ color: "#ffd23f", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13 }}>+{xp} XP</span>
            <span style={{ color: "#7fe0a8", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13 }}>+{credits} CR</span>
          </div>
        ) : (
          <span style={{ color: "#9db0d4", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: 11.5 }}>
            🔒{" "}
            {progress.rank < sector.rankRecommended
              ? `REQUIRES RANK ${sector.rankRecommended}`
              : `REQUIRES COMMAND LV.${sector.commandLevelRequired}`}
          </span>
        )}
      </div>
    </button>
  );
}

export default function MissionBriefing({
  progress,
  onBack,
  onDeploy,
}: {
  progress: PlayerProgress;
  onBack: () => void;
  onDeploy: (sector: Sector) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(() => SECTORS.find((s) => isSectorUnlocked(progress, s))?.id ?? SECTORS[0].id);
  const selected = SECTORS.find((s) => s.id === selectedId) ?? null;
  const selectedUnlocked = selected ? isSectorUnlocked(progress, selected) : false;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, #0a1220 0%, #060a14 100%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "5vh 5vw 14px",
          flexShrink: 0,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 22, letterSpacing: "0.1em", color: "#6be2ff" }}>
            MISSION BRIEFING
          </h1>
          <div style={{ color: "#8fa3c9", fontFamily: "'Barlow', sans-serif", fontSize: 12 }}>Select a sector to deploy into</div>
        </div>
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "1px solid rgba(107,226,255,0.4)",
            background: "rgba(255,255,255,0.05)",
            color: "#eef4fa",
            fontSize: 18,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 5vw 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {SECTORS.map((sector) => (
          <SectorCard
            key={sector.id}
            sector={sector}
            progress={progress}
            unlocked={isSectorUnlocked(progress, sector)}
            selected={sector.id === selectedId}
            onSelect={() => setSelectedId(sector.id)}
          />
        ))}
      </div>

      <div style={{ padding: "14px 5vw calc(3vh + env(safe-area-inset-bottom))", flexShrink: 0 }}>
        <button
          onClick={() => selected && selectedUnlocked && onDeploy(selected)}
          disabled={!selected || !selectedUnlocked}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: 8,
            border: "1px solid rgba(107,226,255,0.6)",
            background: selectedUnlocked ? "linear-gradient(90deg, #1a6fa8, #2fa8d8)" : "rgba(120,130,150,0.2)",
            color: selectedUnlocked ? "#eafcff" : "#7a8494",
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "0.12em",
            cursor: selectedUnlocked ? "pointer" : "not-allowed",
          }}
        >
          {selectedUnlocked ? "DEPLOY" : "LOCKED"}
        </button>
      </div>
    </div>
  );
}
