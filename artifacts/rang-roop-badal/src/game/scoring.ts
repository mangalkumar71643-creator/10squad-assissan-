export function comboMultiplier(combo: number): number {
  if (combo >= 12) return 5;
  if (combo >= 9) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export interface MatchOutcome {
  perfect: boolean;
  scoreGain: number;
  coinGain: number;
}

export function computeMatchReward(
  perfect: boolean,
  special: boolean,
  combo: number,
  dangerTime: boolean,
): MatchOutcome {
  const base = perfect ? 25 : 10;
  const multiplier = comboMultiplier(combo) * (dangerTime ? 1.5 : 1);
  let scoreGain = Math.round(base * multiplier);
  if (special) scoreGain += 50;
  const coinGain = perfect ? 5 : 2;
  return { perfect, scoreGain, coinGain };
}
