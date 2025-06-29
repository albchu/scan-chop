import { Vector2 } from "@workspace/shared";

export function rotateVector(vector: Vector2, degrees: number): Vector2 {
  const { x, y } = vector;
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: Math.round(x * cos - y * sin),
    y: Math.round(x * sin + y * cos),
  };
} 