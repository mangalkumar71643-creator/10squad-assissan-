export type DifficultyTier = "Easy" | "Medium" | "Hard" | "Expert";

export const TIER_RANGES: { tier: DifficultyTier; from: number; to: number | null }[] = [
  { tier: "Easy", from: 1, to: 25 },
  { tier: "Medium", from: 26, to: 75 },
  { tier: "Hard", from: 76, to: 150 },
  { tier: "Expert", from: 151, to: null },
];

export const TIER_COLORS: Record<DifficultyTier, string> = {
  Easy: "#2ED47A",
  Medium: "#3E7BFA",
  Hard: "#FF9F43",
  Expert: "#FF4757",
};

export function tierFor(level: number): DifficultyTier {
  if (level <= 25) return "Easy";
  if (level <= 75) return "Medium";
  if (level <= 150) return "Hard";
  return "Expert";
}

export function levelsForTier(tier: DifficultyTier, currentLevel: number): number[] {
  const range = TIER_RANGES.find((r) => r.tier === tier)!;
  const end = range.to ?? Math.max(range.from + 9, currentLevel + 10);
  const levels: number[] = [];
  for (let l = range.from; l <= end; l++) levels.push(l);
  return levels;
}
