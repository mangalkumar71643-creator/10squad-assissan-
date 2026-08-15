// Single source of truth for the player's persistent save data: level/XP,
// match history, credits, base building levels and mission unlocks. Lives
// outside Lobby.tsx (and outside MissionBriefing.tsx/Base.tsx) so all three
// can import it without creating a module cycle.

export const PLAYER_PROGRESS_STORAGE_KEY = "10sa-player-progress";

export const KILL_XP = 40;
export const WIN_XP_BONUS = 150;
export const CREDITS_PER_KILL = 20;
export const WIN_CREDITS_BONUS = 300;

export const MATCH_HISTORY_LIMIT = 10;

export type MatchHistoryEntry = {
  result: "win" | "lose";
  kills: number;
  xp: number;
  credits: number;
  durationSec: number;
  damage: number;
  missionId: string | null;
  timestamp: number;
};

export type BuildingId = "hq" | "armory" | "research" | "storage";

export type PlayerProgress = {
  level: number;
  xp: number;
  xpNext: number;
  kills: number;
  wins: number;
  matches: number;
  history: MatchHistoryEntry[];
  credits: number;
  buildingLevels: Record<BuildingId, number>;
  missionsCompleted: string[];
};

export function xpNextForLevel(level: number): number {
  return 800 + (level - 1) * 150;
}

const RANK_TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond"];
export function rankForLevel(level: number): string {
  const tierIndex = Math.min(RANK_TIERS.length - 1, Math.floor((level - 1) / 5));
  const numerals = ["I", "II", "III"];
  const subIndex = (level - 1) % 3;
  return `${RANK_TIERS[tierIndex]} ${numerals[subIndex]}`;
}

export const BUILDING_IDS: BuildingId[] = ["hq", "armory", "research", "storage"];

export interface BuildingDef {
  id: BuildingId;
  name: string;
  shortName: string;
  description: string;
  effectLabel: (level: number) => string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
}

// Every building has a real, verifiable effect on future missions (applied
// in Lobby.tsx's reward calculation / MissionBriefing's unlock check) —
// none of these are cosmetic-only placeholders.
export const BUILDING_DEFS: Record<BuildingId, BuildingDef> = {
  hq: {
    id: "hq",
    name: "Headquarters",
    shortName: "HQ",
    description: "Command center. Its level gates which facility sectors squad command will authorize you to deploy into.",
    effectLabel: (level) => `Unlocks sectors requiring HQ Lv.${level}`,
    maxLevel: 6,
    baseCost: 300,
    costGrowth: 1.4,
  },
  armory: {
    id: "armory",
    name: "Armory",
    shortName: "ARMORY",
    description: "Weapon fabrication bay. Each level improves the salvage value of every kill.",
    effectLabel: (level) => `+${level * 8}% credits per kill`,
    maxLevel: 10,
    baseCost: 250,
    costGrowth: 1.32,
  },
  research: {
    id: "research",
    name: "Research Lab",
    shortName: "RESEARCH",
    description: "Combat data analysis. Each level improves XP earned from every mission.",
    effectLabel: (level) => `+${level * 6}% mission XP`,
    maxLevel: 10,
    baseCost: 280,
    costGrowth: 1.32,
  },
  storage: {
    id: "storage",
    name: "Storage Depot",
    shortName: "STORAGE",
    description: "Logistics warehouse. Each level adds a flat credit stipend to every completed mission.",
    effectLabel: (level) => `+${level * 25} credits per mission`,
    maxLevel: 10,
    baseCost: 200,
    costGrowth: 1.3,
  },
};

export function buildingUpgradeCost(id: BuildingId, currentLevel: number): number {
  const def = BUILDING_DEFS[id];
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel - 1));
}

export type ThreatLevel = "Low" | "Moderate" | "High" | "Extreme";

export interface Mission {
  id: string;
  title: string;
  sector: string;
  location: string;
  threat: ThreatLevel;
  objective: string;
  recommendedLevel: number;
  requiredHqLevel: number;
  rewardXp: number;
  rewardCredits: number;
}

// All four sectors currently route into the same facility arena (Kepler
// Station) — mechanically one continuous compound, ending in the same
// guarded reactor room every time — so the objective text stays honest
// about that rather than promising per-mission set-pieces the arena
// doesn't yet have. Rewards, recommended level and the HQ gate are what
// actually differentiate them.
export const MISSIONS: Mission[] = [
  {
    id: "sector-1",
    title: "Outpost Breach",
    sector: "Sector I",
    location: "Kepler Station — Outer Ring",
    threat: "Low",
    objective: "Eliminate all hostiles",
    recommendedLevel: 1,
    requiredHqLevel: 1,
    rewardXp: 150,
    rewardCredits: 300,
  },
  {
    id: "sector-2",
    title: "Deep Corridor",
    sector: "Sector II",
    location: "Kepler Station — Maintenance Level",
    threat: "Moderate",
    objective: "Eliminate all hostiles",
    recommendedLevel: 3,
    requiredHqLevel: 2,
    rewardXp: 220,
    rewardCredits: 420,
  },
  {
    id: "sector-3",
    title: "Command Core",
    sector: "Sector III",
    location: "Kepler Station — Security Wing",
    threat: "High",
    objective: "Eliminate all hostiles",
    recommendedLevel: 6,
    requiredHqLevel: 3,
    rewardXp: 320,
    rewardCredits: 560,
  },
  {
    id: "sector-4",
    title: "Reactor Core",
    sector: "Sector IV",
    location: "Kepler Station — Reactor Room",
    threat: "Extreme",
    objective: "Eliminate all hostiles, including the compound's guardian",
    recommendedLevel: 9,
    requiredHqLevel: 4,
    rewardXp: 450,
    rewardCredits: 750,
  },
];

export function isMissionUnlocked(progress: PlayerProgress, mission: Mission): boolean {
  return progress.level >= mission.recommendedLevel && progress.buildingLevels.hq >= mission.requiredHqLevel;
}

function defaultBuildingLevels(): Record<BuildingId, number> {
  return { hq: 1, armory: 1, research: 1, storage: 1 };
}

export function defaultPlayerProgress(): PlayerProgress {
  return {
    level: 1,
    xp: 0,
    xpNext: xpNextForLevel(1),
    kills: 0,
    wins: 0,
    matches: 0,
    history: [],
    credits: 500,
    buildingLevels: defaultBuildingLevels(),
    missionsCompleted: [],
  };
}

export function loadPlayerProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(PLAYER_PROGRESS_STORAGE_KEY);
    if (!raw) return defaultPlayerProgress();
    const parsed = JSON.parse(raw);
    const fallbackBuildings = defaultBuildingLevels();
    return {
      level: parsed.level ?? 1,
      xp: parsed.xp ?? 0,
      xpNext: parsed.xpNext ?? xpNextForLevel(parsed.level ?? 1),
      kills: parsed.kills ?? 0,
      wins: parsed.wins ?? 0,
      matches: parsed.matches ?? 0,
      // Older saves (from before match history existed) simply won't have
      // this field — default to empty rather than crashing on .map/.slice.
      history: Array.isArray(parsed.history) ? parsed.history : [],
      credits: parsed.credits ?? 500,
      buildingLevels: parsed.buildingLevels
        ? { ...fallbackBuildings, ...parsed.buildingLevels }
        : fallbackBuildings,
      missionsCompleted: Array.isArray(parsed.missionsCompleted) ? parsed.missionsCompleted : [],
    };
  } catch {
    return defaultPlayerProgress();
  }
}

export function savePlayerProgress(progress: PlayerProgress) {
  localStorage.setItem(PLAYER_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

// Applies a chunk of XP, rolling over into as many level-ups as it takes
// (each level's own xpNext threshold, not a fixed one) — a big XP grant
// can legitimately jump more than one level at once.
export function applyXP(progress: PlayerProgress, xpGained: number): PlayerProgress {
  let { level, xp, xpNext } = progress;
  xp += xpGained;
  while (xp >= xpNext) {
    xp -= xpNext;
    level += 1;
    xpNext = xpNextForLevel(level);
  }
  return { ...progress, level, xp, xpNext };
}

export function armoryCreditsMultiplier(progress: PlayerProgress): number {
  return 1 + progress.buildingLevels.armory * 0.08;
}

export function researchXpMultiplier(progress: PlayerProgress): number {
  return 1 + progress.buildingLevels.research * 0.06;
}

export function storageFlatCreditsBonus(progress: PlayerProgress): number {
  return progress.buildingLevels.storage * 25;
}

// Precomputed once at deploy time (mission select), from the player's
// building levels *at that moment* — so the in-arena reward preview and
// the reward actually granted on match end always agree, even though the
// match itself doesn't touch buildingLevels.
export function effectiveMissionRewards(progress: PlayerProgress, mission: Mission) {
  const xpBonus = Math.round(mission.rewardXp * researchXpMultiplier(progress));
  const creditsBonus = Math.round(mission.rewardCredits * armoryCreditsMultiplier(progress) + storageFlatCreditsBonus(progress));
  return { xpBonus, creditsBonus };
}
