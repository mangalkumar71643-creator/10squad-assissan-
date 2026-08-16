import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  BALL_RADIUS_RATIO,
  DANGER_TIME_DURATION_MS,
  DANGER_TIME_SCORE_STEP,
  PADDLE_BOTTOM_OFFSET,
  PADDLE_HEIGHT,
  PADDLE_WIDTH_MULTIPLIER,
  PERFECT_COMBO_THRESHOLD,
  STAR_SHOWER_DURATION_MS,
  STAR_SHOWER_INTERVAL_MS,
  STAR_SHOWER_SPAWN_EVERY_MS,
  ballSpeedFor,
} from "@/game/difficulty";
import { generateBricks } from "@/game/brickGenerator";
import { findBrickHit, reflectOffPaddle, reflectOffRect } from "@/game/physics";
import { computeBrickReward } from "@/game/scoring";
import { CHALLENGES } from "@/constants/challenges";
import { Ball, Brick, ChallengeDef, FloatingText, GameMode, Paddle } from "@/types";
import { uid } from "@/utils/id";

const STAR_LIFETIME_MS = 2400;
const BALL_RELAUNCH_DELAY_MS = 900;
const MAX_DT_SEC = 1 / 20;
const STAR_ZONE_TOP_RATIO = 0.5;

export interface CollectibleStar {
  id: string;
  x: number;
  y: number;
  spawnedAt: number;
}

export interface Banner {
  key: number;
  text: string;
  tone: "danger" | "star" | "info";
}

export function paddleYFor(boundsHeight: number): number {
  return boundsHeight - PADDLE_BOTTOM_OFFSET;
}

function makePaddle(boundsWidth: number, ballRadius: number): Paddle {
  const width = ballRadius * 2 * PADDLE_WIDTH_MULTIPLIER;
  return {
    x: boundsWidth / 2 - width / 2,
    width,
    height: PADDLE_HEIGHT,
  };
}

function makeBall(boundsWidth: number, boundsHeight: number, paddle: Paddle): Ball {
  const radius = Math.max(6, boundsWidth * BALL_RADIUS_RATIO);
  return {
    x: paddle.x + paddle.width / 2,
    y: paddleYFor(boundsHeight) - radius,
    vx: 0,
    vy: 0,
    radius,
  };
}

function launchDirection(speed: number) {
  const angle = (Math.random() * 60 - 30) * (Math.PI / 180);
  return { vx: speed * Math.sin(angle), vy: -speed * Math.cos(angle) };
}

export interface GameLoopState {
  status: "playing" | "paused" | "gameover";
  mode: GameMode;
  challenge: ChallengeDef | null;
  now: number;
  score: number;
  runCoins: number;
  runStars: number;
  lives: number;
  combo: number;
  highestCombo: number;
  matches: number; // bricks broken
  perfectMatches: number; // perfect-combo brick hits
  level: number;
  startLevel: number;
  lastLevelCleared: { level: number; stars: number } | null;
  ball: Ball;
  paddle: Paddle;
  bricks: Brick[];
  ballLaunched: boolean;
  launchAt: number;
  dangerTime: boolean;
  dangerEndsAt: number;
  nextDangerScore: number;
  dangerSurvivedThisRun: boolean;
  starShower: boolean;
  starShowerEndsAt: number;
  nextStarShowerAt: number;
  lastStarSpawnAt: number;
  stars: CollectibleStar[];
  floatingTexts: FloatingText[];
  banner: Banner | null;
  bannerUntil: number;
  challengeProgress: number;
  challengeCompleted: boolean;
  pausedAt: number | null;
  bounds: { width: number; height: number };
}

type Action =
  | { type: "TICK"; now: number }
  | { type: "MOVE_PADDLE"; x: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "RESTART"; now: number }
  | { type: "COLLECT_STAR"; id: string }
  | { type: "REMOVE_FLOATING"; id: string }
  | { type: "SET_BOUNDS"; width: number; height: number };

function challengeProgressValue(
  challenge: ChallengeDef | null,
  state: {
    matches: number;
    combo: number;
    runCoins: number;
    perfectMatches: number;
    dangerSurvivedThisRun: boolean;
  },
): number {
  if (!challenge) return 0;
  switch (challenge.type) {
    case "matches":
      return state.matches;
    case "combo":
      return state.combo;
    case "coins":
      return state.runCoins;
    case "perfect_matches":
      return state.perfectMatches;
    case "danger_survive":
      return state.dangerSurvivedThisRun ? 1 : 0;
    default:
      return 0;
  }
}

function pushFloating(
  list: FloatingText[],
  text: string,
  color: string,
  x: number,
  y: number,
): FloatingText[] {
  const item: FloatingText = { id: uid("float"), text, x, y, color, createdAt: Date.now() };
  const next = [...list, item];
  return next.length > 6 ? next.slice(next.length - 6) : next;
}

function makeInitialState(
  mode: GameMode,
  challengeId: string | undefined,
  now: number,
  startLevel: number = 1,
): GameLoopState {
  const challenge = challengeId ? CHALLENGES.find((c) => c.id === challengeId) ?? null : null;
  const boundsWidth = 360;
  const boundsHeight = 640;
  const paddle = makePaddle(boundsWidth, Math.max(6, boundsWidth * BALL_RADIUS_RATIO));
  const ball = makeBall(boundsWidth, boundsHeight, paddle);

  return {
    status: "playing",
    mode,
    challenge,
    now,
    score: 0,
    runCoins: 0,
    runStars: 0,
    lives: 3,
    combo: 0,
    highestCombo: 0,
    matches: 0,
    perfectMatches: 0,
    level: Math.max(1, startLevel),
    startLevel: Math.max(1, startLevel),
    lastLevelCleared: null,
    ball,
    paddle,
    bricks: generateBricks(boundsWidth, boundsHeight),
    ballLaunched: false,
    launchAt: now + BALL_RELAUNCH_DELAY_MS,
    dangerTime: false,
    dangerEndsAt: 0,
    nextDangerScore: DANGER_TIME_SCORE_STEP,
    dangerSurvivedThisRun: false,
    starShower: false,
    starShowerEndsAt: 0,
    nextStarShowerAt: now + STAR_SHOWER_INTERVAL_MS,
    lastStarSpawnAt: 0,
    stars: [],
    floatingTexts: [],
    banner: null,
    bannerUntil: 0,
    challengeProgress: 0,
    challengeCompleted: false,
    pausedAt: null,
    bounds: { width: boundsWidth, height: boundsHeight },
  };
}

function resetBallToPaddle(ball: Ball, paddle: Paddle, boundsHeight: number): Ball {
  return {
    ...ball,
    x: paddle.x + paddle.width / 2,
    y: paddleYFor(boundsHeight) - ball.radius,
    vx: 0,
    vy: 0,
  };
}

function reducer(state: GameLoopState, action: Action): GameLoopState {
  switch (action.type) {
    case "SET_BOUNDS": {
      const { width, height } = action;
      if (width === state.bounds.width && height === state.bounds.height) return state;
      const paddle = makePaddle(width, Math.max(6, width * BALL_RADIUS_RATIO));
      const ball = makeBall(width, height, paddle);
      return {
        ...state,
        bounds: { width, height },
        paddle,
        ball,
        bricks: generateBricks(width, height),
        ballLaunched: false,
        launchAt: state.now + BALL_RELAUNCH_DELAY_MS,
      };
    }

    case "MOVE_PADDLE": {
      if (state.status !== "playing") return state;
      const x = Math.max(0, Math.min(state.bounds.width - state.paddle.width, action.x));
      const paddle = { ...state.paddle, x };
      const ball = state.ballLaunched
        ? state.ball
        : resetBallToPaddle(state.ball, paddle, state.bounds.height);
      return { ...state, paddle, ball };
    }

    case "PAUSE":
      if (state.status !== "playing") return state;
      return { ...state, status: "paused", pausedAt: action.now };

    case "RESUME": {
      if (state.status !== "paused" || state.pausedAt === null) return state;
      const delta = action.now - state.pausedAt;
      return {
        ...state,
        status: "playing",
        pausedAt: null,
        launchAt: state.launchAt + delta,
        dangerEndsAt: state.dangerEndsAt + delta,
        starShowerEndsAt: state.starShowerEndsAt + delta,
        nextStarShowerAt: state.nextStarShowerAt + delta,
        stars: state.stars.map((s) => ({ ...s, spawnedAt: s.spawnedAt + delta })),
        bannerUntil: state.bannerUntil + delta,
      };
    }

    case "RESTART":
      return makeInitialState(state.mode, state.challenge?.id, action.now, state.startLevel);

    case "REMOVE_FLOATING":
      return { ...state, floatingTexts: state.floatingTexts.filter((f) => f.id !== action.id) };

    case "COLLECT_STAR": {
      if (state.status !== "playing") return state;
      if (!state.stars.some((s) => s.id === action.id)) return state;
      return {
        ...state,
        stars: state.stars.filter((s) => s.id !== action.id),
        runStars: state.runStars + 1,
        score: state.score + 5,
        floatingTexts: pushFloating(
          state.floatingTexts,
          "+1 ⭐",
          "#FFD35E",
          state.bounds.width / 2,
          state.bounds.height * 0.3,
        ),
      };
    }

    case "TICK": {
      if (state.status !== "playing") return state;
      const now = action.now;
      let next: GameLoopState = { ...state, now };

      if (next.banner && now >= next.bannerUntil) next.banner = null;

      // Auto-serve the ball after a life is lost / level starts.
      if (!next.ballLaunched && now >= next.launchAt) {
        const speed = ballSpeedFor(next.mode, next.level, next.dangerTime);
        const dir = launchDirection(speed);
        next.ballLaunched = true;
        next.ball = { ...next.ball, vx: dir.vx, vy: dir.vy };
      }

      if (next.ballLaunched) {
        const dt = Math.min(MAX_DT_SEC, Math.max(0, (now - state.now) / 1000));
        const speed = ballSpeedFor(next.mode, next.level, next.dangerTime);
        const currentMag = Math.hypot(next.ball.vx, next.ball.vy) || speed;
        const scale = speed / currentMag;
        let ball: Ball = {
          ...next.ball,
          vx: next.ball.vx * scale,
          vy: next.ball.vy * scale,
        };
        ball = { ...ball, x: ball.x + ball.vx * dt, y: ball.y + ball.vy * dt };

        // Walls
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x + ball.radius > next.bounds.width) {
          ball.x = next.bounds.width - ball.radius;
          ball.vx = -Math.abs(ball.vx);
        }
        if (ball.y - ball.radius < 0) {
          ball.y = ball.radius;
          ball.vy = Math.abs(ball.vy);
        }

        // Paddle
        const paddleY = paddleYFor(next.bounds.height);
        const paddleRect = { x: next.paddle.x, y: paddleY, width: next.paddle.width, height: next.paddle.height };
        if (
          ball.vy > 0 &&
          ball.y + ball.radius >= paddleRect.y &&
          ball.y - ball.radius <= paddleRect.y + paddleRect.height &&
          ball.x >= paddleRect.x - ball.radius &&
          ball.x <= paddleRect.x + paddleRect.width + ball.radius
        ) {
          reflectOffPaddle(ball, next.paddle, paddleY, speed);
        }

        // Bricks
        const hitBrick = findBrickHit(ball, next.bricks);
        if (hitBrick) {
          reflectOffRect(ball, hitBrick);
          const combo = next.combo + 1;
          const perfect = combo % PERFECT_COMBO_THRESHOLD === 0;
          const reward = computeBrickReward(hitBrick.points, combo, perfect, next.dangerTime);
          const bricks = next.bricks.map((b) => (b.id === hitBrick.id ? { ...b, alive: false } : b));

          let floatingTexts = pushFloating(
            next.floatingTexts,
            perfect ? `+${reward.scoreGain} PERFECT!` : `+${reward.scoreGain}`,
            perfect ? "#FFD35E" : "#2ED47A",
            hitBrick.x + hitBrick.width / 2,
            hitBrick.y,
          );
          if (combo >= 3) {
            floatingTexts = pushFloating(
              floatingTexts,
              `x${Math.min(5, Math.floor(combo / 3) + 1)} COMBO`,
              "#FF6FB5",
              hitBrick.x + hitBrick.width / 2,
              hitBrick.y + 18,
            );
          }

          next = {
            ...next,
            bricks,
            combo,
            highestCombo: Math.max(next.highestCombo, combo),
            matches: next.matches + 1,
            perfectMatches: next.perfectMatches + (perfect ? 1 : 0),
            score: next.score + reward.scoreGain,
            runCoins: next.runCoins + reward.coinGain,
            floatingTexts,
          };

          if (bricks.every((b) => !b.alive)) {
            const clearedLevel = next.level;
            const starsEarned = Math.max(1, Math.min(3, next.lives));
            next = {
              ...next,
              level: clearedLevel + 1,
              bricks: generateBricks(next.bounds.width, next.bounds.height),
              banner: { key: now, text: "LEVEL UP!", tone: "info" },
              bannerUntil: now + 1600,
              lastLevelCleared: { level: clearedLevel, stars: starsEarned },
            };
          }
        }

        // Missed paddle -> lost ball
        if (ball.y - ball.radius > next.bounds.height) {
          const lives = next.lives - 1;
          next = {
            ...next,
            lives,
            combo: 0,
            status: lives <= 0 ? "gameover" : "playing",
            ballLaunched: false,
            launchAt: now + BALL_RELAUNCH_DELAY_MS,
            ball: resetBallToPaddle(ball, next.paddle, next.bounds.height),
          };
        } else {
          next.ball = ball;
        }
      }

      // Danger time
      if (next.status === "playing") {
        if (!next.dangerTime && next.score >= next.nextDangerScore) {
          next = {
            ...next,
            dangerTime: true,
            dangerEndsAt: now + DANGER_TIME_DURATION_MS,
            nextDangerScore: next.nextDangerScore + DANGER_TIME_SCORE_STEP,
            banner: { key: now + 1, text: "DANGER TIME!", tone: "danger" },
            bannerUntil: now + 1800,
          };
        } else if (next.dangerTime && now >= next.dangerEndsAt) {
          next = { ...next, dangerTime: false, dangerSurvivedThisRun: true };
        }
      }

      // Star shower
      if (next.status === "playing") {
        if (!next.starShower && now >= next.nextStarShowerAt) {
          next = {
            ...next,
            starShower: true,
            starShowerEndsAt: now + STAR_SHOWER_DURATION_MS,
            lastStarSpawnAt: 0,
            banner: { key: now + 2, text: "STAR SHOWER!", tone: "star" },
            bannerUntil: now + 1800,
          };
        } else if (next.starShower) {
          if (now >= next.starShowerEndsAt) {
            next = { ...next, starShower: false, stars: [], nextStarShowerAt: now + STAR_SHOWER_INTERVAL_MS };
          } else {
            let stars = next.stars.filter((s) => now - s.spawnedAt < STAR_LIFETIME_MS);
            if (now - next.lastStarSpawnAt >= STAR_SHOWER_SPAWN_EVERY_MS) {
              stars = [
                ...stars,
                {
                  id: uid("star"),
                  x: 24 + Math.random() * Math.max(40, next.bounds.width - 70),
                  y: next.bounds.height * STAR_ZONE_TOP_RATIO + Math.random() * next.bounds.height * 0.2,
                  spawnedAt: now,
                },
              ];
              next.lastStarSpawnAt = now;
            }
            next.stars = stars;
          }
        }
      }

      // Challenge progress
      if (next.challenge && next.status === "playing" && !next.challengeCompleted) {
        const progress = challengeProgressValue(next.challenge, next);
        next.challengeProgress = progress;
        if (progress >= next.challenge.target) {
          next.challengeCompleted = true;
          next.status = "gameover";
        }
      }

      return next;
    }

    default:
      return state;
  }
}

export function useGameLoop(mode: GameMode, challengeId: string | undefined, startLevel?: number) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    makeInitialState(mode, challengeId, Date.now(), startLevel),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, 16);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const movePaddle = useCallback((x: number) => dispatch({ type: "MOVE_PADDLE", x }), []);
  const pause = useCallback(() => dispatch({ type: "PAUSE", now: Date.now() }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME", now: Date.now() }), []);
  const restart = useCallback(() => dispatch({ type: "RESTART", now: Date.now() }), []);
  const collectStar = useCallback((id: string) => dispatch({ type: "COLLECT_STAR", id }), []);
  const removeFloating = useCallback((id: string) => dispatch({ type: "REMOVE_FLOATING", id }), []);
  const setBounds = useCallback(
    (width: number, height: number) => dispatch({ type: "SET_BOUNDS", width, height }),
    [],
  );

  return { state, movePaddle, pause, resume, restart, collectStar, removeFloating, setBounds };
}
