import { ChallengeDef } from "@/types";

export const CHALLENGES: ChallengeDef[] = [
  {
    id: "make_20_matches",
    title: "Match Rush",
    description: "Make 20 correct matches in one run.",
    type: "matches",
    target: 20,
    reward: { coins: 80 },
  },
  {
    id: "reach_combo_5",
    title: "Combo Climb",
    description: "Reach a x5 combo.",
    type: "combo",
    target: 5,
    reward: { coins: 60, stars: 5 },
  },
  {
    id: "collect_30_coins",
    title: "Coin Hunt",
    description: "Collect 30 coins in one run.",
    type: "coins",
    target: 30,
    reward: { stars: 8 },
  },
  {
    id: "survive_danger_time",
    title: "Danger Survivor",
    description: "Survive a Danger Time event.",
    type: "danger_survive",
    target: 1,
    reward: { coins: 100, stars: 10 },
  },
  {
    id: "ten_perfect_matches",
    title: "Perfectionist",
    description: "Complete 10 perfect matches.",
    type: "perfect_matches",
    target: 10,
    reward: { coins: 120 },
  },
];
