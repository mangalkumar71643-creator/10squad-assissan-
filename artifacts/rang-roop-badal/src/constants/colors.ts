import { ColorName } from "@/types";

export const COLOR_HEX: Record<ColorName, string> = {
  White: "#F5F6FA",
  Red: "#FF4757",
  Yellow: "#FFD32A",
  Purple: "#9B59F6",
  Black: "#2B2B38",
  Blue: "#3E7BFA",
  Pink: "#FF6FB5",
  Violet: "#7B4CE0",
  Green: "#2ED47A",
  Orange: "#FF9F43",
};

export const COLOR_ORDER: ColorName[] = [
  "White",
  "Red",
  "Yellow",
  "Purple",
  "Black",
  "Blue",
  "Pink",
  "Violet",
  "Green",
  "Orange",
];

export function nextColor(current: ColorName): ColorName {
  const idx = COLOR_ORDER.indexOf(current);
  return COLOR_ORDER[(idx + 1) % COLOR_ORDER.length];
}

export function randomColor(exclude?: ColorName): ColorName {
  const pool = exclude
    ? COLOR_ORDER.filter((c) => c !== exclude)
    : COLOR_ORDER;
  return pool[Math.floor(Math.random() * pool.length)];
}
