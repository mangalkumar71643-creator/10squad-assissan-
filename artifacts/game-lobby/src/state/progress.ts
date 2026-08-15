// Persistent save data for Vanguard Protocol: operator rank/XP, credits,
// outpost (base) building levels and which sectors have been cleared.
// Everything here is plain data + pure functions so every screen (Hub,
// Briefing, Base, the combat scene, Results) can share one source of truth
// without importing from each other.

export const SAVE_KEY = "vgp-save-v1";

export const KILL_XP = 35;
export const KILL_CREDITS = 18;

export type MatchResult = "victory" | "defeat";

export interface MatchRecord {
  sectorId: string;
  result: MatchResult;
  hostilesDown: number;
  xpEarned: number;
  creditsEarned: number;
  durationSec: number;
  timestamp: number;
}

export type OutpostBuildingId = "command" | "armory" | "labs" | "depot";

export interface PlayerProgress {
  rank: number;
  xp: number;
  xpToNextRank: number;
  credits: number;
  hostilesEliminated: number;
  sectorsCleared: string[];
  outpost: Record<OutpostBuildingId, number>;
  history: MatchRecord[];
}

export function xpForRank(rank: number): number {
  return 700 + (rank - 1) * 130;
}

function freshOutpost(): Record<OutpostBuildingId, number> {
  return { command: 1, armory: 1, labs: 1, depot: 1 };
}

export function freshProgress(): PlayerProgress {
  return {
    rank: 1,
    xp: 0,
    xpToNextRank: xpForRank(1),
    credits: 400,
    hostilesEliminated: 0,
    sectorsCleared: [],
    outpost: freshOutpost(),
    history: [],
  };
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshProgress();
    const parsed = JSON.parse(raw);
    const fallback = freshOutpost();
    return {
      rank: parsed.rank ?? 1,
      xp: parsed.xp ?? 0,
      xpToNextRank: parsed.xpToNextRank ?? xpForRank(parsed.rank ?? 1),
      credits: parsed.credits ?? 400,
      hostilesEliminated: parsed.hostilesEliminated ?? 0,
      sectorsCleared: Array.isArray(parsed.sectorsCleared) ? parsed.sectorsCleared : [],
      outpost: parsed.outpost ? { ...fallback, ...parsed.outpost } : fallback,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return freshProgress();
  }
}

export function saveProgress(progress: PlayerProgress) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(progress));
}

// Rolls XP into as many rank-ups as it takes in one grant.
export function grantXp(progress: PlayerProgress, amount: number): Pick<PlayerProgress, "rank" | "xp" | "xpToNextRank"> {
  let { rank, xp, xpToNextRank } = progress;
  xp += amount;
  while (xp >= xpToNextRank) {
    xp -= xpToNextRank;
    rank += 1;
    xpToNextRank = xpForRank(rank);
  }
  return { rank, xp, xpToNextRank };
}

export interface OutpostBuildingDef {
  id: OutpostBuildingId;
  name: string;
  tag: string;
  description: string;
  effectAtLevel: (level: number) => string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
}

export const OUTPOST_BUILDING_ORDER: OutpostBuildingId[] = ["command", "armory", "labs", "depot"];

export const OUTPOST_BUILDINGS: Record<OutpostBuildingId, OutpostBuildingDef> = {
  command: {
    id: "command",
    name: "Command Spire",
    tag: "COMMAND",
    description: "Authorizes squad deployments. Its level is what actually unlocks harder sectors on the briefing map.",
    effectAtLevel: (lvl) => `Clears sectors up to tier ${lvl}`,
    maxLevel: 5,
    baseCost: 320,
    costGrowth: 1.45,
  },
  armory: {
    id: "armory",
    name: "Armory Bay",
    tag: "ARMORY",
    description: "Weapon maintenance and salvage processing. Raises the credit payout from every hostile eliminated.",
    effectAtLevel: (lvl) => `+${lvl * 10}% credits per kill`,
    maxLevel: 8,
    baseCost: 260,
    costGrowth: 1.3,
  },
  labs: {
    id: "labs",
    name: "Field Labs",
    tag: "LABS",
    description: "After-action analysis of every deployment. Raises the XP payout from completed sectors.",
    effectAtLevel: (lvl) => `+${lvl * 7}% mission XP`,
    maxLevel: 8,
    baseCost: 280,
    costGrowth: 1.3,
  },
  depot: {
    id: "depot",
    name: "Supply Depot",
    tag: "DEPOT",
    description: "Logistics stockpile. Adds a flat credit stipend on top of every completed deployment.",
    effectAtLevel: (lvl) => `+${lvl * 20} credits per mission`,
    maxLevel: 8,
    baseCost: 220,
    costGrowth: 1.28,
  },
};

export function outpostUpgradeCost(id: OutpostBuildingId, currentLevel: number): number {
  const def = OUTPOST_BUILDINGS[id];
  return Math.round(def.baseCost * Math.pow(def.costGrowth, currentLevel - 1));
}

export function armoryCreditMultiplier(progress: PlayerProgress): number {
  return 1 + progress.outpost.armory * 0.1;
}
export function labsXpMultiplier(progress: PlayerProgress): number {
  return 1 + progress.outpost.labs * 0.07;
}
export function depotFlatCredits(progress: PlayerProgress): number {
  return progress.outpost.depot * 20;
}

export type ThreatTier = 1 | 2 | 3 | 4;

export interface Sector {
  id: string;
  codename: string;
  index: string;
  briefing: string;
  tier: ThreatTier;
  commandLevelRequired: number;
  rankRecommended: number;
  baseXp: number;
  baseCredits: number;
  hasExtraction: boolean;
}

const TIER_LABEL: Record<ThreatTier, string> = { 1: "Low", 2: "Moderate", 3: "High", 4: "Extreme" };
export function threatLabel(tier: ThreatTier): string {
  return TIER_LABEL[tier];
}

// Four deployments, each ending with an extraction run once hostiles are
// clear (see the combat scene's objective state machine) — every sector
// currently shares the same compound layout, so what differentiates them
// is the briefing fiction, the reward curve and the Command Spire gate.
export const SECTORS: Sector[] = [
  {
    id: "sector-alpha",
    codename: "Broken Gate",
    index: "SECTOR I",
    briefing: "A forward outpost gone dark. Clear the compound, then hold for extraction.",
    tier: 1,
    commandLevelRequired: 1,
    rankRecommended: 1,
    baseXp: 140,
    baseCredits: 260,
    hasExtraction: true,
  },
  {
    id: "sector-bravo",
    codename: "Static Line",
    index: "SECTOR II",
    briefing: "Comms relay compromised. Expect a heavier garrison and tighter corridors.",
    tier: 2,
    commandLevelRequired: 2,
    rankRecommended: 3,
    baseXp: 210,
    baseCredits: 390,
    hasExtraction: true,
  },
  {
    id: "sector-charlie",
    codename: "Iron Vault",
    index: "SECTOR III",
    briefing: "Security wing, reinforced. A flanking scout unit has been sighted.",
    tier: 3,
    commandLevelRequired: 3,
    rankRecommended: 6,
    baseXp: 300,
    baseCredits: 540,
    hasExtraction: true,
  },
  {
    id: "sector-delta",
    codename: "Last Reactor",
    index: "SECTOR IV",
    briefing: "The compound's core. A dug-in heavy unit guards the extraction point itself.",
    tier: 4,
    commandLevelRequired: 4,
    rankRecommended: 9,
    baseXp: 420,
    baseCredits: 720,
    hasExtraction: true,
  },
];

export function isSectorUnlocked(progress: PlayerProgress, sector: Sector): boolean {
  return progress.rank >= sector.rankRecommended && progress.outpost.command >= sector.commandLevelRequired;
}

// Precomputed once at deploy time from the player's *current* outpost
// levels, so the reward preview shown on the briefing card, the live HUD
// preview in combat, and the amount actually granted on mission end all
// agree with each other.
export function effectiveSectorReward(progress: PlayerProgress, sector: Sector) {
  const xp = Math.round(sector.baseXp * labsXpMultiplier(progress));
  const credits = Math.round(sector.baseCredits * armoryCreditMultiplier(progress) + depotFlatCredits(progress));
  return { xp, credits };
}
