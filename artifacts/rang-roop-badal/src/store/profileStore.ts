import { create } from "zustand";
import { persist } from "zustand/middleware";

import { applyXp } from "@/constants/ranks";
import { PlayerStats, RankName } from "@/types";
import { zustandStorage } from "@/storage/zustandStorage";

const EMPTY_STATS: PlayerStats = {
  totalMatches: 0,
  perfectMatches: 0,
  highestCombo: 0,
  totalScoreEarned: 0,
  starsCollectedTotal: 0,
  challengesCompleted: 0,
  dangerTimeSurvivedCount: 0,
  gamesPlayed: 0,
};

interface ProfileState {
  playerName: string;
  coins: number;
  stars: number;
  bestScore: number;
  rank: RankName;
  rankXp: number;
  region: string;
  regionFlag: string;
  selectedCharacterId: string;
  unlockedCharacterIds: string[];
  stats: PlayerStats;

  addCoins: (n: number) => void;
  spendCoins: (n: number) => boolean;
  addStars: (n: number) => void;
  spendStars: (n: number) => boolean;
  addXp: (n: number) => void;
  unlockCharacter: (id: string) => void;
  selectCharacter: (id: string) => void;
  recordRunEnd: (result: {
    score: number;
    combo: number;
    perfectMatches: number;
    matches: number;
    starsEarned: number;
    survivedDanger: boolean;
  }) => boolean;
  bumpStat: (key: keyof PlayerStats, delta: number) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      playerName: "Alien Runner",
      coins: 0,
      stars: 0,
      bestScore: 0,
      rank: "Bronze III",
      rankXp: 0,
      region: "India",
      regionFlag: "🇮🇳",
      selectedCharacterId: "zeno",
      unlockedCharacterIds: ["zeno"],
      stats: EMPTY_STATS,

      addCoins: (n) => set((s) => ({ coins: s.coins + Math.max(0, n) })),
      spendCoins: (n) => {
        const { coins } = get();
        if (coins < n) return false;
        set({ coins: coins - n });
        return true;
      },
      addStars: (n) => set((s) => ({ stars: s.stars + Math.max(0, n) })),
      spendStars: (n) => {
        const { stars } = get();
        if (stars < n) return false;
        set({ stars: stars - n });
        return true;
      },
      addXp: (n) => {
        const { rank, rankXp } = get();
        const progress = applyXp(rank, rankXp, n);
        set({ rank: progress.rank, rankXp: progress.xp });
      },
      unlockCharacter: (id) =>
        set((s) =>
          s.unlockedCharacterIds.includes(id)
            ? s
            : { unlockedCharacterIds: [...s.unlockedCharacterIds, id] },
        ),
      selectCharacter: (id) => set({ selectedCharacterId: id }),
      bumpStat: (key, delta) =>
        set((s) => ({
          stats: { ...s.stats, [key]: (s.stats[key] as number) + delta },
        })),
      recordRunEnd: ({ score, combo, perfectMatches, matches, survivedDanger }) => {
        const s = get();
        const isNewBest = score > s.bestScore;
        set({
          bestScore: isNewBest ? score : s.bestScore,
          stats: {
            ...s.stats,
            gamesPlayed: s.stats.gamesPlayed + 1,
            totalMatches: s.stats.totalMatches + matches,
            perfectMatches: s.stats.perfectMatches + perfectMatches,
            highestCombo: Math.max(s.stats.highestCombo, combo),
            totalScoreEarned: s.stats.totalScoreEarned + score,
            dangerTimeSurvivedCount:
              s.stats.dangerTimeSurvivedCount + (survivedDanger ? 1 : 0),
          },
        });
        return isNewBest;
      },
    }),
    {
      name: "rrb-profile",
      storage: zustandStorage,
    },
  ),
);
