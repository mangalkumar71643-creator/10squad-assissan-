import { Ball, Brick, Paddle } from "@/types";

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function circleRectCollision(ball: Ball, rect: RectLike): boolean {
  const closestX = clamp(ball.x, rect.x, rect.x + rect.width);
  const closestY = clamp(ball.y, rect.y, rect.y + rect.height);
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy <= ball.radius * ball.radius;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Reflects the ball off a rectangle, choosing the axis with the smaller penetration. */
export function reflectOffRect(ball: Ball, rect: RectLike): void {
  const overlapLeft = ball.x + ball.radius - rect.x;
  const overlapRight = rect.x + rect.width - (ball.x - ball.radius);
  const overlapTop = ball.y + ball.radius - rect.y;
  const overlapBottom = rect.y + rect.height - (ball.y - ball.radius);

  const minOverlapX = Math.min(overlapLeft, overlapRight);
  const minOverlapY = Math.min(overlapTop, overlapBottom);

  if (minOverlapX < minOverlapY) {
    ball.vx = -ball.vx;
    ball.x += overlapLeft < overlapRight ? -minOverlapX : minOverlapX;
  } else {
    ball.vy = -ball.vy;
    ball.y += overlapTop < overlapBottom ? -minOverlapY : minOverlapY;
  }
}

/** Reflects the ball off the paddle with an angle based on hit position (classic breakout feel). */
export function reflectOffPaddle(ball: Ball, paddle: Paddle, paddleY: number, speed: number): void {
  const paddleCenter = paddle.x + paddle.width / 2;
  const hitOffset = clamp((ball.x - paddleCenter) / (paddle.width / 2), -1, 1);
  const maxAngle = (Math.PI / 180) * 65;
  const angle = hitOffset * maxAngle;
  ball.vx = speed * Math.sin(angle);
  ball.vy = -Math.abs(speed * Math.cos(angle));
  ball.y = paddleY - ball.radius;
}

export function findBrickHit(ball: Ball, bricks: Brick[]): Brick | null {
  for (const brick of bricks) {
    if (!brick.alive) continue;
    if (circleRectCollision(ball, brick)) return brick;
  }
  return null;
}
