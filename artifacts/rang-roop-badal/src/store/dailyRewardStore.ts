import { create } from "zustand";
import { persist } from "zustand/middleware";

import { zustandStorage } from "@/storage/zustandStorage";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

interface DailyRewardState {
  currentDay: number; // 1-7
  lastClaimedDate: string | null;
  canClaimToday: () => boolean;
  claimToday: () => number; // returns the day number that was claimed
}

export const useDailyRewardStore = create<DailyRewardState>()(
  persist(
    (set, get) => ({
      currentDay: 1,
      lastClaimedDate: null,
      canClaimToday: () => get().lastClaimedDate !== todayKey(),
      claimToday: () => {
        const { currentDay, lastClaimedDate } = get();
        if (lastClaimedDate === todayKey()) return currentDay;
        const claimedDay = currentDay;
        const nextDay = currentDay >= 7 ? 1 : currentDay + 1;
        set({ currentDay: nextDay, lastClaimedDate: todayKey() });
        return claimedDay;
      },
    }),
    { name: "rrb-daily-reward", storage: zustandStorage },
  ),
);
