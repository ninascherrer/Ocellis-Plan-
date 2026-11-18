import { describe, expect, it } from 'vitest';
import { configFichier } from '../config';
import { METRES_PAR_UNITE, MURS, PORTES } from '../plan/structure';
import { POINTS_A_CONFIRMER } from '../plan3d/aConfirmer';

const { largeur, hauteur } = configFichier.plan;
const dansLePlan = ([x, y]: [number, number]) => x >= 0 && y >= 0 && x <= largeur + 5 && y <= hauteur + 5;

describe('structure du plan', () => {
  it('garde murs, portes et points à confirmer dans le repère du plan', () => {
    for (const m of MURS) {
      expect(dansLePlan([m.x, m.y]) && dansLePlan([m.x + m.w, m.y + m.h]), JSON.stringify(m)).toBe(true);
      expect(m.w > 0 && m.h > 0).toBe(true);
    }
    for (const p of PORTES) expect([p.h, p.ferme, p.ouvert].every(dansLePlan)).toBe(true);
    for (const p of POINTS_A_CONFIRMER) expect(dansLePlan(p.position)).toBe(true);
  });

  it("donne des portes d'environ 93 cm, comme la légende du PDF (PP 93/204)", () => {
    for (const p of PORTES) {
      const largeurM = Math.hypot(p.ferme[0] - p.h[0], p.ferme[1] - p.h[1]) * METRES_PAR_UNITE;
      expect(largeurM).toBeGreaterThan(0.7);
      expect(largeurM).toBeLessThan(1.15);
    }
  });

  it("représente les bureaux à l'échelle (environ 20 × 25 m)", () => {
    const largeurM = (500 - 28) * METRES_PAR_UNITE;
    expect(largeurM).toBeGreaterThan(19);
    expect(largeurM).toBeLessThan(21);
  });
});
