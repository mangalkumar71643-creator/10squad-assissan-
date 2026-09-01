import { Audio, AVPlaybackSource, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";

export type SfxKey =
  | "tap"
  | "correct"
  | "wrong"
  | "perfect"
  | "coin"
  | "star"
  | "combo"
  | "danger"
  | "gameover";

const SFX_SOURCES: Record<SfxKey, AVPlaybackSource> = {
  tap: require("../../assets/audio/tap.wav"),
  correct: require("../../assets/audio/correct.wav"),
  wrong: require("../../assets/audio/wrong.wav"),
  perfect: require("../../assets/audio/perfect.wav"),
  coin: require("../../assets/audio/coin.wav"),
  star: require("../../assets/audio/star.wav"),
  combo: require("../../assets/audio/combo.wav"),
  danger: require("../../assets/audio/danger.wav"),
  gameover: require("../../assets/audio/gameover.wav"),
};

const MUSIC_SOURCE: AVPlaybackSource = require("../../assets/audio/music_loop.wav");

class SoundManager {
  private sfxEnabled = true;
  private musicEnabled = true;
  private musicSound: Audio.Sound | null = null;
  private ready = false;

  async init() {
    if (this.ready) return;
    try {
      // Explicitly set every field -- leaving fields unset lets some Android
      // devices route this app's audio through the in-call/communication
      // stream (silent on the loudspeaker, narrowband/buzzy over Bluetooth)
      // instead of the normal media stream.
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.ready = true;
    } catch {
      // Audio subsystem unavailable (e.g. web preview) — fail silently.
    }
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  async play(key: SfxKey) {
    if (!this.sfxEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(SFX_SOURCES[key], {
        volume: 0.9,
      });
      sound.setOnPlaybackStatusUpdate((status) => {
        if ("didJustFinish" in status && status.didJustFinish) {
          sound.unloadAsync().catch(() => undefined);
        }
      });
      await sound.playAsync();
    } catch {
      // Missing/unsupported asset — ignore so gameplay never crashes.
    }
  }

  async startMusic() {
    if (!this.musicEnabled) return;
    try {
      if (!this.musicSound) {
        const { sound } = await Audio.Sound.createAsync(MUSIC_SOURCE, {
          isLooping: true,
          volume: 0.35,
        });
        this.musicSound = sound;
      }
      await this.musicSound.playAsync();
    } catch {
      // ignore
    }
  }

  async stopMusic() {
    try {
      await this.musicSound?.stopAsync();
    } catch {
      // ignore
    }
  }
}

export const soundManager = new SoundManager();
