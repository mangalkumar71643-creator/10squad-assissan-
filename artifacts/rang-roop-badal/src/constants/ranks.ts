import { RankName } from "@/types";

export const RANKS: RankName[] = [
  "Bronze III",
  "Bronze II",
  "Bronze I",
  "Silver III",
  "Silver II",
  "Silver I",
  "Gold III",
  "Gold II",
  "Gold I",
  "Platinum III",
  "Platinum II",
  "Platinum I",
  "Diamond III",
  "Diamond II",
  "Diamond I",
  "Master",
  "Grandmaster",
];

// XP required to advance out of the rank at each index.
export const RANK_XP_REQUIREMENTS: number[] = [
  200, 250, 300, 350, 400, 450, 500, 600, 700, 850, 1000, 1200, 1450, 1700,
  2000, 3000, Infinity,
];

export const RANK_TIER_COLORS: Record<string, string> = {
  Bronze: "#C97A45",
  Silver: "#B9C2CE",
  Gold: "#FFD35E",
  Platinum: "#7FE7D8",
  Diamond: "#7FC4FF",
  Master: "#C88CFF",
  Grandmaster: "#FF7FC4",
};

export function rankTierColor(rank: RankName): string {
  const tier = rank.split(" ")[0];
  return RANK_TIER_COLORS[tier] ?? "#C97A45";
}

export function rankIndex(rank: RankName): number {
  const idx = RANKS.indexOf(rank);
  return idx === -1 ? 0 : idx;
}

export interface RankProgress {
  rank: RankName;
  xp: number;
  xpForNext: number;
  isMaxRank: boolean;
}

export function applyXp(
  currentRank: RankName,
  currentXp: number,
  xpGained: number,
): RankProgress {
  let idx = rankIndex(currentRank);
  let xp = currentXp + xpGained;

  while (idx < RANKS.length - 1 && xp >= RANK_XP_REQUIREMENTS[idx]) {
    xp -= RANK_XP_REQUIREMENTS[idx];
    idx += 1;
  }

  const isMaxRank = idx === RANKS.length - 1;
  return {
    rank: RANKS[idx],
    xp: isMaxRank ? 0 : xp,
    xpForNext: isMaxRank ? 0 : RANK_XP_REQUIREMENTS[idx],
    isMaxRank,
  };
}
