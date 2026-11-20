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
  it('suivent le plan de zoning Ocellis (indice 10) : couloirs ouest, nord et sud', async () => {
    const { configFichier } = await import('../config');
    const zone = (id: string) => configFichier.espaces.find((e) => e.id === id)!.contour;
    const circulations = zone('circulations');
    for (const p of [[150, 300], [300, 80], [300, 460]] as Point[]) {
      expect(pointInPolygon(p, circulations), JSON.stringify(p)).toBe(true);
    }
    // Noyau, matériauthèque, Le Loby et Bistro : hors circulation.
    for (const p of [[270, 150], [370, 200], [420, 282], [446, 360], [420, 460]] as Point[]) {
      expect(pointInPolygon(p, circulations), JSON.stringify(p)).toBe(false);
    }
    expect(pointInPolygon([370, 200], zone('materiautheque'))).toBe(true);
    expect(pointInPolygon([420, 282], zone('espace-15'))).toBe(true);
    expect(pointInPolygon([420, 460], zone('espace-14'))).toBe(true);
  });
});
