import { useEffect } from "react";

import { soundManager, SfxKey } from "@/audio/soundManager";
import { useSettingsStore } from "@/store/settingsStore";

export function useSoundSystem() {
  const sfxOn = useSettingsStore((s) => s.sfxOn);
  const musicOn = useSettingsStore((s) => s.musicOn);

  useEffect(() => {
    soundManager.init();
  }, []);

  useEffect(() => {
    soundManager.setSfxEnabled(sfxOn);
  }, [sfxOn]);

  useEffect(() => {
    soundManager.setMusicEnabled(musicOn);
  }, [musicOn]);
}

export function playSfx(key: SfxKey) {
  soundManager.play(key);
}
