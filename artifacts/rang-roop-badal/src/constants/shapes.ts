import { ShapeName } from "@/types";

export const SHAPE_ORDER: ShapeName[] = [
  "Circle",
  "Square",
  "Triangle",
  "Star",
  "Hexagon",
];

export function nextShape(current: ShapeName): ShapeName {
  const idx = SHAPE_ORDER.indexOf(current);
  return SHAPE_ORDER[(idx + 1) % SHAPE_ORDER.length];
}

export function randomShape(exclude?: ShapeName): ShapeName {
  const pool = exclude
    ? SHAPE_ORDER.filter((s) => s !== exclude)
    : SHAPE_ORDER;
  return pool[Math.floor(Math.random() * pool.length)];
}
