import { DailyRewardDef } from "@/types";

export const DAILY_REWARDS: DailyRewardDef[] = [
  { day: 1, label: "50 Coins", currency: "coins", amount: 50 },
  { day: 2, label: "75 Coins", currency: "coins", amount: 75 },
  { day: 3, label: "10 Stars", currency: "stars", amount: 10 },
  { day: 4, label: "100 Coins", currency: "coins", amount: 100 },
  { day: 5, label: "Special Trail", currency: "special", amount: 1 },
  { day: 6, label: "20 Stars", currency: "stars", amount: 20 },
  { day: 7, label: "Big Reward: 300 Coins + 40 Stars", currency: "special", amount: 1 },
];
