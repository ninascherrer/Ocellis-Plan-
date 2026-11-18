import { describe, expect, it } from 'vitest';
import { area, bbox, distanceToSegment, labelPoint, pointInPolygon } from '../lib/geometry';
import type { Point } from '../types';

const square: Point[] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
];
// Forme en U : le centre de la boîte englobante tombe hors du polygone.
const uShape: Point[] = [
  [0, 0],
  [30, 0],
  [30, 30],
  [20, 30],
  [20, 10],
  [10, 10],
  [10, 30],
  [0, 30],
];

describe('géométrie', () => {
  it('calcule aire et boîte englobante', () => {
    expect(area(square)).toBe(100);
    expect(bbox(uShape)).toEqual({ minX: 0, minY: 0, maxX: 30, maxY: 30 });
  });

  it('teste l’appartenance d’un point', () => {
    expect(pointInPolygon([5, 5], square)).toBe(true);
    expect(pointInPolygon([15, 5], square)).toBe(false);
    expect(pointInPolygon([15, 20], uShape)).toBe(false);
  });

  it('mesure la distance à un segment', () => {
    expect(distanceToSegment([5, 3], [0, 0], [10, 0]).distance).toBeCloseTo(3);
    expect(distanceToSegment([-4, 3], [0, 0], [10, 0]).distance).toBeCloseTo(5);
  });

  it('place l’étiquette à l’intérieur, même dans un polygone en U', () => {
    const [x, y] = labelPoint(uShape);
    expect(pointInPolygon([x, y], uShape)).toBe(true);
    const [cx, cy] = labelPoint(square);
    expect(cx).toBeCloseTo(5, 0);
    expect(cy).toBeCloseTo(5, 0);
  });
});

describe('circulations', () => {
  it('forment une boucle continue autour du noyau, sans le couvrir', async () => {
    const { configFichier } = await import('../config');
    const contour = configFichier.espaces.find((e) => e.id === 'circulations')!.contour;
    // Couloir est, traverse au-dessus de l'îlot, allée de la cafétéria, couloir sud.
    for (const p of [[390, 200], [420, 282], [446, 360], [300, 460]] as Point[]) {
      expect(pointInPolygon(p, contour)).toBe(true);
    }
    // Noyau central, îlot, cuisine : hors circulation.
    for (const p of [[270, 150], [410, 380], [370, 400]] as Point[]) {
      expect(pointInPolygon(p, contour)).toBe(false);
    }
  });
});
