import { create } from "zustand";
import { persist } from "zustand/middleware";

import { zustandStorage } from "@/storage/zustandStorage";

interface AchievementsState {
  claimedIds: string[];
  claim: (id: string) => void;
  isClaimed: (id: string) => boolean;
}

export const useAchievementsStore = create<AchievementsState>()(
  persist(
    (set, get) => ({
      claimedIds: [],
      claim: (id) =>
        set((s) =>
          s.claimedIds.includes(id)
            ? s
            : { claimedIds: [...s.claimedIds, id] },
        ),
      isClaimed: (id) => get().claimedIds.includes(id),
    }),
    { name: "rrb-achievements", storage: zustandStorage },
  ),
);
