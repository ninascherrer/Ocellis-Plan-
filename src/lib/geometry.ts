import type { Point } from '../types';

export interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function bbox(points: Point[]): Bbox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/** Aire (toujours positive) du polygone. */
export function area(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

export function pointInPolygon([px, py]: Point, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Distance du point P au segment [A, B], et position projetée sur ce segment. */
export function distanceToSegment(p: Point, a: Point, b: Point): { distance: number; t: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSq));
  const x = a[0] + t * dx;
  const y = a[1] + t * dy;
  return { distance: Math.hypot(p[0] - x, p[1] - y), t };
}

function distanceToEdges(p: Point, points: Point[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    const d = distanceToSegment(p, points[i], points[(i + 1) % points.length]).distance;
    if (d < min) min = d;
  }
  return min;
}

/**
 * Point intérieur le plus éloigné des bords (« pôle d'inaccessibilité »),
 * idéal pour placer une étiquette, y compris dans un polygone en L ou en U.
 * Recherche sur grille puis affinage local : largement suffisant pour des
 * polygones de quelques dizaines de sommets.
 */
export function labelPoint(points: Point[]): Point {
  const box = bbox(points);
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  let best: Point = [(box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2];
  let bestDistance = pointInPolygon(best, points) ? distanceToEdges(best, points) : -Infinity;

  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const candidate: Point = [box.minX + (width * i) / steps, box.minY + (height * j) / steps];
      if (!pointInPolygon(candidate, points)) continue;
      const d = distanceToEdges(candidate, points);
      if (d > bestDistance) {
        bestDistance = d;
        best = candidate;
      }
    }
  }

  // Affinage autour du meilleur candidat.
  let step = Math.max(width, height) / steps / 2;
  while (step > 0.25) {
    for (const [dx, dy] of [
      [step, 0],
      [-step, 0],
      [0, step],
      [0, -step],
    ]) {
      const candidate: Point = [best[0] + dx, best[1] + dy];
      if (!pointInPolygon(candidate, points)) continue;
      const d = distanceToEdges(candidate, points);
      if (d > bestDistance) {
        bestDistance = d;
        best = candidate;
      }
    }
    step /= 2;
  }
  return best;
}

export function toSvgPoints(points: Point[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

/** Arrondit une coordonnée au dixième pour garder un JSON lisible. */
export function roundCoord(value: number): number {
  return Math.round(value * 10) / 10;
}
