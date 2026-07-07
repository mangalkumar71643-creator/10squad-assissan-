import { create } from "zustand";
import { persist } from "zustand/middleware";

import { GraphicsQuality } from "@/types";
import { zustandStorage } from "@/storage/zustandStorage";

interface SettingsState {
  musicOn: boolean;
  sfxOn: boolean;
  vibrationOn: boolean;
  tutorialOn: boolean;
  graphics: GraphicsQuality;
  language: string;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleVibration: () => void;
  toggleTutorial: () => void;
  setGraphics: (g: GraphicsQuality) => void;
  setLanguage: (l: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      musicOn: true,
      sfxOn: true,
      vibrationOn: true,
      tutorialOn: true,
      graphics: "High",
      language: "English",
      toggleMusic: () => set((s) => ({ musicOn: !s.musicOn })),
      toggleSfx: () => set((s) => ({ sfxOn: !s.sfxOn })),
      toggleVibration: () => set((s) => ({ vibrationOn: !s.vibrationOn })),
      toggleTutorial: () => set((s) => ({ tutorialOn: !s.tutorialOn })),
      setGraphics: (g) => set({ graphics: g }),
      setLanguage: (l) => set({ language: l }),
    }),
    { name: "rrb-settings", storage: zustandStorage },
  ),
);
