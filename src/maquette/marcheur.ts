/**
 * Personnage animé de la maquette : boucle lente le long d'un parcours au sol.
 *
 * Le parcours (en mètres, repère de la maquette) vient de scene.json (outils/maquette/plateau.py).
 * Déroulé d'une boucle : apparition en douceur au point de départ, marche d'un point à l'autre
 * avec un arrêt à chaque point, dernier arrêt tourné vers `regard` (avec l'attitude `poseFin`,
 * par exemple une tasse à la main). S'il a un siège, il s'y assoit et y reste un moment ;
 * puis il s'efface en fondu et revient discrètement au départ.
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
/** Le temps de s'asseoir, puis de rester assis au poste (s). */
const ASSEOIR = 1.0;
const ASSIS = 9;

type Etape =
  | { type: 'apparition' | 'disparition' | 'absence' | 'asseoir' | 'assis'; duree: number }
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
  const sg = m.siege;
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
  if (sg) etapes.push({ type: 'asseoir', duree: ASSEOIR }, { type: 'assis', duree: ASSIS });
  etapes.push({ type: 'disparition', duree: FONDU }, { type: 'absence', duree: ABSENCE });
  const duree = etapes.reduce((s, e) => s + e.duree, 0);

  const dernier = ch.length - 1;
  const capArret = (i: number) => (i < caps.length ? caps[i] : (m.regard ?? caps[caps.length - 1]));
  const capDernier = capArret(dernier);
  const [fx, fy] = sg ? [sg.x, sg.y] : ch[dernier];
  const pose = (x: number, y: number, ang: number, phase: number, amp: number, alpha: number, assis = 0, attitude?: string): EtatMarcheur => ({
    x, y, ang, phase, amp, alpha, assis, st: m.st, siege: sg, pose: attitude,
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
        case 'asseoir': {
          // Il avance jusqu'au fauteuil et s'y installe : la silhouette debout laisse place à la
          // personne assise, en fondu enchaîné.
          const k = doux(u);
          return pose(ch[dernier][0] + (fx - ch[dernier][0]) * k, ch[dernier][1] + (fy - ch[dernier][1]) * k, capDernier, 0, 0, 1 - k, k);
        }
        case 'assis':
          return pose(fx, fy, capDernier, 0, 0, 0, 1);
        case 'disparition':
          return sg ? pose(fx, fy, capDernier, 0, 0, 0, 1 - doux(u)) : pose(fx, fy, capDernier, 0, 0, 1 - doux(u), 0, m.poseFin);
        case 'arret': {
          // À chaque arrêt, il se tourne posément vers la suite du parcours (au dernier, vers `regard`).
          const i = e.point;
          const ang = i > 0 ? melangeAngle(caps[i - 1], capArret(i), doux(Math.min(1, u * 1.6))) : capArret(i);
          // Au dernier arrêt, une fois tournée, elle prend son attitude (tasse à la main…).
          const attitude = i === dernier && !sg && e.duree * u > 0.7 ? m.poseFin : undefined;
          return pose(ch[i][0], ch[i][1], ang, 0, 0, 1, 0, attitude);
        }
        case 'marche': {
          const i = e.seg;
          const d = t * VITESSE;
          const [ax, ay] = ch[i],
            [bx, by] = ch[i + 1];
          const k = Math.min(1, d / e.longueur);
          const amp = Math.min(1, t / ELAN, (e.duree - t) / ELAN);
          const phase = ((cumul[i] + d) / FOULEE) * Math.PI * 2;
          return pose(ax + (bx - ax) * k, ay + (by - ay) * k, caps[i], phase, Math.max(0, amp), 1);
        }
      }
    }
    return pose(ch[0][0], ch[0][1], caps[0], 0, 0, 0);
  };
  return { duree, etat };
}
