import brut from './espaces.json';
import { CATEGORIE_IDS, type CategorieId, type PlanConfig } from '../types';

/**
 * Vérifie la cohérence du fichier de configuration et renvoie la liste des
 * problèmes rencontrés (vide si tout est correct). Les messages sont rédigés
 * pour être compris sans connaître le code.
 */
export function validerConfig(config: PlanConfig): string[] {
  const erreurs: string[] = [];
  const { plan, categories, espaces } = config;

  if (!(plan.largeur > 0) || !(plan.hauteur > 0)) {
    erreurs.push('plan.largeur et plan.hauteur doivent être des nombres positifs.');
  }

  const categoriesConnues = new Set<string>(CATEGORIE_IDS);
  for (const categorie of categories) {
    if (!categoriesConnues.has(categorie.id)) {
      erreurs.push(`Catégorie inconnue « ${categorie.id} ».`);
    }
  }
  const categoriesDeclarees = new Set<CategorieId>(categories.map((c) => c.id));

  const ids = new Set<string>();
  for (const espace of espaces) {
    const ref = `Espace « ${espace.id || espace.nom || '?'} »`;
    if (!espace.id) erreurs.push(`${ref} : identifiant manquant.`);
    else if (ids.has(espace.id)) erreurs.push(`${ref} : identifiant en double.`);
    ids.add(espace.id);

    if (!espace.nom?.trim()) erreurs.push(`${ref} : nom manquant.`);
    if (!categoriesDeclarees.has(espace.categorie)) {
      erreurs.push(`${ref} : catégorie « ${espace.categorie} » absente de la liste des catégories.`);
    }
    if (!Array.isArray(espace.contour) || espace.contour.length < 3) {
      erreurs.push(`${ref} : le contour doit compter au moins 3 sommets.`);
      continue;
    }
    for (const point of espace.contour) {
      const [x, y] = point;
      if (point.length !== 2 || !Number.isFinite(x) || !Number.isFinite(y)) {
        erreurs.push(`${ref} : sommet invalide ${JSON.stringify(point)}.`);
      } else if (x < 0 || y < 0 || x > plan.largeur || y > plan.hauteur) {
        erreurs.push(`${ref} : le sommet [${x}, ${y}] sort du plan.`);
      }
    }
  }
  return erreurs;
}

/** Configuration chargée depuis `espaces.json`. */
export const configFichier = brut as unknown as PlanConfig;

if (import.meta.env.DEV) {
  const erreurs = validerConfig(configFichier);
  if (erreurs.length > 0) {
    console.warn(`[espaces.json] ${erreurs.length} problème(s) détecté(s) :\n- ${erreurs.join('\n- ')}`);
  }
}
