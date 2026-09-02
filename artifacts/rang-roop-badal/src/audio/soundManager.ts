import { AudioPlayer, AudioSource, createAudioPlayer, setAudioModeAsync } from "expo-audio";

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

const SFX_SOURCES: Record<SfxKey, AudioSource> = {
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

const MUSIC_SOURCE: AudioSource = require("../../assets/audio/music_loop.wav");

class SoundManager {
  private sfxEnabled = true;
  private musicEnabled = true;
  private musicPlayer: AudioPlayer | null = null;
  private initPromise: Promise<void> | null = null;

  // Cached and awaited by play()/startMusic() so a player is never created
  // before the audio mode is actually applied natively -- creating a player
  // first can leave it stuck on the wrong (voice-call) audio stream. Also
  // called eagerly on app mount (see useSoundSystem) to warm it up early.
  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "duckOthers",
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
      }).catch(() => undefined); // Audio subsystem unavailable (e.g. web preview).
    }
    return this.initPromise;
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
    await this.init();
    try {
      const player = createAudioPlayer(SFX_SOURCES[key]);
      player.volume = 0.9;
      const subscription = player.addListener("playbackStatusUpdate", (status) => {
        if (status.didJustFinish) {
          subscription.remove();
          player.remove();
        }
      });
      player.play();
    } catch {
      // Missing/unsupported asset — ignore so gameplay never crashes.
    }
  }

  async startMusic() {
    if (!this.musicEnabled) return;
    await this.init();
    try {
      if (!this.musicPlayer) {
        const player = createAudioPlayer(MUSIC_SOURCE);
        player.loop = true;
        player.volume = 0.35;
        this.musicPlayer = player;
      }
      this.musicPlayer.play();
    } catch {
      // ignore
    }
  }

  stopMusic() {
    try {
      this.musicPlayer?.pause();
    } catch {
      // ignore
    }
  }
}

export const soundManager = new SoundManager();
