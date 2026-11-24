/**
 * Personnage animé de la maquette : boucle lente le long d'un parcours au sol.
 *
 * Le parcours (en mètres, repère de la maquette) vient de scene.json (outils/maquette/plateau.py).
 * Déroulé d'une boucle : apparition en douceur au point de départ, marche d'un point à l'autre
 * avec un arrêt à chaque point, dernier arrêt tourné vers `regard`, puis disparition en fondu
 * et retour discret au départ.
 */
import type { EtatMarcheur, Marcheur } from './rendu';

/** Vitesse de marche (m/s) : allure tranquille. */
export const VITESSE = 0.75;
/** Longueur d'un cycle complet de pas (deux pas), en mètres. */
const FOULEE = 1.25;
/** Démarrage et arrêt progressifs du balancement (s). */
const ELAN = 0.45;
const FONDU = 1.2;
const ABSENCE = 1.4;

type Etape =
  | { type: 'apparition' | 'disparition' | 'absence'; duree: number }
  | { type: 'arret'; duree: number; point: number }
  | { type: 'marche'; duree: number; seg: number; longueur: number };

const angle = (ax: number, ay: number, bx: number, by: number) => (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
/** Interpolation d'angle (°) par le plus court chemin. */
const melangeAngle = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 360) + 540) % 360) - 180;
  return a + d * t;
};
const doux = (t: number) => t * t * (3 - 2 * t);

export interface Boucle {
  duree: number;
  etat: (t: number) => EtatMarcheur;
}

export function boucleMarcheur(m: Marcheur): Boucle {
  const ch = m.chemin;
  const caps = ch.slice(1).map((b, i) => angle(ch[i][0], ch[i][1], b[0], b[1]));
  const longueurs = ch.slice(1).map((b, i) => Math.hypot(b[0] - ch[i][0], b[1] - ch[i][1]));
  // Distance parcourue au début de chaque segment : la phase du pas suit la distance.
  const cumul = [0];
  for (const l of longueurs) cumul.push(cumul[cumul.length - 1] + l);

  const etapes: Etape[] = [{ type: 'apparition', duree: FONDU }];
  ch.forEach((_, i) => {
    etapes.push({ type: 'arret', duree: m.pauses[i] ?? 0.8, point: i });
    if (i < longueurs.length) etapes.push({ type: 'marche', duree: longueurs[i] / VITESSE, seg: i, longueur: longueurs[i] });
  });
  etapes.push({ type: 'disparition', duree: FONDU }, { type: 'absence', duree: ABSENCE });
  const duree = etapes.reduce((s, e) => s + e.duree, 0);

  const dernier = ch.length - 1;
  const capArret = (i: number) => (i < caps.length ? caps[i] : (m.regard ?? caps[caps.length - 1]));
  const capDernier = capArret(dernier);
  const pose = (x: number, y: number, ang: number, phase: number, amp: number, alpha: number): EtatMarcheur => ({
    x, y, ang, phase, amp, alpha, st: m.st,
  });

  const etat = (tBoucle: number): EtatMarcheur => {
    let t = ((tBoucle % duree) + duree) % duree;
    for (const e of etapes) {
      if (t > e.duree) {
        t -= e.duree;
        continue;
      }
      const u = e.duree ? t / e.duree : 1;
      switch (e.type) {
        case 'apparition':
          return pose(ch[0][0], ch[0][1], caps[0], 0, 0, doux(u));
        case 'absence':
          return pose(ch[0][0], ch[0][1], caps[0], 0, 0, 0);
        case 'disparition':
          return pose(ch[dernier][0], ch[dernier][1], capDernier, 0, 0, 1 - doux(u));
        case 'arret': {
          // À chaque arrêt, il se tourne posément vers la suite du parcours (au dernier, vers la porte).
          const i = e.point;
          const ang = i > 0 ? melangeAngle(caps[i - 1], capArret(i), doux(Math.min(1, u * 1.6))) : capArret(i);
          return pose(ch[i][0], ch[i][1], ang, 0, 0, 1);
        }
        case 'marche': {
          const i = e.seg;
          const d = t * VITESSE;
          const [ax, ay] = ch[i],
            [bx, by] = ch[i + 1];
          const k = Math.min(1, d / e.longueur);
          const ang = caps[i];
          const amp = Math.min(1, t / ELAN, (e.duree - t) / ELAN);
          const phase = ((cumul[i] + d) / FOULEE) * Math.PI * 2;
          return pose(ax + (bx - ax) * k, ay + (by - ay) * k, ang, phase, Math.max(0, amp), 1);
        }
      }
    }
    return pose(ch[0][0], ch[0][1], caps[0], 0, 0, 0);
  };
  return { duree, etat };
}
