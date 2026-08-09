export function comboMultiplier(combo: number): number {
  if (combo >= 12) return 5;
  if (combo >= 9) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

export interface BrickReward {
  perfect: boolean;
  scoreGain: number;
  coinGain: number;
}

export function computeBrickReward(
  brickPoints: number,
  combo: number,
  perfect: boolean,
  dangerTime: boolean,
): BrickReward {
  const multiplier = comboMultiplier(combo) * (dangerTime ? 1.5 : 1);
  const base = perfect ? brickPoints * 1.6 : brickPoints;
  const scoreGain = Math.round(base * multiplier);
  const coinGain = perfect ? 3 : 1;
  return { perfect, scoreGain, coinGain };
}
