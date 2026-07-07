import { useCallback, useEffect, useReducer, useRef } from "react";

import { COLOR_ORDER, nextColor } from "@/constants/colors";
import { SHAPE_ORDER, nextShape } from "@/constants/shapes";
import {
  DANGER_TIME_DURATION_MS,
  DANGER_TIME_SCORE_STEP,
  STAR_SHOWER_DURATION_MS,
  STAR_SHOWER_INTERVAL_MS,
  STAR_SHOWER_SPAWN_EVERY_MS,
  gateIntervalFor,
} from "@/game/difficulty";
import { generateGate } from "@/game/gateGenerator";
import { evaluateMatch } from "@/game/matchLogic";
import { computeMatchReward } from "@/game/scoring";
import { CHALLENGES } from "@/constants/challenges";
import {
  ChallengeDef,
  ColorName,
  FloatingText,
  Gate,
  GameMode,
  ShapeName,
} from "@/types";
import { uid } from "@/utils/id";

const STAR_LIFETIME_MS = 2400;
const MOOD_HOLD_MS = 420;

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

export type CharacterMood = "idle" | "run" | "hit" | "success";

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
  matches: number;
  perfectMatches: number;
  playerColor: ColorName;
  playerShape: ShapeName;
  lastColorChangeAt: number;
  lastShapeChangeAt: number;
  gate: Gate | null;
  characterMood: CharacterMood;
  moodUntil: number;
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
  | { type: "CHANGE_COLOR"; now: number }
  | { type: "CHANGE_SHAPE"; now: number }
  | { type: "PAUSE"; now: number }
  | { type: "RESUME"; now: number }
  | { type: "RESTART"; now: number }
  | { type: "COLLECT_STAR"; id: string; now: number }
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

function makeInitialState(
  mode: GameMode,
  challengeId: string | undefined,
  now: number,
): GameLoopState {
  const challenge = challengeId
    ? CHALLENGES.find((c) => c.id === challengeId) ?? null
    : null;
  const interval = gateIntervalFor(mode, 0, false);
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
    playerColor: COLOR_ORDER[0],
    playerShape: SHAPE_ORDER[0],
    lastColorChangeAt: 0,
    lastShapeChangeAt: 0,
    gate: generateGate(now, interval),
    characterMood: "run",
    moodUntil: 0,
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
    bounds: { width: 320, height: 500 },
  };
}

function pushFloating(list: FloatingText[], text: string, color: string, bounds: { width: number; height: number }): FloatingText[] {
  const item: FloatingText = {
    id: uid("float"),
    text,
    x: bounds.width / 2 - 40 + (Math.random() * 40 - 20),
    y: bounds.height * 0.42,
    color,
    createdAt: Date.now(),
  };
  const next = [...list, item];
  return next.length > 6 ? next.slice(next.length - 6) : next;
}

function reducer(state: GameLoopState, action: Action): GameLoopState {
  switch (action.type) {
    case "SET_BOUNDS":
      return { ...state, bounds: { width: action.width, height: action.height } };

    case "CHANGE_COLOR": {
      if (state.status !== "playing") return state;
      return {
        ...state,
        playerColor: nextColor(state.playerColor),
        lastColorChangeAt: action.now,
      };
    }

    case "CHANGE_SHAPE": {
      if (state.status !== "playing") return state;
      return {
        ...state,
        playerShape: nextShape(state.playerShape),
        lastShapeChangeAt: action.now,
      };
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
        gate: state.gate
          ? { ...state.gate, spawnedAt: state.gate.spawnedAt + delta, arrivesAt: state.gate.arrivesAt + delta }
          : null,
        dangerEndsAt: state.dangerEndsAt + delta,
        nextDangerScore: state.nextDangerScore,
        starShowerEndsAt: state.starShowerEndsAt + delta,
        nextStarShowerAt: state.nextStarShowerAt + delta,
        stars: state.stars.map((s) => ({ ...s, spawnedAt: s.spawnedAt + delta })),
        bannerUntil: state.bannerUntil + delta,
        moodUntil: state.moodUntil + delta,
      };
    }

    case "RESTART":
      return makeInitialState(state.mode, state.challenge?.id, action.now);

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
        floatingTexts: pushFloating(state.floatingTexts, "+1 ⭐", "#FFD35E", state.bounds),
      };
    }

    case "TICK": {
      if (state.status !== "playing") return state;
      const now = action.now;
      let next: GameLoopState = { ...state, now };

      // Mood reset
      if (next.characterMood !== "run" && now >= next.moodUntil) {
        next.characterMood = "run";
      }

      // Banner expiry
      if (next.banner && now >= next.bannerUntil) {
        next.banner = null;
      }

      // Gate resolution
      if (next.gate && now >= next.gate.arrivesAt) {
        const gate = next.gate;
        const result = evaluateMatch(
          gate,
          next.playerColor,
          next.playerShape,
          next.lastColorChangeAt,
          next.lastShapeChangeAt,
        );

        if (result === "wrong") {
          const lives = next.lives - 1;
          next = {
            ...next,
            lives,
            combo: 0,
            characterMood: "hit",
            moodUntil: now + MOOD_HOLD_MS,
            status: lives <= 0 ? "gameover" : "playing",
          };
        } else {
          const perfect = result === "perfect";
          const combo = next.combo + 1;
          const reward = computeMatchReward(perfect, gate.special, combo, next.dangerTime);
          const matches = next.matches + 1;
          const perfectMatches = next.perfectMatches + (perfect ? 1 : 0);
          const score = next.score + reward.scoreGain;
          const runCoins = next.runCoins + reward.coinGain;

          let floatingTexts = pushFloating(
            next.floatingTexts,
            perfect ? `+${reward.scoreGain} PERFECT!` : `+${reward.scoreGain}`,
            perfect ? "#FFD35E" : "#2ED47A",
            next.bounds,
          );
          if (combo >= 3) {
            floatingTexts = pushFloating(floatingTexts, `x${Math.min(5, Math.floor(combo / 3) + 1)} COMBO`, "#FF6FB5", next.bounds);
          }

          next = {
            ...next,
            score,
            runCoins,
            matches,
            perfectMatches,
            combo,
            highestCombo: Math.max(next.highestCombo, combo),
            characterMood: "success",
            moodUntil: now + MOOD_HOLD_MS,
            floatingTexts,
          };
        }

        if (next.status === "playing") {
          const interval = gateIntervalFor(next.mode, next.score, next.dangerTime);
          next.gate = generateGate(now, interval);
        } else {
          next.gate = null;
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
            banner: { key: Date.now(), text: "DANGER TIME!", tone: "danger" },
            bannerUntil: now + 1800,
          };
        } else if (next.dangerTime && now >= next.dangerEndsAt) {
          next = {
            ...next,
            dangerTime: false,
            dangerSurvivedThisRun: true,
          };
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
            banner: { key: Date.now(), text: "STAR SHOWER!", tone: "star" },
            bannerUntil: now + 1800,
          };
        } else if (next.starShower) {
          if (now >= next.starShowerEndsAt) {
            next = {
              ...next,
              starShower: false,
              stars: [],
              nextStarShowerAt: now + STAR_SHOWER_INTERVAL_MS,
            };
          } else {
            let stars = next.stars.filter((s) => now - s.spawnedAt < STAR_LIFETIME_MS);
            if (now - next.lastStarSpawnAt >= STAR_SHOWER_SPAWN_EVERY_MS) {
              stars = [
                ...stars,
                {
                  id: uid("star"),
                  x: 30 + Math.random() * Math.max(40, next.bounds.width - 90),
                  y: 90 + Math.random() * Math.max(40, next.bounds.height * 0.5),
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

export function useGameLoop(mode: GameMode, challengeId: string | undefined) {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    makeInitialState(mode, challengeId, Date.now()),
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      dispatch({ type: "TICK", now: Date.now() });
    }, 33);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const changeColor = useCallback(() => dispatch({ type: "CHANGE_COLOR", now: Date.now() }), []);
  const changeShape = useCallback(() => dispatch({ type: "CHANGE_SHAPE", now: Date.now() }), []);
  const pause = useCallback(() => dispatch({ type: "PAUSE", now: Date.now() }), []);
  const resume = useCallback(() => dispatch({ type: "RESUME", now: Date.now() }), []);
  const restart = useCallback(() => dispatch({ type: "RESTART", now: Date.now() }), []);
  const collectStar = useCallback((id: string) => dispatch({ type: "COLLECT_STAR", id, now: Date.now() }), []);
  const removeFloating = useCallback((id: string) => dispatch({ type: "REMOVE_FLOATING", id }), []);
  const setBounds = useCallback(
    (width: number, height: number) => dispatch({ type: "SET_BOUNDS", width, height }),
    [],
  );

  return {
    state,
    changeColor,
    changeShape,
    pause,
    resume,
    restart,
    collectStar,
    removeFloating,
    setBounds,
  };
}
