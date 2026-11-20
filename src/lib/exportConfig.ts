import type { Espace, PlanConfig } from '../types';
import { roundCoord } from './geometry';

/**
 * Sérialise la configuration au format exact de `src/config/espaces.json`
 * (ordre des champs stable, un sommet par ligne) pour que le fichier exporté
 * depuis l'éditeur puisse remplacer directement l'original.
 */
export function serializeConfig(config: PlanConfig): string {
  const ordered = {
    $schema: config.$schema ?? './espaces.schema.json',
    plan: config.plan,
    categories: config.categories.map(({ id, libelle, couleur }) => ({ id, libelle, couleur })),
    espaces: config.espaces.map(
      (e): Espace => ({
        id: e.id,
        nom: e.nom,
        categorie: e.categorie,
        description: e.description ?? '',
        infos: (e.infos ?? []).filter((info) => info.trim() !== ''),
        ...(e.concept?.trim() ? { concept: e.concept.trim() } : {}),
        ...(e.conception?.some((c) => c.texte.trim())
          ? { conception: e.conception.filter((c) => c.texte.trim()).map(({ theme, texte }) => ({ theme, texte })) }
          : {}),
        aConfirmer: Boolean(e.aConfirmer),
        contour: e.contour.map(([x, y]) => [roundCoord(x), roundCoord(y)]),
      }),
    ),
  };

  return (
    JSON.stringify(ordered, null, 2)
      // Un sommet par ligne : [x, y]
      .replace(/\[\s+(-?\d+(?:\.\d+)?),\s+(-?\d+(?:\.\d+)?)\s+\]/g, '[$1, $2]')
      // Une catégorie par ligne
      .replace(
        /\{\s+"id": "([^"\\]+)",\s+"libelle": "([^"\\]*)",\s+"couleur": "([^"\\]+)"\s+\}/g,
        '{ "id": "$1", "libelle": "$2", "couleur": "$3" }',
      )
      // Une ligne de conception par ligne
      .replace(/\{\s+"theme": "((?:[^"\\]|\\.)*)",\s+"texte": "((?:[^"\\]|\\.)*)"\s+\}/g, '{ "theme": "$1", "texte": "$2" }') + '\n'
  );
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Empreinte courte d'un texte (pour savoir si le fichier a changé depuis un brouillon). */
export function fingerprint(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
