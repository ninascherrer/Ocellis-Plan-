/**
 * Points de la maquette illustrée qui ne sont pas documentés sur le plan PDF,
 * ou qui ont été interprétés pour le dessin. Affichés dans la légende de la vue Maquette.
 */
export interface PointAConfirmer {
  titre: string;
  texte: string;
}

export const ARCHITECTURE: PointAConfirmer[] = [
  {
    titre: 'Hauteurs des murs et des cloisons',
    texte:
      'Non cotées sur le plan. Façades à 2,90 m, cloisons à 2,35 m ; selon l’angle de vue, les cloisons qui masquent une pièce sont coupées à 1,00 m et les façades tournées vers vous à 0,40 m.',
  },
  {
    titre: 'Façades vitrées',
    texte:
      'Type de menuiserie et rythme des montants non précisés (montant tous les 1,25 m). Les deux portes-fenêtres de la terrasse, ouvrant vers l’intérieur, suivent le plan.',
  },
  { titre: 'Garde-corps de la terrasse', texte: 'Tracé repris du plan ; hauteur de 1,05 m et remplissage vitré supposés.' },
  { titre: 'Noyau central', texte: 'Ascenseurs, escaliers, gaines et local de brassage représentés de façon simplifiée.' },
  { titre: 'Box A et Box B', texte: 'Usage des deux cellules à portes « P73G » interprété comme alcôves de repos.' },
  { titre: 'Revêtements de sol', texte: 'Moquette, parquet, carrelage, grands carreaux et lames de terrasse : proposition graphique.' },
];

export const AMENAGEMENT: PointAConfirmer[] = [
  {
    titre: 'Végétation',
    texte:
      'Plantes en pot intérieures, olivier et plantes de la terrasse illustratifs. La jardinière et son arbre, et la plante de la banquette nord-est, viennent du plan.',
  },
  {
    titre: 'Écrans et objets',
    texte:
      'Bras d’écran des benchs d’après le plan ; autres écrans, ordinateurs, carnets, tasses, lampes, cadres et bagages illustratifs.',
  },
  {
    titre: 'Pistes d’ambiance',
    texte:
      'Mur végétal de HALO, cabine SPIX noire, tabourets terracotta, fauteuil sauge et lavis terracotta sur le sol de la cafétéria : premières inspirations, à ajuster.',
  },
  { titre: 'Teintes du mobilier', texte: 'Bois clair pour les postes « Récupération », blanc pour les postes neufs ; assises proposées.' },
  { titre: 'Personnages', texte: '37 personnes représentées, en cohérence avec les 35 présentes simultanément sur site.' },
];
