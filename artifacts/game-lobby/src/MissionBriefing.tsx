import { useState } from "react";
import {
  MISSIONS,
  type Mission,
  type PlayerProgress,
  type ThreatLevel,
  isMissionUnlocked,
  effectiveMissionRewards,
} from "./progress";

const THREAT_COLORS: Record<ThreatLevel, string> = {
  Low: "#5adc8c",
  Moderate: "#ffd23f",
  High: "#ff9a4d",
  Extreme: "#ff6b5e",
};

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
      <rect x="4.5" y="10.5" width="15" height="10" rx="1.6" stroke="#9db0d4" strokeWidth="1.8" />
      <path d="M7.5 10.5V7.5a4.5 4.5 0 019 0v3" stroke="#9db0d4" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MissionCard({
  mission,
  progress,
  unlocked,
  selected,
  onSelect,
}: {
  mission: Mission;
  progress: PlayerProgress;
  unlocked: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const { xpBonus, creditsBonus } = effectiveMissionRewards(progress, mission);
  const completed = progress.missionsCompleted.includes(mission.id);

  return (
    <button
      onClick={unlocked ? onSelect : undefined}
      aria-label={mission.title}
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
        opacity: unlocked ? 1 : 0.55,
        transition: "border 120ms ease, box-shadow 120ms ease, background 120ms ease",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: "#6be2ff",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {mission.sector}
          </div>
          <div
            style={{
              color: "#eef4fa",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: "clamp(16px, 4vw, 19px)",
              letterSpacing: "0.02em",
              marginTop: 1,
            }}
          >
            {mission.title}
            {completed && (
              <span style={{ color: "#5adc8c", fontSize: 13, marginLeft: 8, fontWeight: 600 }}>✓ CLEARED</span>
            )}
          </div>
          <div style={{ color: "#8fa3c9", fontFamily: "'Barlow', sans-serif", fontSize: 12.5, marginTop: 2 }}>
            {mission.location}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 10px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.35)",
            border: `1px solid ${THREAT_COLORS[mission.threat]}55`,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: THREAT_COLORS[mission.threat],
              boxShadow: `0 0 6px ${THREAT_COLORS[mission.threat]}`,
            }}
          />
          <span
            style={{
              color: THREAT_COLORS[mission.threat],
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.08em",
            }}
          >
            {mission.threat.toUpperCase()}
          </span>
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: "1px solid rgba(140,160,200,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "#c8d4ea", fontFamily: "'Barlow', sans-serif", fontSize: 12, letterSpacing: "0.02em" }}>
          🎯 {mission.objective}
        </div>
        {unlocked ? (
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            <span style={{ color: "#ffd23f", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13 }}>
              +{xpBonus} XP
            </span>
            <span style={{ color: "#7fe0a8", fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13 }}>
              +{creditsBonus} CR
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            <LockIcon />
            <span style={{ color: "#9db0d4", fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, fontSize: 11.5 }}>
              {progress.level < mission.recommendedLevel
                ? `REQUIRES LEVEL ${mission.recommendedLevel}`
                : `REQUIRES HQ LV.${mission.requiredHqLevel}`}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

export default function MissionBriefing({
  progress,
  onClose,
  onDeploy,
}: {
  progress: PlayerProgress;
  onClose: () => void;
  onDeploy: (mission: Mission) => void;
}) {
  const [selectedId, setSelectedId] = useState<string>(() => {
    const firstUnlocked = MISSIONS.find((m) => isMissionUnlocked(progress, m));
    return firstUnlocked?.id ?? MISSIONS[0].id;
  });
  const selectedMission = MISSIONS.find((m) => m.id === selectedId) ?? null;
  const selectedUnlocked = selectedMission ? isMissionUnlocked(progress, selectedMission) : false;

  return (
    <div
      role="dialog"
      aria-label="Mission Briefing"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(4, 6, 16, 0.82)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        padding: "4vh 4vw",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(480px, 100%)",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(180deg, rgba(10,16,28,0.97), rgba(6,9,18,0.98))",
          border: "1px solid rgba(107,226,255,0.4)",
          borderRadius: 14,
          boxShadow: "0 0 60px rgba(40,120,180,0.3), inset 0 0 40px rgba(20,60,100,0.15)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px 14px",
            borderBottom: "1px solid rgba(107,226,255,0.2)",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "0.1em",
                color: "#6be2ff",
                textShadow: "0 0 18px rgba(107,226,255,0.6)",
              }}
            >
              MISSION BRIEFING
            </h2>
            <div style={{ color: "#8fa3c9", fontFamily: "'Barlow', sans-serif", fontSize: 12, marginTop: 2 }}>
              Select a sector to deploy into
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              borderRadius: "50%",
              border: "1px solid rgba(107,226,255,0.4)",
              background: "rgba(255,255,255,0.05)",
              color: "#eef4fa",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
          {MISSIONS.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              progress={progress}
              unlocked={isMissionUnlocked(progress, mission)}
              selected={mission.id === selectedId}
              onSelect={() => setSelectedId(mission.id)}
            />
          ))}
        </div>

        <div style={{ padding: "14px 20px 20px", flexShrink: 0 }}>
          <button
            onClick={() => selectedMission && selectedUnlocked && onDeploy(selectedMission)}
            disabled={!selectedMission || !selectedUnlocked}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 8,
              border: "1px solid rgba(107,226,255,0.6)",
              background: selectedUnlocked
                ? "linear-gradient(90deg, #1a6fa8, #2fa8d8)"
                : "rgba(120,130,150,0.2)",
              color: selectedUnlocked ? "#eafcff" : "#7a8494",
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "0.12em",
              cursor: selectedUnlocked ? "pointer" : "not-allowed",
              boxShadow: selectedUnlocked ? "0 0 22px rgba(47,168,216,0.45)" : "none",
            }}
          >
            {selectedUnlocked ? "DEPLOY" : "LOCKED"}
          </button>
        </div>
      </div>
    </div>
  );
}
