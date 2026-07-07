import { useEffect, useState } from "react";

import { useAchievementsStore } from "@/store/achievementsStore";
import { useDailyRewardStore } from "@/store/dailyRewardStore";
import { useProfileStore } from "@/store/profileStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useShopStore } from "@/store/shopStore";

const STORES = [
  useProfileStore,
  useSettingsStore,
  useShopStore,
  useAchievementsStore,
  useDailyRewardStore,
];

export function useStoresHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() =>
    STORES.every((s) => s.persist.hasHydrated()),
  );

  useEffect(() => {
    if (hydrated) return;
    const unsubs = STORES.map((s) =>
      s.persist.onFinishHydration(() => {
        setHydrated(STORES.every((store) => store.persist.hasHydrated()));
      }),
    );
    setHydrated(STORES.every((s) => s.persist.hasHydrated()));
    return () => unsubs.forEach((u) => u());
  }, [hydrated]);

  return hydrated;
}
