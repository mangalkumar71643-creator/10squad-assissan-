import { create } from "zustand";
import { persist } from "zustand/middleware";

import { zustandStorage } from "@/storage/zustandStorage";

interface ShopState {
  ownedItemIds: string[];
  equippedTrail: string | null;
  equippedEffect: string | null;
  equippedTheme: string | null;
  ownItem: (id: string) => void;
  equipTrail: (id: string) => void;
  equipEffect: (id: string) => void;
  equipTheme: (id: string) => void;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      ownedItemIds: [],
      equippedTrail: null,
      equippedEffect: null,
      equippedTheme: null,
      ownItem: (id) =>
        set((s) =>
          s.ownedItemIds.includes(id)
            ? s
            : { ownedItemIds: [...s.ownedItemIds, id] },
        ),
      equipTrail: (id) => set({ equippedTrail: id }),
      equipEffect: (id) => set({ equippedEffect: id }),
      equipTheme: (id) => set({ equippedTheme: id }),
    }),
    { name: "rrb-shop", storage: zustandStorage },
  ),
);
