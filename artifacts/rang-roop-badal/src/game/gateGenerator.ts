import { randomColor } from "@/constants/colors";
import { randomShape } from "@/constants/shapes";
import { Gate } from "@/types";
import { uid } from "@/utils/id";
import { SPECIAL_GATE_CHANCE } from "@/game/difficulty";

export function generateGate(now: number, durationMs: number): Gate {
  return {
    id: uid("gate"),
    color: randomColor(),
    shape: randomShape(),
    spawnedAt: now,
    arrivesAt: now + durationMs,
    special: Math.random() < SPECIAL_GATE_CHANCE,
    resolved: false,
  };
}
