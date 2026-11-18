import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { configFichier, validerConfig } from '../config';
import { serializeConfig } from '../lib/exportConfig';
import { CATEGORIE_IDS } from '../types';

describe('espaces.json', () => {
  it('est valide', () => {
    expect(validerConfig(configFichier)).toEqual([]);
  });

  it('déclare les six catégories attendues', () => {
    expect(configFichier.categories.map((c) => c.id)).toEqual([...CATEGORIE_IDS]);
  });

  it("est identique à ce que produit l'export de l'éditeur", () => {
    const fichier = readFileSync(new URL('../config/espaces.json', import.meta.url), 'utf8');
    expect(serializeConfig(configFichier)).toBe(fichier);
  });
});

describe('validerConfig', () => {
  it('signale les identifiants en double, catégories inconnues et sommets hors plan', () => {
    const espace = configFichier.espaces[0];
    const erreurs = validerConfig({
      ...configFichier,
      espaces: [
        espace,
        { ...espace, categorie: 'inconnue' as never },
        { ...espace, id: 'hors-plan', contour: [[0, 0], [9999, 0], [0, 10]] },
      ],
    });
    expect(erreurs.some((e) => e.includes('en double'))).toBe(true);
    expect(erreurs.some((e) => e.includes('« inconnue »'))).toBe(true);
    expect(erreurs.some((e) => e.includes('sort du plan'))).toBe(true);
  });
});
