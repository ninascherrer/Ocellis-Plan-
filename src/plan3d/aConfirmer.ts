import type { Point } from '../types';

/**
 * Éléments absents ou difficiles à lire sur le PDF, signalés « [à confirmer] »
 * dans l'aperçu 3D, avec le choix schématique retenu.
 * `position` est dans le repère du plan (624 × 625).
 */
export interface PointAConfirmer {
  id: string;
  position: Point;
  /** Libellé court affiché sur la maquette. */
  titre: string;
  /** Ce qui manque au PDF et le choix fait dans l'aperçu, affiché au clic. */
  texte: string;
}

export const POINTS_A_CONFIRMER: PointAConfirmer[] = [
  {
    id: 'hauteur-cloisons',
    titre: 'Hauteur des cloisons',
    position: [149, 175],
    texte: 'Non cotée. Choix : 2,40 m, déduite des portes vitrées « PV 2400/930 » du PDF.',
  },
  {
    id: 'hauteur-enveloppe',
    titre: 'Hauteur sous plafond',
    position: [272, 150],
    texte: 'Non cotée. Choix : façades et noyau technique à 2,70 m, sans plafond.',
  },
  {
    id: 'vitrage-ocelle',
    titre: 'Vitrage OCELLE',
    position: [412, 150],
    texte: 'Porte « PV 2680/930 » : vitrage peut-être à 2,68 m. Type (toute hauteur ou sur allège) à confirmer. Choix : toute hauteur, 2,40 m.',
  },
  {
    id: 'impostes',
    titre: 'Au-dessus des portes',
    position: [146, 62],
    texte: 'Portes pleines 2,04 m (« PP 93/204 ») dans des cloisons de 2,40 m : imposte non dessinée. Choix : baie ouverte jusqu\'en haut.',
  },
  {
    id: 'escalier',
    titre: 'Escalier',
    position: [290, 22],
    texte: 'Nombre et hauteur des marches non indiqués. Choix : 11 marches de 17 cm, coupées à 1,90 m.',
  },
  {
    id: 'mobilier',
    titre: 'Hauteurs du mobilier',
    position: [80, 205],
    texte: 'Non indiquées. Choix : tables 74 cm, assises 42 à 46 cm, casiers 1,90 m, armoires de la matériauthèque 2,00 m.',
  },
  {
    id: 'petit-local',
    titre: 'Petit local',
    position: [181, 131],
    texte: 'Usage et cloisonnement du local de la colonne de services peu lisibles sur le PDF.',
  },
];

/** Choix schématiques rappelés dans la légende de l'aperçu. */
export const CHOIX_SCHEMATIQUES = [
  'Cloisons 2,40 m, façades et noyau 2,70 m [à confirmer]',
  'Portes 2,04 m, d\'après la légende du PDF',
  'Mobilier aux hauteurs usuelles [à confirmer]',
];
