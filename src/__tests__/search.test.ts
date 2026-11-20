import { describe, expect, it } from 'vitest';
import { configFichier } from '../config';
import { normalize, searchEspaces } from '../lib/search';

const { espaces, categories } = configFichier;
const ids = (query: string) => searchEspaces(espaces, categories, query).map((e) => e.id);

describe('recherche', () => {
  it('ignore accents et majuscules', () => {
    expect(normalize('  Matériauthèque ')).toBe('materiautheque');
    expect(ids('MATERIAUTHEQUE')[0]).toBe('materiautheque');
  });

  it('trouve par catégorie et exige tous les mots', () => {
    expect(ids('sanitaires')).toEqual(expect.arrayContaining(['sanitaires-hommes', 'sanitaires-femmes']));
    expect(ids('sanitaires femmes')[0]).toBe('sanitaires-femmes');
    expect(ids('salles de réunion').length).toBeGreaterThan(0);
  });

  it('renvoie tout pour une requête vide et rien pour une requête inconnue', () => {
    expect(ids('')).toHaveLength(espaces.length);
    expect(ids('zzzz')).toEqual([]);
  });
});

describe('noms des salles', () => {
  it('retrouve une salle par son nom ou par son type', () => {
    expect(ids('ocelle')[0]).toBe('espace-13');
    expect(ids('echo')[0]).toBe('espace-02');
    expect(ids('visio')).toContain('espace-03');
    expect(ids('silence')).toContain('espace-04');
  });
});

describe('conception des espaces', () => {
  it('retrouve un espace par un élément de sa conception', () => {
    expect(ids('pierre plume')).toContain('espace-04');
    expect(ids('réemploi')).toEqual(expect.arrayContaining(['espace-02', 'espace-16']));
  });
});
