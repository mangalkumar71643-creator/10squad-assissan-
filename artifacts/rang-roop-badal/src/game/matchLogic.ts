import { ColorName, Gate, MatchResult, ShapeName } from "@/types";
import { PERFECT_WINDOW_MS } from "@/game/difficulty";

export function evaluateMatch(
  gate: Gate,
  playerColor: ColorName,
  playerShape: ShapeName,
  lastColorChangeAt: number,
  lastShapeChangeAt: number,
): MatchResult {
  const isCorrect = gate.color === playerColor && gate.shape === playerShape;
  if (!isCorrect) return "wrong";

  const lastChangeAt = Math.max(lastColorChangeAt, lastShapeChangeAt);
  const timeSinceChange = gate.arrivesAt - lastChangeAt;
  const isPerfect = timeSinceChange >= 0 && timeSinceChange <= PERFECT_WINDOW_MS;
  return isPerfect ? "perfect" : "correct";
}
