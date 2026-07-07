import * as Haptics from "expo-haptics";

import { useSettingsStore } from "@/store/settingsStore";

export function vibrate(style: "light" | "medium" | "success" | "error" = "light") {
  if (!useSettingsStore.getState().vibrationOn) return;
  try {
    if (style === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (style === "error") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (style === "medium") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // no-op if haptics unsupported on this device
  }
}
