import { useState } from "react";
import {
  type PlayerProgress,
  type Sector,
  type MatchResult,
  loadProgress,
  saveProgress,
  grantXp,
  KILL_XP,
  KILL_CREDITS,
  effectiveSectorReward,
  type OutpostBuildingId,
  OUTPOST_BUILDINGS,
  outpostUpgradeCost,
} from "./state/progress";
import Hub from "./screens/Hub";
import MissionBriefing from "./screens/MissionBriefing";
import Base from "./screens/Base";
import Results from "./screens/Results";
import CombatScene, { type CombatOutcome } from "./combat/CombatScene";

type Screen = "hub" | "briefing" | "base" | "combat" | "results";

interface Deployment {
  sector: Sector;
  xpBonus: number;
  creditsBonus: number;
}

interface ResultSummary {
  sector: Sector;
  result: MatchResult;
  hostilesDown: number;
  xpEarned: number;
  creditsEarned: number;
  durationSec: number;
  rankedUp: boolean;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("hub");
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [lastResult, setLastResult] = useState<ResultSummary | null>(null);

  const handleDeploy = (sector: Sector) => {
    const { xp, credits } = effectiveSectorReward(progress, sector);
    setDeployment({ sector, xpBonus: xp, creditsBonus: credits });
    setScreen("combat");
  };

  const handleCombatEnd = (outcome: CombatOutcome) => {
    if (!deployment) return;
    const { sector, xpBonus, creditsBonus } = deployment;
    const won = outcome.result === "victory";
    const xpEarned = outcome.hostilesDown * KILL_XP + (won ? xpBonus : 0);
    const creditsEarned = outcome.hostilesDown * KILL_CREDITS + (won ? creditsBonus : 0);

    setProgress((prev) => {
      const rankBefore = prev.rank;
      const ranked = grantXp(prev, xpEarned);
      const record = {
        sectorId: sector.id,
        result: outcome.result,
        hostilesDown: outcome.hostilesDown,
        xpEarned,
        creditsEarned,
        durationSec: outcome.durationSec,
        timestamp: Date.now(),
      };
      const next: PlayerProgress = {
        ...prev,
        ...ranked,
        credits: prev.credits + creditsEarned,
        hostilesEliminated: prev.hostilesEliminated + outcome.hostilesDown,
        sectorsCleared: won && !prev.sectorsCleared.includes(sector.id) ? [...prev.sectorsCleared, sector.id] : prev.sectorsCleared,
        history: [record, ...prev.history].slice(0, 12),
      };
      saveProgress(next);
      setLastResult({
        sector,
        result: outcome.result,
        hostilesDown: outcome.hostilesDown,
        xpEarned,
        creditsEarned,
        durationSec: outcome.durationSec,
        rankedUp: ranked.rank > rankBefore,
      });
      return next;
    });
    setScreen("results");
  };

  const handleUpgrade = (id: OutpostBuildingId) => {
    setProgress((prev) => {
      const level = prev.outpost[id];
      const def = OUTPOST_BUILDINGS[id];
      const cost = outpostUpgradeCost(id, level);
      if (level >= def.maxLevel || prev.credits < cost) return prev;
      const next: PlayerProgress = { ...prev, credits: prev.credits - cost, outpost: { ...prev.outpost, [id]: level + 1 } };
      saveProgress(next);
      return next;
    });
  };

  const returnToHub = () => {
    setDeployment(null);
    setLastResult(null);
    setScreen("hub");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "#050a12",
        overflow: "hidden",
      }}
    >
      {screen === "hub" && (
        <Hub progress={progress} onDeploy={() => setScreen("briefing")} onOpenBase={() => setScreen("base")} />
      )}
      {screen === "briefing" && (
        <MissionBriefing progress={progress} onBack={returnToHub} onDeploy={handleDeploy} />
      )}
      {screen === "base" && <Base progress={progress} onUpgrade={handleUpgrade} onBack={returnToHub} />}
      {screen === "combat" && deployment && (
        <CombatScene sector={deployment.sector} rewardXpPreview={deployment.xpBonus} rewardCreditsPreview={deployment.creditsBonus} onComplete={handleCombatEnd} />
      )}
      {screen === "results" && lastResult && <Results summary={lastResult} onReturn={returnToHub} />}
    </div>
  );
}
