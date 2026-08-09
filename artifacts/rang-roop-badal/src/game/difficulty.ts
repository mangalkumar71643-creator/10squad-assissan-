import { GameMode } from "@/types";

export const BALL_RADIUS_RATIO = 0.022; // relative to play area width
export const PADDLE_WIDTH_MULTIPLIER = 4; // paddle width = ball diameter * 4
export const PADDLE_HEIGHT = 16;
export const PADDLE_BOTTOM_OFFSET = 36;

export const BALL_BASE_SPEED = 260; // px/sec
export const BALL_SPEED_PER_LEVEL = 16; // px/sec added each level
export const BALL_MAX_SPEED = 520;

export function ballSpeedFor(mode: GameMode, level: number, dangerTime: boolean): number {
  const growth = mode === "endless" ? BALL_SPEED_PER_LEVEL * 1.4 : BALL_SPEED_PER_LEVEL;
  const base = Math.min(BALL_MAX_SPEED, BALL_BASE_SPEED + level * growth);
  return dangerTime ? Math.min(BALL_MAX_SPEED + 120, base * 1.35) : base;
}

export const BRICK_ROWS = 5;
export const BRICK_COLS = 6;
export const BRICK_GAP = 5;
export const BRICK_AREA_HEIGHT_RATIO = 0.4;
export const BRICK_TOP_OFFSET_RATIO = 0.06;

export const PERFECT_COMBO_THRESHOLD = 5;

export const DANGER_TIME_DURATION_MS = 9000;
export const DANGER_TIME_SCORE_STEP = 400;
export const STAR_SHOWER_INTERVAL_MS = 40000;
export const STAR_SHOWER_DURATION_MS = 6000;
export const STAR_SHOWER_SPAWN_EVERY_MS = 700;
