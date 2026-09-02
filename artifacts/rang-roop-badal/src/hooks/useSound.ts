import { useEffect } from "react";

import { soundManager, SfxKey } from "@/audio/soundManager";
import { useSettingsStore } from "@/store/settingsStore";

export function useSoundSystem() {
  const sfxOn = useSettingsStore((s) => s.sfxOn);

  useEffect(() => {
    soundManager.init();
  }, []);

  useEffect(() => {
    soundManager.setSfxEnabled(sfxOn);
  }, [sfxOn]);
}

export function playSfx(key: SfxKey) {
  soundManager.play(key);
}
