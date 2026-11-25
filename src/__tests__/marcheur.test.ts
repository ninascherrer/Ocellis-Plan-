import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boucleMarcheur } from '../maquette/marcheur';
import type { Scene } from '../maquette/rendu';

const scene = JSON.parse(readFileSync(new URL('../../public/maquette/scene.json', import.meta.url), 'utf8')) as Scene;
const marcheurs = scene.marcheurs ?? [];

/** Distance d'un point au rectangle [x0, y0, x1, y1]. */
const distance = (x: number, y: number, b: number[]) => Math.hypot(Math.max(b[0] - x, 0, x - b[2]), Math.max(b[1] - y, 0, y - b[3]));

// Animation désactivée par défaut (ANIMATIONS = False dans outils/maquette/plateau.py) : ces tests
// s'appliquent dès qu'un personnage animé est présent dans la scène.
describe.skipIf(marcheurs.length === 0)('personnage animé de la maquette', () => {
  it('existe, avec un parcours et une pause par point', () => {
    for (const m of marcheurs) {
      expect(m.chemin.length).toBeGreaterThanOrEqual(2);
      expect(m.pauses.length).toBe(m.chemin.length);
    }
  });

  it('reste au sol, dans les couloirs : à distance des cloisons et du mobilier', () => {
    const obstacles = [
      ...scene.murs.map((w) => w.r as number[]),
      ...scene.objets.filter((o) => o.b[5] > 0.08 && o.b[4] < 1.6).map((o) => o.b as number[]),
    ];
    for (const m of marcheurs) {
      const b = boucleMarcheur(m);
      for (let t = 0; t < b.duree; t += 0.1) {
        const e = b.etat(t);
        const proche = Math.min(...obstacles.map((o) => distance(e.x, e.y, o)));
        expect(proche, `t = ${t.toFixed(1)} s, (${e.x.toFixed(2)}, ${e.y.toFixed(2)})`).toBeGreaterThan(0.25);
      }
    }
  });

  it('boucle lentement : marche, arrêts, disparition puis retour discret au départ', () => {
    for (const m of marcheurs) {
      const b = boucleMarcheur(m);
      expect(b.duree).toBeGreaterThan(15);
      const debut = b.etat(0),
        fin = b.etat(b.duree - 0.01);
      expect(debut.alpha).toBeLessThan(0.05); // apparition en fondu
      expect(fin.alpha).toBe(0); // invisible au moment de revenir au départ
      expect([b.etat(b.duree).x, b.etat(b.duree).y]).toEqual(m.chemin[0]);
      let arrets = 0,
        marche = 0,
        vMax = 0;
      let prec = b.etat(0);
      for (let t = 0.05; t < b.duree; t += 0.05) {
        const e = b.etat(t);
        if (e.alpha === 1 && e.amp === 0) arrets++;
        if (e.amp > 0.9) marche++;
        if (e.alpha > 0 && prec.alpha > 0) vMax = Math.max(vMax, Math.hypot(e.x - prec.x, e.y - prec.y) / 0.05);
        prec = e;
      }
      expect(arrets).toBeGreaterThan(20);
      expect(marche).toBeGreaterThan(100);
      expect(vMax).toBeLessThan(1); // allure tranquille, sans saut (le retour se fait invisible)
    }
  });
});
