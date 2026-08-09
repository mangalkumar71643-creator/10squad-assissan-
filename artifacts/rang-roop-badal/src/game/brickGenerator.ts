import { COLOR_ORDER, COLOR_HEX } from "@/constants/colors";
import { Brick } from "@/types";
import { uid } from "@/utils/id";
import {
  BRICK_AREA_HEIGHT_RATIO,
  BRICK_COLS,
  BRICK_GAP,
  BRICK_ROWS,
  BRICK_TOP_OFFSET_RATIO,
} from "@/game/difficulty";

export function generateBricks(boundsWidth: number, boundsHeight: number): Brick[] {
  const topOffset = boundsHeight * BRICK_TOP_OFFSET_RATIO;
  const areaHeight = boundsHeight * BRICK_AREA_HEIGHT_RATIO;
  const rows = BRICK_ROWS;
  const cols = BRICK_COLS;

  const brickWidth = (boundsWidth - BRICK_GAP * (cols + 1)) / cols;
  const brickHeight = Math.min(26, (areaHeight - BRICK_GAP * (rows + 1)) / rows);

  const bricks: Brick[] = [];
  for (let row = 0; row < rows; row++) {
    const color = COLOR_ORDER[row % COLOR_ORDER.length];
    const points = (rows - row) * 5; // top-row-equivalent bricks (further, harder to reach in a cleared board) score more
    for (let col = 0; col < cols; col++) {
      bricks.push({
        id: uid("brick"),
        row,
        col,
        x: BRICK_GAP + col * (brickWidth + BRICK_GAP),
        y: topOffset + BRICK_GAP + row * (brickHeight + BRICK_GAP),
        width: brickWidth,
        height: brickHeight,
        color: COLOR_HEX[color],
        points,
        alive: true,
      });
    }
  }
  return bricks;
}
