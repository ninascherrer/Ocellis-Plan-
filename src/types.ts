/** Point exprimé dans le repère du plan : [x, y] (origine en haut à gauche). */
export type Point = [number, number];

export const CATEGORIE_IDS = [
  'travail',
  'reunion',
  'collaboratif',
  'convivialite',
  'services',
  'circulations',
] as const;

export type CategorieId = (typeof CATEGORIE_IDS)[number];

export interface Categorie {
  id: CategorieId;
  libelle: string;
  /** Couleur d'accent utilisée pour les filtres, la légende et le surlignage. */
  couleur: string;
}

export interface Espace {
  /** Identifiant unique et stable (utilisé dans les liens partagés). */
  id: string;
  nom: string;
  categorie: CategorieId;
  description?: string;
  /** Informations pratiques, affichées sous forme de liste. */
  infos?: string[];
  /** `true` tant que le nom, la fonction ou la catégorie n'ont pas été validés. */
  aConfirmer?: boolean;
  /** Contour cliquable, dans le repère du plan (pixels de l'image d'origine). */
  contour: Point[];
}

export interface PlanInfo {
  titre: string;
  sousTitre?: string;
  /**
   * Plan d'architecte d'origine (chemin relatif au dossier `public/`), proposé
   * via le bouton « Original ». Le plan affiché par défaut est le dessin
   * vectoriel de src/plan/PlanDessin.tsx.
   */
  image: string;
  /** Largeur du repère des contours (= largeur de l'image d'origine). */
  largeur: number;
  /** Hauteur du repère des contours (= hauteur de l'image d'origine). */
  hauteur: number;
}

export interface PlanConfig {
  $schema?: string;
  plan: PlanInfo;
  categories: Categorie[];
  espaces: Espace[];
}
