import type { Categorie, Espace } from '../types';

/** Minuscules sans accents, pour une recherche tolérante (« reunion » trouve « Réunion »). */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Filtre et trie les espaces selon la requête : le nom compte davantage que
 * la catégorie, la description ou les informations pratiques. Tous les mots
 * saisis doivent être trouvés.
 */
export function searchEspaces(espaces: Espace[], categories: Categorie[], query: string): Espace[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return espaces;

  const libelles = new Map(categories.map((c) => [c.id, normalize(c.libelle)]));
  const scored: { espace: Espace; score: number }[] = [];

  for (const espace of espaces) {
    const nom = normalize(espace.nom);
    const fields = [
      { text: nom, weight: 10 },
      { text: libelles.get(espace.categorie) ?? '', weight: 4 },
      { text: normalize(espace.description ?? ''), weight: 2 },
      { text: normalize((espace.infos ?? []).join(' ')), weight: 1 },
      { text: normalize([espace.concept ?? '', ...(espace.conception ?? []).map((c) => `${c.theme} ${c.texte}`)].join(' ')), weight: 1 },
    ];
    let score = 0;
    let allFound = true;
    for (const word of words) {
      const best = Math.max(...fields.map((f) => (f.text.includes(word) ? f.weight : 0)));
      if (best === 0) {
        allFound = false;
        break;
      }
      score += best;
    }
    if (!allFound) continue;
    if (nom.startsWith(words[0])) score += 5;
    scored.push({ espace, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.espace.nom.localeCompare(b.espace.nom, 'fr'))
    .map((s) => s.espace);
}
