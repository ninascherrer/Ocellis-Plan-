/**
 * Structure du plan (murs, cloisons, portes), partagée par le dessin 2D
 * (PlanDessin.tsx) et l'aperçu 3D (Plan3D.tsx).
 *
 * Coordonnées dans le repère du plan (624 × 625), relevées sur le plan
 * d'architecte « OCELLIS X CDG – Implantation » (PDF, 1/125).
 */
import type { Point } from '../types';

/**
 * Mètres par unité du plan. Mesuré sur le PDF : la barre d'échelle (5 m)
 * fait 315 px à 200 dpi, et une unité du plan vaut 2,63 px à cette résolution.
 */
export const METRES_PAR_UNITE = 0.0418;

/** Hauteur des portes indiquée au plan (« PP 93/204 »), en mètres. */
export const HAUTEUR_PORTE_M = 2.04;

/**
 * Types de cloison de la légende du PDF. Le plan n'indique pas de hauteur
 * sous plafond : la 3D les représente par des cloisons basses schématiques.
 */
export type TypeCloison = 'mur' | 'pleine' | 'vitree-allege' | 'vitree';

export interface Mur {
  x: number;
  y: number;
  w: number;
  h: number;
  type: TypeCloison;
  /** Lecture du plan incertaine : signalée « [à confirmer] » dans la 3D. */
  aConfirmer?: string;
}

export interface Porte {
  /** Gond. */
  h: Point;
  /** Extrémité du vantail fermé, dans l'axe du mur. */
  ferme: Point;
  /** Extrémité du vantail ouvert. */
  ouvert: Point;
}

/** Mur horizontal de y à y + e, entre x1 et x2. */
const hw = (x1: number, x2: number, y: number, e = 2, type: TypeCloison = 'pleine', aConfirmer?: string): Mur => ({
  x: x1,
  y,
  w: x2 - x1,
  h: e,
  type,
  aConfirmer,
});
/** Mur vertical de x à x + e, entre y1 et y2. */
const vw = (x: number, y1: number, y2: number, e = 2, type: TypeCloison = 'pleine', aConfirmer?: string): Mur => ({
  x,
  y: y1,
  w: e,
  h: y2 - y1,
  type,
  aConfirmer,
});

export const MURS: Mur[] = [
  // Enveloppe du bâtiment
  vw(28, 0, 604, 5, 'mur'),
  hw(28, 503, 600, 5, 'mur'),
  hw(28, 503, 0, 2, 'mur'),
  vw(497, 0, 328, 5, 'mur'),
  vw(497, 352, 452, 5, 'mur'),
  vw(497, 476, 604, 5, 'mur'),

  // Rangée haute : salles et escalier
  hw(33, 134, 64, 1.5, 'vitree'),
  vw(157, 0, 66, 3),
  hw(160, 212, 64, 1.5, 'vitree'),
  vw(238, 0, 66, 3),
  hw(241, 322, 63, 2),
  vw(344, 0, 66, 3),
  hw(381, 430, 63, 2, 'vitree'),
  vw(408, 0, 64, 3),

  // Matériauthèque et salle vitrée (OCELLE)
  hw(410, 500, 94, 3),
  vw(410, 94, 176, 1.5, 'vitree'),
  hw(410, 482, 200, 1.5, 'vitree'),
  vw(481, 94, 225, 1.5),

  // Noyau central (gaines et locaux techniques : tracé intérieur simplifié)
  hw(200, 347, 96, 2, 'mur'),
  vw(200, 96, 266, 2.5, 'mur'),
  vw(345, 96, 266, 2.5, 'mur'),
  vw(271, 187, 262, 2, 'mur', 'Cloisons intérieures du noyau technique, simplifiées'),
  hw(201, 346, 186, 1.5, 'mur'),
  hw(200, 236, 261, 2, 'mur'),
  hw(310, 347, 261, 2, 'mur'),
  vw(200, 292, 445, 2.5, 'mur'),
  vw(345, 292, 445, 2.5, 'mur'),
  hw(200, 347, 443, 2.5, 'mur'),

  // Colonne de services
  hw(163, 199, 116, 1.5),
  hw(163, 199, 145, 1.5),
  hw(163, 199, 193, 1.5),
  hw(163, 199, 242, 1.5),
  vw(197, 116, 243, 2),
  vw(163, 116, 160, 1.5),
  vw(163, 178, 210, 1.5, 'vitree'),
  vw(163, 228, 243, 1.5, 'vitree'),
  vw(166, 315, 328, 2),
  vw(166, 350, 363, 2),

  // Cuisine
  vw(350, 358, 432, 2),
  hw(350, 384, 330, 1.2),

  // Rangée basse
  hw(53, 70, 450, 1.5, 'vitree'),
  hw(92, 119, 450, 1.5, 'vitree'),
  vw(92, 450, 517, 1.5, 'vitree'),
  vw(141, 450, 517, 2, 'vitree'),
  vw(51, 445, 600, 3),
  hw(51, 143, 516, 3),
  hw(165, 178, 516, 3),
  vw(176, 516, 600, 2.5),

  // Sanitaires et local central
  vw(193, 488, 600, 2.5),
  hw(193, 199, 488, 2),
  hw(220, 333, 488, 2),
  hw(354, 372, 488, 2),
  vw(230, 488, 517, 2),
  hw(230, 332, 538, 2),
  vw(320, 488, 538, 2),
  vw(279, 538, 600, 2.5),
  vw(357, 488, 600, 2.5),
  vw(372, 478, 600, 2),
  hw(232, 279, 579, 1.2),
  hw(281, 330, 579, 1.2),
  vw(253, 540, 579, 1.2),
  vw(306, 540, 579, 1.2),
];

/** Cadre de l'alcôve « SPIX » (Box C), tracé en contour dans le dessin 2D. */
export const CADRE_SPIX = { x: 167, y: 315, w: 31, h: 48 };

/** Noyau technique (gaines, locaux non accessibles). */
export const NOYAU: Point[] = [
  [201, 97],
  [346, 97],
  [346, 262],
  [336, 262],
  [336, 187],
  [275, 187],
  [275, 207],
  [205, 207],
  [205, 262],
  [201, 262],
];

/** Façade de la terrasse (garde-corps), arrondi au nord-est. */
export const FACADE_TERRASSE_SVG = 'M505 309H597Q612 309 612 324V603H505';

export const PORTES: Porte[] = [
  { h: [155, 65], ferme: [134, 65], ouvert: [155, 44] },
  { h: [236, 65], ferme: [213, 65], ouvert: [236, 42] },
  { h: [343, 63], ferme: [322, 63], ouvert: [343, 42] },
  { h: [356, 64], ferme: [381, 64], ouvert: [356, 40] },
  { h: [411, 200], ferme: [411, 176], ouvert: [435, 200] },
  { h: [163, 178], ferme: [163, 160], ouvert: [145, 178] },
  { h: [163, 228], ferme: [163, 210], ouvert: [145, 228] },
  { h: [166, 350], ferme: [166, 328], ouvert: [144, 350] },
  { h: [200, 292], ferme: [200, 266], ouvert: [226, 292] },
  { h: [346, 292], ferme: [346, 266], ouvert: [320, 292] },
  { h: [352, 358], ferme: [352, 334], ouvert: [376, 358] },
  { h: [500, 352], ferme: [500, 328], ouvert: [476, 352] },
  { h: [500, 476], ferme: [500, 452], ouvert: [476, 476] },
  { h: [92, 450], ferme: [70, 450], ouvert: [92, 472] },
  { h: [141, 450], ferme: [119, 450], ouvert: [141, 472] },
  { h: [143, 517], ferme: [165, 517], ouvert: [143, 495] },
  { h: [199, 489], ferme: [220, 489], ouvert: [199, 510] },
  { h: [354, 489], ferme: [333, 489], ouvert: [354, 510] },
  { h: [231, 538], ferme: [231, 517], ouvert: [249, 527] },
];
