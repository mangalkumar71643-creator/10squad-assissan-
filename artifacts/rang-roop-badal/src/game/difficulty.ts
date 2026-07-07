import { GameMode } from "@/types";

const BASE_INTERVAL_MS = 2600;
const MIN_INTERVAL_MS = 950;

export function gateIntervalFor(mode: GameMode, score: number, dangerTime: boolean): number {
  const decayRate = mode === "endless" ? 5.5 : 4;
  const eased = Math.max(MIN_INTERVAL_MS, BASE_INTERVAL_MS - score * decayRate);
  return dangerTime ? Math.max(600, eased * 0.55) : eased;
}

export const PERFECT_WINDOW_MS = 550;
export const DANGER_TIME_DURATION_MS = 10000;
export const DANGER_TIME_SCORE_STEP = 500;
export const STAR_SHOWER_INTERVAL_MS = 45000;
export const STAR_SHOWER_DURATION_MS = 6000;
export const STAR_SHOWER_SPAWN_EVERY_MS = 700;
export const SPECIAL_GATE_CHANCE = 0.14;
