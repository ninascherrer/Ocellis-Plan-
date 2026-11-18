/**
 * Mobilier de l'aperçu 3D, en formes simples, reprenant les positions du
 * dessin 2D (PlanDessin.tsx) pour le secteur de l'aperçu.
 *
 * Coordonnées dans le repère du plan (624 × 625) ; `a` = rotation en degrés,
 * même convention que le dessin 2D (0 = dossier vers le haut du plan).
 * Les hauteurs ne figurent pas au PDF : valeurs usuelles, [à confirmer].
 */

export type TypeMeuble =
  | 'table'
  | 'plan'
  | 'chaise'
  | 'tabouret'
  | 'fauteuil'
  | 'canape-dossier'
  | 'canape-assise'
  | 'pouf'
  | 'banquette'
  | 'casiers'
  | 'etagere'
  | 'comptoir';

export interface Meuble {
  type: TypeMeuble;
  /** Rectangle (x, y, w, h) — ou centre (x, y) et rayon `r` pour les formes rondes. */
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  a?: number;
  /** Nombre de portes (casiers). */
  n?: number;
}

/** Hauteurs schématiques, en mètres [à confirmer]. */
export const HAUTEURS_MOBILIER: Record<TypeMeuble, number> = {
  table: 0.74,
  plan: 0.74,
  chaise: 0.46,
  tabouret: 0.65,
  fauteuil: 0.42,
  'canape-dossier': 0.78,
  'canape-assise': 0.42,
  pouf: 0.42,
  banquette: 0.45,
  casiers: 1.9,
  etagere: 2.0,
  comptoir: 1.05,
};

const chaises = (xs: number[], y: number, a: number): Meuble[] => xs.map((x) => ({ type: 'chaise', x, y, a }));

export const MOBILIER: Meuble[] = [
  // NOVA : canapé en U, poufs, fauteuil, banquette
  { type: 'canape-dossier', x: 36, y: 4, w: 92, h: 13 },
  { type: 'canape-assise', x: 36, y: 17, w: 12, h: 18 },
  { type: 'canape-assise', x: 117, y: 17, w: 11, h: 18 },
  { type: 'pouf', x: 63.5, y: 19.5, r: 4.5 },
  { type: 'pouf', x: 93.5, y: 19.5, r: 4.5 },
  { type: 'canape-assise', x: 48, y: 24, w: 10, h: 11 },
  { type: 'fauteuil', x: 34, y: 40, w: 14, h: 13, a: -16 },
  { type: 'banquette', x: 55, y: 58, w: 63, h: 6 },

  // ÉCHO : table, quatre chaises rondes, siège rond
  { type: 'table', x: 163, y: 18, w: 74, h: 28 },
  { type: 'pouf', x: 180, y: 12, r: 5.5 },
  { type: 'pouf', x: 201, y: 12, r: 5.5 },
  { type: 'pouf', x: 180, y: 51, r: 5.5 },
  { type: 'pouf', x: 201, y: 51, r: 5.5 },
  { type: 'pouf', x: 227, y: 11, r: 7 },

  // HALO : plan de travail trois places, fauteuil
  { type: 'plan', x: 381, y: 8, w: 17, h: 52 },
  ...[16, 34, 51].map((y): Meuble => ({ type: 'chaise', x: 371, y, a: 90 })),
  { type: 'fauteuil', x: 352, y: 11, w: 12, h: 12, a: 30 },

  // OREE : plans de travail le long des parois
  { type: 'plan', x: 411, y: 3, w: 17, h: 59 },
  { type: 'plan', x: 482, y: 3, w: 15, h: 90 },
  { type: 'chaise', x: 433, y: 17, a: -90 },
  { type: 'chaise', x: 433, y: 47, a: -90 },
  { type: 'chaise', x: 471, y: 13, a: 90 },
  { type: 'chaise', x: 471, y: 40, a: 90 },
  { type: 'chaise', x: 471, y: 70, a: 90 },

  // Espace de travail ouvert : deux tables de six places
  { type: 'table', x: 33, y: 97, w: 95, h: 38 },
  ...chaises([48, 80, 111], 90, 0),
  ...chaises([48, 80, 111], 142, 180),
  { type: 'table', x: 33, y: 187, w: 95, h: 38 },
  ...chaises([48, 80, 111], 180, 0),
  ...chaises([48, 80, 111], 232, 180),

  // Colonne de services : casiers, Box A (poufs et assises), Box B (banquettes)
  { type: 'casiers', x: 163, y: 101, w: 35, h: 14, n: 4 },
  { type: 'plan', x: 165, y: 132, w: 32, h: 12 },
  { type: 'pouf', x: 172, y: 155, r: 5 },
  { type: 'fauteuil', x: 183, y: 154, w: 8, h: 14, a: 35 },
  { type: 'fauteuil', x: 171, y: 177, w: 8, h: 14, a: -25 },
  { type: 'pouf', x: 185, y: 185, r: 5 },
  { type: 'banquette', x: 165, y: 197, w: 32, h: 11 },
  { type: 'banquette', x: 165, y: 229, w: 32, h: 12 },
  { type: 'casiers', x: 163, y: 245, w: 35, h: 13, n: 4 },

  // Matériauthèque : armoires hautes en L autour d'OCELLE, et meuble de consultation côté couloir
  { type: 'etagere', x: 398, y: 87, w: 51, h: 9 },
  { type: 'etagere', x: 398, y: 96, w: 13.5, h: 110 },
  { type: 'etagere', x: 404, y: 206, w: 27, h: 11, a: 32 },
  { type: 'comptoir', x: 350, y: 101, w: 17, h: 148 },

  // OCELLE : table et six chaises
  { type: 'table', x: 434, y: 125, w: 35, h: 58 },
  ...[136, 154, 171].flatMap((y): Meuble[] => [
    { type: 'chaise', x: 428, y, a: -90 },
    { type: 'chaise', x: 475, y, a: 90 },
  ]),

  // Comptoir et tabourets devant OCELLE, vestiaires
  { type: 'comptoir', x: 412, y: 203, w: 70, h: 7 },
  ...[437, 459, 478].map((x): Meuble => ({ type: 'tabouret', x, y: 216, r: 4 })),
  { type: 'casiers', x: 431, y: 226, w: 21, h: 14, n: 3 },
];
