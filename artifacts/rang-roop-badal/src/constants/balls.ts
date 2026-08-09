import { CurrencyType } from "@/types";

export type BallAnimation = "pulse" | "spin" | "sparkle" | "wave";

export interface BallDef {
  id: string;
  name: string;
  price: number;
  currency: CurrencyType;
  color: string;
  glowColor: string;
  animation: BallAnimation;
}

export const BALLS: BallDef[] = [
  {
    id: "nova",
    name: "Nova",
    price: 0,
    currency: "coins",
    color: "#F5F6FF",
    glowColor: "#3EE9F0",
    animation: "pulse",
  },
  {
    id: "ember",
    name: "Ember",
    price: 300,
    currency: "coins",
    color: "#FF6A3D",
    glowColor: "#FFD35E",
    animation: "spin",
  },
  {
    id: "volt",
    name: "Volt",
    price: 500,
    currency: "coins",
    color: "#FFE94A",
    glowColor: "#3EE9F0",
    animation: "sparkle",
  },
  {
    id: "frost",
    name: "Frost",
    price: 60,
    currency: "stars",
    color: "#7FD8FF",
    glowColor: "#F5F6FF",
    animation: "wave",
  },
];
