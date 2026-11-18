import type { Espace } from '../types';
import { area, bbox, labelPoint, type Bbox } from './geometry';
import type { Point } from '../types';

/** Espace accompagné de sa géométrie pré-calculée. */
export interface ZoneGeom {
  espace: Espace;
  area: number;
  box: Bbox;
  label: Point;
}

/** Les grandes zones d'abord : dessinées dessous, elles ne masquent pas les petites. */
export function buildZones(espaces: Espace[]): ZoneGeom[] {
  return espaces
    .filter((espace) => espace.contour.length >= 3)
    .map((espace) => ({
      espace,
      area: area(espace.contour),
      box: bbox(espace.contour),
      label: labelPoint(espace.contour),
    }))
    .sort((a, b) => b.area - a.area);
}
