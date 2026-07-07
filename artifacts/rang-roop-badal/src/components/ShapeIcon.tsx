import React from "react";
import Svg, { Circle, Rect, Polygon } from "react-native-svg";

import { ShapeName } from "@/types";

interface Props {
  shape: ShapeName;
  color: string;
  size?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

function starPoints(cx: number, cy: number, r: number, ir: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : ir;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return points.join(" ");
}

function hexPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(" ");
}

function triPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(" ");
}

export function ShapeIcon({ shape, color, size = 40, strokeColor, strokeWidth = 0 }: Props) {
  const c = size / 2;
  const r = size / 2 - (strokeWidth || 2);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {shape === "Circle" && (
        <Circle cx={c} cy={c} r={r} fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />
      )}
      {shape === "Square" && (
        <Rect
          x={c - r * 0.85}
          y={c - r * 0.85}
          width={r * 1.7}
          height={r * 1.7}
          rx={size * 0.12}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}
      {shape === "Triangle" && (
        <Polygon points={triPoints(c, c, r)} fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />
      )}
      {shape === "Star" && (
        <Polygon
          points={starPoints(c, c, r, r * 0.42)}
          fill={color}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      )}
      {shape === "Hexagon" && (
        <Polygon points={hexPoints(c, c, r)} fill={color} stroke={strokeColor} strokeWidth={strokeWidth} />
      )}
    </Svg>
  );
}
