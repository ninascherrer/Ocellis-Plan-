/**
 * Rendu de la maquette axonométrique illustrée, sur un canvas 2D.
 *
 * La scène (scene.json, générée par outils/maquette/export.py) décrit des primitives 3D
 * indépendantes du point de vue. À chaque image : projection orthographique selon
 * l'azimut et l'inclinaison, choix des faces visibles, tri du peintre entre volumes,
 * murs recoupés selon l'angle, puis dessin au trait rehaussé d'aplats.
 *
 * Repère : mètres, X vers l'est, Y vers le sud, Z vers le haut.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Prim = any[];

export interface Mur {
  r: [number, number, number, number];
  k: 'int' | 'ext';
  h: number;
  h2?: number;
  z0: number;
  o?: [number, number];
  g?: number;
}

export interface Objet {
  b: [number, number, number, number, number, number];
  p: Prim[];
  m?: number;
  t?: string;
}

export interface Scene {
  bornes: [number, number, number, number];
  repere: { ox: number; oy: number; kx: number; ky: number };
  hauteurs: { facadeAvant: number; facadeFond: number };
  sol: Prim[];
  ombres: Prim[];
  seuils: Prim[];
  marquages: Prim[];
  murs: Mur[];
  objets: Objet[];
}

/** Point de vue : azimut (direction vers l'observateur, en radians), inclinaison, échelle (px CSS / m), translation (px CSS). */
export interface Camera {
  az: number;
  el: number;
  k: number;
  tx: number;
  ty: number;
}

export interface ZoneRendu {
  id: string;
  /** Contour en mètres. */
  contour: [number, number][];
  nom?: string;
  couleur: string;
  /** Taille du libellé au sol, en mètres ; 0 : pas de libellé. */
  libelle: number;
}

export interface OptionsRendu {
  rapide: boolean;
  zones: ZoneRendu[];
  survolId: string | null;
  choixId: string | null;
  correspondances: Set<string> | null;
  libelles: boolean;
  accent: string;
  papier: string;
}

const INK = '#2b2724';
const S = 40;
const PAPIER = '#f7f2ed';
/** Dessus des murs et cloisons. */
const ARASE = '#5d5a57';

// ------------------------------------------------------------------ couleurs
const cacheTeinte = new Map<string, string>();
function teinte(hex: string, f: number): string {
  if (hex[0] !== '#') return hex;
  const cle = hex + f.toFixed(3);
  const c = cacheTeinte.get(cle);
  if (c) return c;
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  if (f <= 1) {
    r *= f;
    g *= f;
    b *= f;
  } else {
    const t = f - 1;
    r += (255 - r) * t;
    g += (255 - g) * t;
    b += (255 - b) * t;
  }
  const v = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  cacheTeinte.set(cle, v);
  return v;
}
function ombrageFace(col: string, nx: number, ny: number) {
  const l = Math.hypot(nx, ny) || 1;
  nx /= l;
  ny /= l;
  return teinte(col, 0.95 - 0.1 * Math.max(0, nx) + 0.03 * Math.max(0, ny) - 0.03 * Math.max(0, -ny));
}

// ------------------------------------------------------------------ projection
class Proj {
  sa: number;
  ca: number;
  se: number;
  ce: number;
  k: number;
  tx: number;
  ty: number;
  /** Échelle des décalages en pixels (référence 40 px / m). */
  bs: number;
  constructor(cam: Camera) {
    this.sa = Math.sin(cam.az);
    this.ca = Math.cos(cam.az);
    this.se = Math.sin(cam.el);
    this.ce = Math.cos(cam.el);
    this.k = cam.k;
    this.tx = cam.tx;
    this.ty = cam.ty;
    this.bs = cam.k / S;
  }
  x(X: number, Y: number) {
    return (X * this.sa - Y * this.ca) * this.k + this.tx;
  }
  y(X: number, Y: number, Z: number) {
    return ((X * this.ca + Y * this.sa) * this.se - Z * this.ce) * this.k + this.ty;
  }
  prof(X: number, Y: number, Z = 0) {
    return X * this.ca + Y * this.sa + 0.02 * Z;
  }
  /** Point du sol (z) sous un point de l'écran. */
  inverse(sx: number, sy: number, z = 0): [number, number] {
    const a = (sx - this.tx) / this.k;
    const b = ((sy - this.ty) / this.k + z * this.ce) / this.se;
    return [a * this.sa + b * this.ca, -a * this.ca + b * this.sa];
  }
}

export function projeter(cam: Camera, X: number, Y: number, Z = 0): [number, number] {
  const p = new Proj(cam);
  return [p.x(X, Y), p.y(X, Y, Z)];
}

export function solSousEcran(cam: Camera, sx: number, sy: number, z = 0): [number, number] {
  return new Proj(cam).inverse(sx, sy, z);
}

// ------------------------------------------------------------------ outils de dessin
function enveloppe(pts: number[][]): number[][] {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length <= 2) return P;
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: number[][] = [];
  for (const p of P) {
    while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
    lo.push(p);
  }
  const up: number[][] = [];
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
    up.push(p);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

class Peintre {
  ctx: CanvasRenderingContext2D;
  p: Proj;
  dx: number;
  dy: number;
  rapide: boolean;
  hachure: CanvasPattern | null;
  /** Textures de matière (null en rendu rapide) et matière du volume en cours de dessin. */
  textures: Textures | null;
  matiere: Matiere | null = null;
  constructor(ctx: CanvasRenderingContext2D, p: Proj, rapide: boolean, hachure: CanvasPattern | null, textures: Textures | null = null) {
    this.ctx = ctx;
    this.p = p;
    this.dx = p.ca;
    this.dy = p.sa;
    this.rapide = rapide;
    this.hachure = hachure;
    this.textures = rapide ? null : textures;
  }

  /** Dessine `f` avec la texture de la matière de `col` (bois, tissu…) posée sur les aplats. */
  avecMatiere(col: unknown, f: () => void) {
    const avant = this.matiere;
    this.matiere = this.textures ? matiereDe(col) : null;
    f();
    this.matiere = avant;
  }

  remplir(fill: string | 0 | null, op = 1) {
    if (!fill || fill === 'none') return;
    const c = this.ctx;
    if (fill === 'hatch') {
      c.fillStyle = PAPIER;
      c.fill();
      if (this.hachure) {
        c.fillStyle = this.hachure;
        c.fill();
      }
      return;
    }
    c.fillStyle = fill;
    if (op !== 1) {
      c.globalAlpha = op;
      c.fill();
      c.globalAlpha = 1;
    } else c.fill();
    if (this.matiere && this.textures && op === 1) {
      c.fillStyle = this.textures[this.matiere];
      c.fill();
    }
  }

  tracer(stroke: string | null, sw: number, sop = 1, dash?: number[]) {
    if (!stroke || stroke === 'none' || !sw) return;
    const c = this.ctx;
    c.strokeStyle = stroke;
    c.lineWidth = sw * this.p.bs;
    if (dash) c.setLineDash(dash.map((d) => d * this.p.bs));
    if (sop !== 1) c.globalAlpha = sop;
    c.stroke();
    if (sop !== 1) c.globalAlpha = 1;
    if (dash) c.setLineDash([]);
  }

  chemin3(a: number[], ferme: boolean) {
    const c = this.ctx,
      p = this.p;
    c.beginPath();
    c.moveTo(p.x(a[0], a[1]), p.y(a[0], a[1], a[2]));
    for (let i = 3; i < a.length; i += 3) c.lineTo(p.x(a[i], a[i + 1]), p.y(a[i], a[i + 1], a[i + 2]));
    if (ferme) c.closePath();
  }

  poly2(pts: number[][], fill: string | 0, stroke: string | null, sw: number, op = 1) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath();
    this.remplir(fill, op);
    this.tracer(stroke, sw);
  }

  visible(n?: [number, number]) {
    return !n || n[0] * this.dx + n[1] * this.dy > 0.001;
  }

  quad(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, fill: string, stroke: string, sw: number) {
    const p = this.p,
      c = this.ctx;
    c.beginPath();
    c.moveTo(p.x(x0, y0), p.y(x0, y0, z0));
    c.lineTo(p.x(x1, y1), p.y(x1, y1, z0));
    c.lineTo(p.x(x1, y1), p.y(x1, y1, z1));
    c.lineTo(p.x(x0, y0), p.y(x0, y0, z1));
    c.closePath();
    this.remplir(fill);
    this.tracer(stroke, sw);
  }

  boite(
    x0: number, y0: number, x1: number, y1: number, z0: number, z1: number,
    col: string, sw: number, top: string | 0 = 0, stroke = INK, couleurs?: { e: string; s: string; w: string; n: string },
  ) {
    const { dx, dy } = this;
    const fs = couleurs ?? { e: teinte(col, 0.86), s: teinte(col, 0.94), w: teinte(col, 0.97), n: teinte(col, 0.9) };
    // faces latérales visibles (au plus deux)
    if (dy > 0.001) this.quad(x0, y1, x1, y1, z0, z1, fs.s, stroke, sw);
    if (dy < -0.001) this.quad(x1, y0, x0, y0, z0, z1, fs.n, stroke, sw);
    if (dx > 0.001) this.quad(x1, y1, x1, y0, z0, z1, fs.e, stroke, sw);
    if (dx < -0.001) this.quad(x0, y0, x0, y1, z0, z1, fs.w, stroke, sw);
    const p = this.p,
      c = this.ctx;
    c.beginPath();
    c.moveTo(p.x(x0, y0), p.y(x0, y0, z1));
    c.lineTo(p.x(x1, y0), p.y(x1, y0, z1));
    c.lineTo(p.x(x1, y1), p.y(x1, y1, z1));
    c.lineTo(p.x(x0, y1), p.y(x0, y1, z1));
    c.closePath();
    this.remplir(top || col);
    this.tracer(stroke, sw);
  }

  prisme(pts: number[], z0: number, z1: number, col: string, sw: number, lisse: number, top: string | 0, face: any, stroke: string) {
    const p = this.p,
      c = this.ctx;
    const n = pts.length / 2;
    if (lisse) {
      const P: number[][] = [];
      for (let i = 0; i < n; i++) {
        const X = pts[2 * i],
          Y = pts[2 * i + 1];
        P.push([p.x(X, Y), p.y(X, Y, z0)], [p.x(X, Y), p.y(X, Y, z1)]);
      }
      this.poly2(enveloppe(P), ombrageFace(col, 0.3, 1), stroke, sw);
    } else {
      let aire = 0;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        aire += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1];
      }
      const faces: [number, number, number][] = [];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const ax = pts[2 * i], ay = pts[2 * i + 1], bx = pts[2 * j], by = pts[2 * j + 1];
        const ex = bx - ax, ey = by - ay;
        const nx = aire > 0 ? ey : -ey,
          ny = aire > 0 ? -ex : ex;
        if (nx * this.dx + ny * this.dy <= 1e-9) continue;
        faces.push([p.prof((ax + bx) / 2, (ay + by) / 2), i, j]);
      }
      faces.sort((a, b) => a[0] - b[0]);
      for (const [, i, j] of faces) {
        const ax = pts[2 * i], ay = pts[2 * i + 1], bx = pts[2 * j], by = pts[2 * j + 1];
        const ex = bx - ax, ey = by - ay;
        let nx = aire > 0 ? ey : -ey,
          ny = aire > 0 ? -ex : ex;
        const l = Math.hypot(nx, ny) || 1;
        nx /= l;
        ny /= l;
        let fill = ombrageFace(col, nx, ny);
        if (face && nx * face[0] + ny * face[1] > 0.5) fill = face[2];
        this.quad(ax, ay, bx, by, z0, z1, fill, stroke, sw);
      }
    }
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const X = pts[2 * i],
        Y = pts[2 * i + 1];
      if (i === 0) c.moveTo(p.x(X, Y), p.y(X, Y, z1));
      else c.lineTo(p.x(X, Y), p.y(X, Y, z1));
    }
    c.closePath();
    this.remplir(top || col);
    this.tracer(stroke, sw);
  }

  feuille(ax: number, ay: number, bx: number, by: number, w: number, fill: string, sw: number, op = 1) {
    const c = this.ctx;
    const mx = (ax + bx) / 2,
      my = (ay + by) / 2;
    const ddx = bx - ax,
      ddy = by - ay;
    const L = Math.hypot(ddx, ddy) || 1;
    const nx = (-ddy / L) * w,
      ny = (ddx / L) * w;
    c.beginPath();
    c.moveTo(ax, ay);
    c.quadraticCurveTo(mx + nx, my + ny, bx, by);
    c.quadraticCurveTo(mx - nx, my - ny, ax, ay);
    c.closePath();
    this.remplir(fill, op);
    this.tracer(INK, sw);
  }

  dessiner(prims: Prim[]) {
    for (const q of prims) this.un(q);
  }

  un(q: Prim) {
    const c = this.ctx,
      p = this.p,
      bs = p.bs;
    switch (q[0]) {
      case 'P': {
        const o = q[5];
        if (o) {
          if (o.det && this.rapide) return;
          if (o.n && !this.visible(o.n)) return;
        }
        this.chemin3(q[1], true);
        let fill = q[2];
        if (o?.nf && o.nf[0] * this.dx + o.nf[1] * this.dy <= 0) fill = o.nf[2];
        this.remplir(fill, o?.op ?? 1);
        this.tracer(q[3], q[4], o?.sop ?? 1, o?.dash);
        return;
      }
      case 'L':
      case 'S': {
        const o = q[4];
        if (o) {
          if (o.det && this.rapide) return;
          if (o.n && !this.visible(o.n)) return;
        }
        const a: number[] = q[1];
        if (q[0] === 'L') this.chemin3(a, false);
        else {
          c.beginPath();
          for (let i = 0; i < a.length; i += 6) {
            c.moveTo(p.x(a[i], a[i + 1]), p.y(a[i], a[i + 1], a[i + 2]));
            c.lineTo(p.x(a[i + 3], a[i + 4]), p.y(a[i + 3], a[i + 4], a[i + 5]));
          }
        }
        this.tracer(q[2], q[3], o?.sop ?? 1, o?.dash);
        return;
      }
      case 'H': {
        const a: number[] = q[1];
        const P: number[][] = [];
        for (let i = 0; i < a.length; i += 3) P.push([p.x(a[i], a[i + 1]), p.y(a[i], a[i + 1], a[i + 2])]);
        this.poly2(enveloppe(P), q[2], q[3], q[4]);
        return;
      }
      case 'B':
        this.avecMatiere(q[7], () => this.boite(q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8], q[9] || 0, q[10] || INK));
        return;
      case 'R':
        this.avecMatiere(q[4], () => this.prisme(q[1], q[2], q[3], q[4], q[5], q[6], q[7] || 0, q[8] || 0, q[9] || INK));
        return;
      case 'C': {
        const o = q[9];
        if (o?.n && !this.visible(o.n)) return;
        const sx = p.x(q[1], q[2]) + (o?.dx ?? 0) * bs,
          sy = p.y(q[1], q[2], q[3]) + (o?.dy ?? 0) * bs;
        c.beginPath();
        c.ellipse(sx, sy, q[4] * bs, q[5] * bs, 0, 0, Math.PI * 2);
        this.remplir(q[6], o?.op ?? 1);
        this.tracer(q[7], q[8]);
        return;
      }
      case 'F': {
        const o = q[11];
        if (o) {
          if (o.det && this.rapide) return;
          if (o.n && !this.visible(o.n)) return;
        }
        const sx = p.x(q[1], q[2]),
          sy = p.y(q[1], q[2], q[3]);
        this.feuille(sx + q[4] * bs, sy + q[5] * bs, sx + q[6] * bs, sy + q[7] * bs, q[8] * bs, q[9], q[10], o?.op ?? 1);
        return;
      }
      case 'K': {
        const sx = p.x(q[1], q[2]),
          sy = p.y(q[1], q[2], q[3]);
        const off: number[] = q[4];
        c.beginPath();
        c.moveTo(sx + off[0] * bs, sy + off[1] * bs);
        for (let i = 2; i < off.length; i += 2) c.lineTo(sx + off[i] * bs, sy + off[i + 1] * bs);
        if (q[8]) {
          c.closePath();
          this.remplir(q[5]);
        }
        this.tracer(q[6], q[7]);
        return;
      }
      case 'Q': {
        const sx = p.x(q[1], q[2]),
          sy = p.y(q[1], q[2], q[3]);
        c.beginPath();
        c.moveTo(sx, sy);
        c.quadraticCurveTo(sx + q[4] * bs, sy + q[5] * bs, sx + q[6] * bs, sy + q[7] * bs);
        c.lineCap = 'round';
        this.tracer(q[8], q[9]);
        return;
      }
      case 'G':
        this.groupes([q]);
        return;
      case 'M':
        personnage(this, q);
        return;
    }
  }

  /** Dessine une suite de primitives en triant les sous-groupes selon la profondeur. */
  groupes(prims: Prim[]) {
    const g = prims.filter((q) => q[0] === 'G');
    if (g.length === 0) return this.dessiner(prims);
    const autres = prims.filter((q) => q[0] !== 'G');
    this.dessiner(autres);
    const p = this.p;
    g.sort((a, b) => p.prof(a[1][0], a[1][1], a[1][2]) + (a[3] ?? 0) - (p.prof(b[1][0], b[1][1], b[1][2]) + (b[3] ?? 0)));
    for (const q of g) this.groupes(q[2]);
  }
}

// ------------------------------------------------------------------ personnages
function personnage(pt: Peintre, q: Prim) {
  const [, cx, cy, ang, pose, seat, lean, st] = q as [string, number, number, number, string, number, number, any[]];
  const [skin, hairCol, top, pants, hs, skirt, shoes] = st;
  const p = pt.p,
    c = pt.ctx,
    bs = p.bs;
  const fa = (ang * Math.PI) / 180;
  const f = [Math.cos(fa), Math.sin(fa)];
  const l = [-f[1], f[0]];
  const J = (df: number, dl: number, z: number) => [cx + f[0] * df + l[0] * dl, cy + f[1] * df + l[1] * dl, z];
  const seated = pose.startsWith('sit');
  let hipL: number[], hipR: number[], kneeL: number[], kneeR: number[], footL: number[], footR: number[], shL: number[], shR: number[];
  let neck: number[], head: number[], chest: number[], pelvis: number[], elL: number[], elR: number[], haL: number[], haR: number[];
  if (seated) {
    const h = seat;
    const back = -0.06 - lean;
    hipL = J(-0.03, 0.095, h + 0.07);
    hipR = J(-0.03, -0.095, h + 0.07);
    kneeL = J(0.4, 0.11, h + 0.09);
    kneeR = J(0.4, -0.11, h + 0.09);
    footL = J(0.46, 0.12, 0.05);
    footR = J(0.46, -0.12, 0.05);
    shL = J(back, 0.18, h + 0.53);
    shR = J(back, -0.18, h + 0.53);
    neck = J(back + 0.01, 0, h + 0.6);
    head = J(back + 0.03, 0, h + 0.72);
    chest = J(back, 0, h + 0.45);
    pelvis = J(-0.02, 0, h + 0.1);
    if (pose === 'sit_type') {
      elL = J(0.12, 0.23, h + 0.27); elR = J(0.12, -0.23, h + 0.27);
      haL = J(0.4, 0.11, 0.78); haR = J(0.4, -0.11, 0.78);
    } else if (pose === 'sit_talk') {
      elL = J(0.08, 0.24, h + 0.27); elR = J(0.12, -0.24, h + 0.3);
      haL = J(0.32, 0.12, 0.78); haR = J(0.3, -0.26, h + 0.48);
    } else if (pose === 'sit_phone') {
      elL = J(0.05, 0.25, h + 0.28); elR = J(0.06, -0.22, h + 0.3);
      haL = J(0.3, 0.1, h + 0.25); haR = J(back + 0.06, -0.12, h + 0.68);
    } else if (pose === 'sit_cup') {
      elL = J(0.06, 0.24, h + 0.25); elR = J(0.12, -0.22, h + 0.28);
      haL = J(0.3, 0.1, h + 0.18); haR = J(0.24, -0.08, h + 0.42);
    } else {
      elL = J(0.02, 0.25, h + 0.25); elR = J(0.02, -0.25, h + 0.25);
      haL = J(0.27, 0.13, h + 0.16); haR = J(0.27, -0.13, h + 0.16);
    }
  } else {
    const hz = 0.93;
    if (pose === 'walk') {
      footL = J(0.27, 0.09, 0.05); footR = J(-0.24, -0.09, 0.09);
      kneeL = J(0.15, 0.09, 0.5); kneeR = J(-0.08, -0.09, 0.49);
    } else {
      footL = J(0.05, 0.11, 0.04); footR = J(0.03, -0.11, 0.04);
      kneeL = J(0.02, 0.1, 0.5); kneeR = J(0, -0.1, 0.5);
    }
    hipL = J(0, 0.09, hz); hipR = J(0, -0.09, hz);
    shL = J(0, 0.185, 1.4); shR = J(0, -0.185, 1.4);
    neck = J(0.01, 0, 1.48); head = J(0.02, 0, 1.6);
    chest = J(0, 0, 1.3); pelvis = J(0, 0, 0.95);
    if (pose === 'walk') {
      elL = J(-0.12, 0.22, 1.1); elR = J(0.12, -0.22, 1.1);
      haL = J(-0.22, 0.22, 0.84); haR = J(0.24, -0.2, 0.86);
    } else if (pose === 'cup') {
      elL = J(0, 0.23, 1.1); elR = J(0.1, -0.22, 1.09);
      haL = J(0.03, 0.22, 0.82); haR = J(0.27, -0.12, 1.12);
    } else if (pose === 'talk') {
      elL = J(0, 0.23, 1.1); elR = J(0.14, -0.24, 1.12);
      haL = J(0.02, 0.22, 0.82); haR = J(0.32, -0.2, 1.26);
    } else if (pose === 'tablet') {
      elL = J(0.1, 0.22, 1.1); elR = J(0.1, -0.22, 1.1);
      haL = J(0.3, 0.1, 1.12); haR = J(0.3, -0.1, 1.12);
    } else {
      elL = J(0, 0.23, 1.1); elR = J(0, -0.23, 1.1);
      haL = J(0.03, 0.22, 0.82); haR = J(0.03, -0.22, 0.82);
    }
  }
  const P = (a: number[]) => [p.x(a[0], a[1]), p.y(a[0], a[1], a[2])];
  const dep = (...ps: number[][]) => ps.reduce((s, a) => s + p.prof(a[0], a[1]), 0) / ps.length;
  const items: [number, () => void][] = [];
  const membre = (a: number[], b: number[], cc: number[], w: number, col: string, key: number) => {
    items.push([
      key,
      () => {
        const A = P(a), B = P(b), C = P(cc);
        c.beginPath();
        c.moveTo(A[0], A[1]);
        c.lineTo(B[0], B[1]);
        c.lineTo(C[0], C[1]);
        c.lineCap = 'round';
        c.lineJoin = 'round';
        c.strokeStyle = INK;
        c.lineWidth = (w * S + 1.1) * bs;
        c.stroke();
        c.strokeStyle = col;
        c.lineWidth = w * S * bs;
        c.stroke();
      },
    ]);
  };
  const disque = (q3: number[], rx: number, ry: number, fill: string, key: number, sw = 0.4) => {
    items.push([
      key,
      () => {
        const A = P(q3);
        c.beginPath();
        c.ellipse(A[0], A[1], rx * bs, ry * bs, 0, 0, Math.PI * 2);
        pt.remplir(fill);
        pt.tracer(INK, sw);
      },
    ]);
  };
  const jupe = !!skirt && !seated;
  for (const [hip, knee, foot] of [[hipL, kneeL, footL], [hipR, kneeR, footR]]) {
    membre(hip, knee, foot, jupe ? 0.075 : 0.115, jupe ? skin : pants, dep(hip, knee, foot) - (seated ? 0 : 0.02));
    disque(foot, 0.065 * S, 0.04 * S, shoes, dep(foot) - 0.01);
  }
  const off = 0.085;
  const tp: number[][] = [];
  for (const q3 of [shL, shR]) {
    for (const s of [-1, 1]) {
      tp.push(P([q3[0] + f[0] * off * s, q3[1] + f[1] * off * s, q3[2]]));
      tp.push(P([q3[0] + f[0] * off * s * 0.8, q3[1] + f[1] * off * s * 0.8, q3[2] + 0.05]));
    }
  }
  for (const q3 of [hipL, hipR]) {
    const sgn = q3 === hipL ? 0.03 : -0.03;
    const qq = [q3[0] + l[0] * sgn, q3[1] + l[1] * sgn, q3[2] - 0.02];
    for (const s of [-1, 1]) tp.push(P([qq[0] + f[0] * off * s, qq[1] + f[1] * off * s, qq[2]]));
  }
  if (jupe) for (const q3 of [J(0, 0.2, 0.55), J(0, -0.2, 0.55), J(0.1, 0, 0.55), J(-0.1, 0, 0.55)]) tp.push(P(q3));
  items.push([
    dep(chest, pelvis),
    () => {
      pt.poly2(enveloppe(tp), top, INK, 0.5);
      if (jupe) {
        const sk = [J(0, 0.12, 0.92), J(0, -0.12, 0.92), J(0, 0.2, 0.55), J(0, -0.2, 0.55), J(0.1, 0, 0.55), J(-0.1, 0, 0.55)].map(P);
        pt.poly2(enveloppe(sk), pants, INK, 0.5);
      }
    },
  ]);
  for (const [sh, el, ha] of [[shL, elL, haL], [shR, elR, haR]]) {
    const k = dep(sh, el, ha) + 0.01;
    membre(sh, el, ha, 0.078, top, k);
    disque(ha, 0.04 * S, 0.04 * S, skin, k + 0.001);
  }
  if (pose === 'cup' || pose === 'sit_cup') {
    items.push([
      dep(haR) + 0.05,
      () => {
        const H = P(haR);
        c.beginPath();
        c.rect(H[0] - 1.6 * bs, H[1] - 3.8 * bs, 3.2 * bs, 3.6 * bs);
        pt.remplir('#f7f4ee');
        pt.tracer(INK, 0.45);
      },
    ]);
  }
  if (pose === 'tablet') {
    items.push([
      dep(haR) + 0.05,
      () => pt.poly2([J(0.3, 0.13, 1.13), J(0.3, -0.13, 1.13), J(0.42, -0.13, 1.2), J(0.42, 0.13, 1.2)].map(P), '#4b5557', INK, 0.4),
    ]);
  }
  // Orientation de la tête vue de la caméra : 1 = de face, −1 = de dos ; fsx = côté du visage à l'écran.
  const vers = f[0] * p.ca + f[1] * p.sa;
  let fsx = f[0] * p.sa - f[1] * p.ca,
    fsy = (f[0] * p.ca + f[1] * p.sa) * p.se;
  const fl = Math.hypot(fsx, fsy) || 1;
  fsx /= fl;
  fsy /= fl;
  const N = P(neck),
    Hd = P(head);
  const r = 0.1 * S * bs;
  const hx = Hd[0],
    hy = Hd[1];

  // Cheveux longs : volume qui tombe derrière la tête jusqu'aux épaules.
  // De face, il passe derrière le torse (visible de part et d'autre du cou) ;
  // de dos, il recouvre le haut du dos.
  if (hs === 'long') {
    const dos = vers < -0.2;
    items.push([
      dep(chest) + (dos ? 0.05 : -0.05),
      () => {
        const lg = r * 1.12,
          bas = hy + r * (dos ? 2.5 : 2.2);
        c.beginPath();
        c.moveTo(hx - lg, hy - r * 0.2);
        c.quadraticCurveTo(hx - lg * 1.08, bas - r * 0.4, hx - lg * 0.78, bas);
        c.quadraticCurveTo(hx, bas + r * 0.25, hx + lg * 0.78, bas);
        c.quadraticCurveTo(hx + lg * 1.08, bas - r * 0.4, hx + lg, hy - r * 0.2);
        c.arc(hx, hy - r * 0.2, lg, 0, Math.PI, true);
        c.closePath();
        pt.remplir(hairCol);
        pt.tracer(INK, 0.45);
      },
    ]);
  }

  items.sort((a, b) => a[0] - b[0]);
  for (const [, fn] of items) fn();

  // Cou
  c.beginPath();
  c.moveTo(N[0], N[1]);
  c.lineTo(hx, hy + 2 * bs);
  c.lineCap = 'round';
  c.strokeStyle = INK;
  c.lineWidth = (0.06 * S + 1) * bs;
  c.stroke();
  c.strokeStyle = skin;
  c.lineWidth = 0.06 * S * bs;
  c.stroke();

  // Tête
  c.beginPath();
  c.arc(hx, hy, r, 0, Math.PI * 2);
  pt.remplir(skin);
  pt.tracer(INK, 0.5);

  const melange = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
  // Chevelure (angles en degrés, repère écran : 270° = haut, 90° = bas)
  const pointArc = (deg: number, rr = r * 1.04): number[] => {
    const t = (deg * Math.PI) / 180;
    return [hx + rr * Math.cos(t), hy + rr * Math.sin(t)];
  };
  const cap: number[][] = [];
  if (vers < -0.35) {
    // De dos : la chevelure couvre toute la tête, seule la nuque reste visible.
    const nuque = hs === 'crop' ? 34 : hs === 'long' ? 0 : 26;
    for (let k = 0; k <= 24; k++) cap.push(pointArc(90 + nuque + ((360 - 2 * nuque) * k) / 24));
  } else {
    // De face ou de profil : calotte plus descendue à l'arrière du crâne,
    // ligne frontale qui dégage le visage côté regard.
    const profil = Math.min(1, Math.abs(fsx) * (1.25 - Math.max(0, vers) * 0.5));
    const court = hs === 'crop' ? 14 : 0;
    let a0 = 196 + court,
      a1 = 344 - court;
    const arriere = 58 * profil;
    if (fsx > 0) a0 -= arriere;
    else a1 += arriere;
    for (let k = 0; k <= 16; k++) cap.push(pointArc(a0 + ((a1 - a0) * k) / 16));
    // Ligne frontale, parcourue de droite à gauche (l'arc se termine à droite) :
    // plus haute côté visage (front dégagé), plus basse côté nuque.
    const haut = hs === 'crop' ? 0.6 : 0.46,
      bas = hs === 'crop' ? 0.35 : 0.12;
    const cote = fsx * profil; // > 0 : visage à droite de l'écran
    const hD = melange(haut, bas, 0.5 - cote / 2),
      hG = melange(haut, bas, 0.5 + cote / 2);
    cap.push([hx + r * 0.62, hy - r * hD], [hx, hy - r * ((hD + hG) / 2 + 0.08)], [hx - r * 0.62, hy - r * hG]);
  }
  pt.poly2(cap, hairCol, INK, 0.45);
  if (hs === 'bun') {
    c.beginPath();
    c.arc(hx - fsx * r * 0.55, hy - r * 0.95, r * 0.42, 0, Math.PI * 2);
    pt.remplir(hairCol);
    pt.tracer(INK, 0.45);
  }
}

// ------------------------------------------------------------------ scène préparée
interface Volume {
  b: number[];
  m: number;
  dessin: (pt: Peintre) => void;
  mur?: Mur;
  /** Objet fixé à un mur (écran TV) : masqué quand ce mur est abaissé sous son sommet. */
  support?: Volume;
  /** Boîte écran, recalculée à chaque image. */
  e: number[];
  prof: number;
}

export interface Preparee {
  scene: Scene;
  elements: Volume[];
  murs: Volume[];
}

export function preparer(scene: Scene): Preparee {
  const elements: Volume[] = scene.objets.map((o) => ({
    b: o.b.slice(),
    m: o.m ?? 0,
    dessin: (pt: Peintre) => pt.groupes(o.p),
    e: [0, 0, 0, 0],
    prof: 0,
  }));
  const murs: Volume[] = scene.murs.map((w) => ({
    b: [w.r[0], w.r[1], w.r[2], w.r[3], w.z0, w.h],
    m: 0,
    mur: w,
    dessin: () => {},
    e: [0, 0, 0, 0],
    prof: 0,
  }));
  // Un écran mural est rattaché au mur qu'il touche.
  scene.objets.forEach((o, i) => {
    if (o.t !== 'ecran') return;
    const [x0, y0, x1, y1] = o.b,
      eps = 0.08;
    elements[i].support = murs.find(
      (w) => w.b[0] - eps < x1 && w.b[2] + eps > x0 && w.b[1] - eps < y1 && w.b[3] + eps > y0,
    );
  });
  return { scene, elements, murs };
}

const COUL_MUR = { e: teinte('#f3ede7', 0.94), s: '#f3ede7', w: teinte('#f3ede7', 1.0), n: teinte('#f3ede7', 0.97) };

/** Le mur se trouve-t-il entre la caméra et l'espace sélectionné ? Il est alors dessiné en transparence, sans être coupé. */
function masque(w: Mur, p: Proj, coupe: number[] | null): boolean {
  if (!coupe || w.k !== 'int') return false;
  const [x0, y0, x1, y1] = w.r;
  const bande =
    x1 - x0 >= y1 - y0
      ? p.sa >= 0
        ? [x0, y0 - 1.6, x1, y0]
        : [x0, y1, x1, y1 + 1.6]
      : p.ca >= 0
        ? [x0 - 1.6, y0, x0, y1]
        : [x1, y0, x1 + 1.6, y1];
  return bande[0] < coupe[2] && bande[2] > coupe[0] && bande[1] < coupe[3] && bande[3] > coupe[1];
}

function hauteurMur(w: Mur, p: Proj, sc: Scene): number {
  if (w.k === 'ext') {
    const o = w.o ?? [0, 0];
    return o[0] * p.ca + o[1] * p.sa > 0.02 ? sc.hauteurs.facadeAvant : w.h;
  }
  const [x0, y0, x1, y1] = w.r;
  const fond = x1 - x0 >= y1 - y0 ? p.sa >= 0 : p.ca >= 0;
  return fond ? w.h : (w.h2 ?? w.h);
}

/** Épaisseur dessinée des murs fins : réduite autour de l'axe pour un trait plus léger. */
const EPAISSEUR_DESSIN = { facteur: 0.5, min: 0.05 };

function dessinerMur(pt: Peintre, w: Mur, h: number, sc: Scene) {
  let [x0, y0, x1, y1] = w.r;
  const epais = Math.min(x1 - x0, y1 - y0) > 0.32;
  if (!epais) {
    // Murs et cloisons fins : même axe, épaisseur dessinée divisée par deux.
    if (x1 - x0 < y1 - y0) {
      const c = (x0 + x1) / 2,
        e = Math.max(EPAISSEUR_DESSIN.min, (x1 - x0) * EPAISSEUR_DESSIN.facteur) / 2;
      x0 = c - e;
      x1 = c + e;
    } else {
      const c = (y0 + y1) / 2,
        e = Math.max(EPAISSEUR_DESSIN.min, (y1 - y0) * EPAISSEUR_DESSIN.facteur) / 2;
      y0 = c - e;
      y1 = c + e;
    }
  }
  // Arase des murs : aplat gris anthracite (moins lourd que le noir), traits fins.
  const topCol = epais ? 'hatch' : ARASE;
  const sw = w.k === 'int' ? 0.45 : 0.65;
  if (w.k === 'ext' && w.g) {
    // façade vitrée : allège, vitrage à montants fins, linteau si elle est au fond
    const avant = h <= sc.hauteurs.facadeAvant + 0.01;
    const zv = avant ? h : 2.62;
    pt.boite(x0, y0, x1, y1, 0, 0.12, '#f3ede7', sw, topCol, INK, COUL_MUR);
    const horiz = x1 - x0 >= y1 - y0;
    const A = horiz ? [x0, (y0 + y1) / 2] : [(x0 + x1) / 2, y0];
    const B = horiz ? [x1, (y0 + y1) / 2] : [(x0 + x1) / 2, y1];
    pt.quad(A[0], A[1], B[0], B[1], 0.12, zv, 'rgba(190,200,201,0.18)', 'none', 0);
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const n = Math.max(1, Math.round(L / 1.25));
    const c = pt.ctx,
      p = pt.p;
    c.beginPath();
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const X = A[0] + (B[0] - A[0]) * t,
        Y = A[1] + (B[1] - A[1]) * t;
      c.moveTo(p.x(X, Y), p.y(X, Y, 0.12));
      c.lineTo(p.x(X, Y), p.y(X, Y, zv));
    }
    pt.tracer(INK, 0.75);
    if (avant) {
      c.beginPath();
      c.moveTo(p.x(A[0], A[1]), p.y(A[0], A[1], zv));
      c.lineTo(p.x(B[0], B[1]), p.y(B[0], B[1], zv));
      pt.tracer(ARASE, 1);
    } else {
      pt.boite(x0, y0, x1, y1, 2.62, w.h, '#f3ede7', sw, topCol, INK, COUL_MUR);
    }
    return;
  }
  pt.boite(x0, y0, x1, y1, w.z0, h, '#f3ede7', sw, topCol, INK, COUL_MUR);
}

function bboxEcran(p: Proj, b: number[], m: number, out: number[]) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const X of [b[0], b[2]])
    for (const Y of [b[1], b[3]])
      for (const Z of [b[4], b[5]]) {
        const sx = p.x(X, Y),
          sy = p.y(X, Y, Z);
        if (sx < x0) x0 = sx;
        if (sx > x1) x1 = sx;
        if (sy < y0) y0 = sy;
        if (sy > y1) y1 = sy;
      }
  const mm = m * p.bs;
  out[0] = x0 - mm;
  out[1] = y0 - mm * 1.2;
  out[2] = x1 + mm;
  out[3] = y1 + 2;
}

/** a doit-il être dessiné avant b ? */
function derriere(a: Volume, b: Volume, dx: number, dy: number) {
  const A = a.b,
    B = b.b,
    eps = 0.005;
  if (dx > 0.01) {
    if (A[2] <= B[0] + eps) return true;
    if (B[2] <= A[0] + eps) return false;
  } else if (dx < -0.01) {
    if (A[0] >= B[2] - eps) return true;
    if (B[0] >= A[2] - eps) return false;
  }
  if (dy > 0.01) {
    if (A[3] <= B[1] + eps) return true;
    if (B[3] <= A[1] + eps) return false;
  } else if (dy < -0.01) {
    if (A[1] >= B[3] - eps) return true;
    if (B[1] >= A[3] - eps) return false;
  }
  if (A[5] <= B[4] + eps) return true;
  if (B[5] <= A[4] + eps) return false;
  return a.prof < b.prof;
}

function trier(els: Volume[], dx: number, dy: number): Volume[] {
  const n = els.length;
  const ordre = els.map((_, i) => i).sort((i, j) => els[i].e[0] - els[j].e[0]);
  const succ: number[][] = Array.from({ length: n }, () => []);
  const deg = new Array(n).fill(0);
  for (let ii = 0; ii < n; ii++) {
    const i = ordre[ii];
    const a = els[i];
    for (let jj = ii + 1; jj < n; jj++) {
      const j = ordre[jj];
      const b = els[j];
      if (b.e[0] > a.e[2]) break;
      if (b.e[1] > a.e[3] || a.e[1] > b.e[3]) continue;
      if (derriere(a, b, dx, dy)) {
        succ[i].push(j);
        deg[j]++;
      } else {
        succ[j].push(i);
        deg[i]++;
      }
    }
  }
  // Kahn, avec priorité à la profondeur (tas binaire)
  const tas: number[] = [];
  const cle = (i: number) => els[i].prof;
  const pousser = (i: number) => {
    tas.push(i);
    let k = tas.length - 1;
    while (k > 0) {
      const pa = (k - 1) >> 1;
      if (cle(tas[pa]) <= cle(tas[k])) break;
      [tas[pa], tas[k]] = [tas[k], tas[pa]];
      k = pa;
    }
  };
  const tirer = () => {
    const top = tas[0];
    const last = tas.pop()!;
    if (tas.length) {
      tas[0] = last;
      let k = 0;
      for (;;) {
        const a = 2 * k + 1,
          b = a + 1;
        let m = k;
        if (a < tas.length && cle(tas[a]) < cle(tas[m])) m = a;
        if (b < tas.length && cle(tas[b]) < cle(tas[m])) m = b;
        if (m === k) break;
        [tas[m], tas[k]] = [tas[k], tas[m]];
        k = m;
      }
    }
    return top;
  };
  for (let i = 0; i < n; i++) if (deg[i] === 0) pousser(i);
  const fait = new Array(n).fill(false);
  const out: Volume[] = [];
  while (out.length < n) {
    if (!tas.length) {
      let best = -1;
      for (let i = 0; i < n; i++) if (!fait[i] && (best < 0 || cle(i) < cle(best))) best = i;
      deg[best] = 0;
      pousser(best);
    }
    const i = tirer();
    if (fait[i]) continue;
    fait[i] = true;
    out.push(els[i]);
    for (const j of succ[i]) {
      deg[j]--;
      if (deg[j] === 0 && !fait[j]) pousser(j);
    }
  }
  return out;
}

// ------------------------------------------------------------------ matières
type Matiere = 'bois' | 'tissu' | 'sol';
type Textures = Record<Matiere | 'grain', CanvasPattern>;

/** Couleurs de la DA rattachées à une matière (les teintes voisines suivent la plus proche). */
const PALETTE_MATIERES: [string, Matiere][] = [
  ['#e2cdb8', 'bois'], ['#d3b9a0', 'bois'], ['#b08f74', 'bois'], ['#8b7258', 'bois'], ['#d7c7ac', 'bois'],
  ['#ceab97', 'tissu'], ['#b98f7c', 'tissu'], ['#bf7b69', 'tissu'], ['#ae6542', 'tissu'], ['#a1a58c', 'tissu'],
  ['#708b72', 'tissu'], ['#5f7a8a', 'tissu'], ['#9fb1ba', 'tissu'], ['#3d5c6e', 'tissu'], ['#c9ccb9', 'tissu'],
  ['#d6dee0', 'tissu'], ['#5f7570', 'tissu'], ['#bec8c9', 'tissu'], ['#e6d2c3', 'tissu'],
  ['#ecdccf', 'sol'], ['#e3ded5', 'sol'], ['#efe8e1', 'sol'], ['#e2ddd7', 'sol'], ['#f2ebe4', 'sol'],
];
const rgb = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const PALETTE_RGB = PALETTE_MATIERES.map(([h, m]) => [rgb(h), m] as const);
const cacheMatiere = new Map<string, Matiere | null>();
function matiereDe(col: unknown): Matiere | null {
  if (typeof col !== 'string' || col[0] !== '#' || col.length !== 7) return null;
  let m = cacheMatiere.get(col);
  if (m !== undefined) return m;
  const [r, g, b] = rgb(col);
  let meilleur = 26 * 26;
  m = null;
  for (const [[R, G, B], mat] of PALETTE_RGB) {
    const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2;
    if (d < meilleur) {
      meilleur = d;
      m = mat;
    }
  }
  cacheMatiere.set(col, m);
  return m;
}

/** Générateur pseudo-aléatoire fixe : la texture ne change pas d'une image à l'autre. */
function hasard(graine: number) {
  let s = graine >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const cacheTextures = new Map<number, Record<Matiere | 'grain', HTMLCanvasElement>>();
function tuiles(dpr: number) {
  const cle = Math.round(dpr * 100);
  const deja = cacheTextures.get(cle);
  if (deja) return deja;
  const tuile = (w: number, h: number, dessin: (c: CanvasRenderingContext2D, w: number, h: number) => void) => {
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    const c = cv.getContext('2d')!;
    c.scale(cv.width / w, cv.height / h);
    dessin(c, w, h);
    return cv;
  };
  const alea = hasard(7);
  const t = {
    // veinage : fils ondulés irréguliers, quelques nœuds
    bois: tuile(96, 28, (c, w, h) => {
      for (let i = 0; i < 9; i++) {
        const y0 = (i + alea()) * (h / 9),
          a = 0.6 + alea() * 1.4,
          f = (Math.PI * 2 * (1 + Math.floor(alea() * 2))) / w,
          ph = alea() * 6;
        c.strokeStyle = `rgba(110,72,40,${0.07 + alea() * 0.09})`;
        c.lineWidth = 0.4 + alea() * 0.5;
        c.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const y = y0 + Math.sin(x * f + ph) * a;
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
    }),
    // tissu : trame croisée fine et chiné
    tissu: tuile(24, 24, (c, w, h) => {
      for (let y = 0; y < h; y += 2)
        for (let x = 0; x < w; x += 2) {
          const sombre = (x + y) % 4 === 0;
          c.fillStyle = sombre ? `rgba(40,30,25,${0.05 + alea() * 0.05})` : `rgba(255,255,255,${0.04 + alea() * 0.06})`;
          c.fillRect(x, y, 1, 1);
        }
    }),
    // sol : lames de parquet très discrètes
    sol: tuile(120, 40, (c, w, h) => {
      for (let y = 0; y < h; y += 10) {
        c.fillStyle = `rgba(120,90,60,${0.015 + alea() * 0.03})`;
        c.fillRect(0, y, w, 10);
        c.fillStyle = 'rgba(110,80,55,0.07)';
        c.fillRect(0, y, w, 0.5);
        const j = alea() * w;
        c.fillRect(j, y, 0.5, 10);
      }
    }),
    // grain d'ensemble, comme une impression sur papier
    grain: tuile(128, 128, (c, w, h) => {
      for (let i = 0; i < w * h * 0.22; i++) {
        const x = alea() * w,
          y = alea() * h,
          clair = alea() < 0.35;
        c.fillStyle = clair ? `rgba(255,255,255,${0.12 + alea() * 0.12})` : `rgba(60,45,35,${0.05 + alea() * 0.07})`;
        c.fillRect(x, y, 0.6 + alea() * 0.6, 0.6 + alea() * 0.6);
      }
    }),
  };
  cacheTextures.set(cle, t);
  return t;
}

/** Motifs ancrés sur le plan : ils suivent le déplacement au lieu de glisser dessus. */
function textures(ctx: CanvasRenderingContext2D, dpr: number, p: Proj): Textures | null {
  if (typeof document === 'undefined') return null;
  const t = tuiles(dpr);
  const m = new DOMMatrix().translateSelf(p.tx, p.ty).scaleSelf(1 / dpr, 1 / dpr);
  const out = {} as Textures;
  for (const k of Object.keys(t) as (Matiere | 'grain')[]) {
    const pat = ctx.createPattern(t[k], 'repeat');
    if (!pat) return null;
    pat.setTransform(m);
    out[k] = pat;
  }
  return out;
}

function hachure(ctx: CanvasRenderingContext2D, dpr: number): CanvasPattern | null {
  const t = Math.max(3, Math.round(3.4 * dpr));
  const cv = document.createElement('canvas');
  cv.width = t;
  cv.height = t;
  const c = cv.getContext('2d');
  if (!c) return null;
  c.strokeStyle = 'rgba(43,39,36,0.5)';
  c.lineWidth = 0.5 * dpr;
  c.beginPath();
  c.moveTo(0, t);
  c.lineTo(t, 0);
  c.moveTo(-1, 1);
  c.lineTo(1, -1);
  c.moveTo(t - 1, t + 1);
  c.lineTo(t + 1, t - 1);
  c.stroke();
  return ctx.createPattern(cv, 'repeat');
}

function dansPolygone(x: number, y: number, pts: [number, number][]) {
  let dedans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i],
      [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

function cheminZone(pt: Peintre, contour: [number, number][], z = 0.006) {
  const c = pt.ctx,
    p = pt.p;
  c.beginPath();
  contour.forEach(([X, Y], i) => (i ? c.lineTo(p.x(X, Y), p.y(X, Y, z)) : c.moveTo(p.x(X, Y), p.y(X, Y, z))));
  c.closePath();
}

function libelleSol(pt: Peintre, z: ZoneRendu, accent: string, papier: string) {
  if (!z.libelle || !z.nom) return;
  const p = pt.p,
    c = pt.ctx;
  // axe du plan qui se lit le mieux de gauche à droite
  let best = 0,
    bestv = -Infinity;
  for (const t of [0, 90, 180, 270]) {
    const r = (t * Math.PI) / 180;
    const v = Math.cos(r) * p.sa - Math.sin(r) * p.ca;
    if (v > bestv) {
      bestv = v;
      best = r;
    }
  }
  const xs = z.contour.map((q) => q[0]),
    ys = z.contour.map((q) => q[1]);
  const cxm = (Math.min(...xs) + Math.max(...xs)) / 2,
    cym = (Math.min(...ys) + Math.max(...ys)) / 2;
  const ux = Math.cos(best),
    uy = Math.sin(best);
  const vx = -Math.sin(best),
    vy = Math.cos(best);
  // plan -> écran : M = [[sa, -ca], [ca*se, sa*se]] * k
  const mx = (X: number, Y: number) => (X * p.sa - Y * p.ca) * p.k;
  const my = (X: number, Y: number) => (X * p.ca + Y * p.sa) * p.se * p.k;
  const dpr = c.getTransform().a;
  c.save();
  c.setTransform(
    mx(ux, uy) * dpr,
    my(ux, uy) * dpr,
    mx(vx, vy) * dpr,
    my(vx, vy) * dpr,
    p.x(cxm, cym) * dpr,
    p.y(cxm, cym, 0) * dpr,
  );
  const taille = z.libelle;
  c.font = `600 ${taille}px Poppins, 'Helvetica Neue', Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const txt = z.nom.toUpperCase();
  try {
    (c as any).letterSpacing = `${taille * 0.12}px`;
  } catch {
    /* propriété non prise en charge */
  }
  c.lineJoin = 'round';
  c.strokeStyle = papier;
  c.globalAlpha = 0.85;
  c.lineWidth = taille * 0.28;
  c.strokeText(txt, 0, 0);
  c.globalAlpha = 1;
  c.fillStyle = accent;
  c.fillText(txt, 0, 0);
  c.restore();
}

/** Dessine la maquette. Renvoie la boîte écran (px CSS) de la scène. */
export function dessinerScene(
  ctx: CanvasRenderingContext2D,
  prep: Preparee,
  cam: Camera,
  largeur: number,
  hauteur: number,
  dpr: number,
  opt: OptionsRendu,
) {
  const p = new Proj(cam);
  const sc = prep.scene;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = opt.papier;
  ctx.fillRect(0, 0, largeur, hauteur);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const motif = hachure(ctx, dpr);
  const tex = opt.rapide ? null : textures(ctx, dpr, p);
  const pt = new Peintre(ctx, p, opt.rapide, motif, tex);
  // Sol : aplats texturés selon leur couleur (parquet, tapis).
  const sol = () => {
    for (const q of sc.sol) pt.avecMatiere(q[0] === 'P' ? q[2] : null, () => pt.un(q));
  };

  const zoneChoix = opt.choixId ? opt.zones.find((z) => z.id === opt.choixId) : undefined;
  const zoneSurvol = opt.survolId ? opt.zones.find((z) => z.id === opt.survolId) : undefined;
  let coupe: number[] | null = null;
  if (zoneChoix) {
    const xs = zoneChoix.contour.map((q) => q[0]),
      ys = zoneChoix.contour.map((q) => q[1]);
    coupe = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }

  // sol
  sol();
  pt.dessiner(sc.seuils);
  if (!opt.rapide) pt.dessiner(sc.ombres);
  pt.dessiner(sc.marquages);
  for (const z of [zoneSurvol, zoneChoix]) {
    if (!z) continue;
    cheminZone(pt, z.contour);
    pt.remplir(opt.accent, z === zoneChoix ? 0.16 : 0.1);
  }

  // volumes
  const vus: Volume[] = [];
  const marge = 40;
  for (const el of prep.elements) {
    bboxEcran(p, el.b, el.m, el.e);
    if (el.e[2] < -marge || el.e[0] > largeur + marge || el.e[3] < -marge || el.e[1] > hauteur + marge) continue;
    el.prof = p.prof((el.b[0] + el.b[2]) / 2, (el.b[1] + el.b[3]) / 2, el.b[4] + el.b[5]);
    vus.push(el);
  }
  const hauteurs = new Map<Volume, number>();
  const voiles = new Set<Volume>();
  for (const el of prep.murs) {
    const h = hauteurMur(el.mur!, p, sc);
    hauteurs.set(el, h);
    el.b[5] = h;
    bboxEcran(p, el.b, 0, el.e);
    if (el.e[2] < -marge || el.e[0] > largeur + marge || el.e[3] < -marge || el.e[1] > hauteur + marge) continue;
    el.prof = p.prof((el.b[0] + el.b[2]) / 2, (el.b[1] + el.b[3]) / 2, el.b[4] + el.b[5]);
    const voile = masque(el.mur!, p, coupe);
    if (voile) voiles.add(el);
    el.dessin = (q: Peintre) => {
      if (!voile) return dessinerMur(q, el.mur!, hauteurs.get(el)!, sc);
      q.ctx.save();
      q.ctx.globalAlpha = 0.3;
      dessinerMur(q, el.mur!, hauteurs.get(el)!, sc);
      q.ctx.restore();
    };
    vus.push(el);
  }
  // Un écran mural disparaît avec son mur quand celui-ci est bas ou passe en transparence.
  // Il est aussi masqué quand on regarde le mur par l'autre face (l'écran est alors derrière le mur).
  const devant = (e: number[], m: number[]) =>
    m[2] - m[0] >= m[3] - m[1]
      ? ((e[1] + e[3]) / 2 - (m[1] + m[3]) / 2) * p.sa > 0
      : ((e[0] + e[2]) / 2 - (m[0] + m[2]) / 2) * p.ca > 0;
  const ecrans = vus.filter(
    (el) =>
      el.support &&
      !voiles.has(el.support) &&
      (hauteurs.get(el.support) ?? el.support.b[5]) >= el.b[5] - 0.01 &&
      devant(el.b, el.support.b),
  );
  // Les écrans ne passent pas par le tri : collés au mur, ils sont dessinés juste après lui.
  const ordre = trier(
    vus.filter((el) => !el.support),
    p.ca,
    p.sa,
  ).flatMap((el) => (el.mur ? [el, ...ecrans.filter((e) => e.support === el)] : [el]));
  for (const el of ordre) el.dessin(pt);

  // mise en évidence de l'espace choisi : le reste s'estompe
  if (zoneChoix) {
    ctx.fillStyle = opt.papier;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, 0, largeur, hauteur);
    ctx.globalAlpha = 1;
    ctx.save();
    cheminZone(pt, zoneChoix.contour, 0);
    ctx.clip();
    sol();
    pt.dessiner(sc.seuils);
    ctx.restore();
    cheminZone(pt, zoneChoix.contour);
    pt.remplir(opt.accent, 0.14);
    const dedans = (el: Volume) => {
      const cx = (el.b[0] + el.b[2]) / 2,
        cy = (el.b[1] + el.b[3]) / 2;
      return dansPolygone(cx, cy, zoneChoix.contour);
    };
    for (const el of ordre) if (!el.mur && dedans(el)) el.dessin(pt);
  }
  // Résultats de recherche ou de filtre : le reste du plan s'estompe, les espaces
  // retenus gardent leur dessin, avec une teinte franche et un contour épais à la couleur de leur catégorie.
  if (opt.correspondances && !zoneChoix) {
    const retenues = opt.zones.filter((z) => opt.correspondances!.has(z.id));
    ctx.fillStyle = opt.papier;
    ctx.globalAlpha = 0.62;
    ctx.fillRect(0, 0, largeur, hauteur);
    ctx.globalAlpha = 1;
    for (const z of retenues) {
      ctx.save();
      cheminZone(pt, z.contour, 0);
      ctx.clip();
      sol();
      ctx.restore();
      cheminZone(pt, z.contour);
      pt.remplir(z.couleur, 0.38);
    }
    for (const el of ordre)
      if (!el.mur && retenues.some((z) => dansPolygone((el.b[0] + el.b[2]) / 2, (el.b[1] + el.b[3]) / 2, z.contour)))
        el.dessin(pt);
    for (const z of retenues) {
      cheminZone(pt, z.contour);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = z.couleur;
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
  }
  // grain d'ensemble : le rendu perd son aspect lisse
  if (tex) {
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = tex.grain;
    ctx.fillRect(0, 0, largeur, hauteur);
    ctx.globalAlpha = 1;
  }
  for (const z of [zoneSurvol, zoneChoix]) {
    if (!z) continue;
    cheminZone(pt, z.contour);
    ctx.strokeStyle = opt.accent;
    ctx.lineWidth = z === zoneChoix ? 2.4 : 1.6;
    ctx.setLineDash(z === zoneChoix ? [] : [5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // libellés au sol
  if (opt.libelles) {
    for (const z of opt.zones) {
      if (zoneChoix && z !== zoneChoix) continue;
      libelleSol(pt, z, opt.accent, opt.papier);
    }
  }
}

/** Boîte écran de la scène entière pour une caméra donnée (px CSS). */
export function emprise(scene: Scene, cam: Camera): [number, number, number, number] {
  const p = new Proj(cam);
  const [x0, y0, x1, y1] = scene.bornes;
  let a = Infinity,
    b = Infinity,
    c = -Infinity,
    d = -Infinity;
  for (const X of [x0, x1])
    for (const Y of [y0, y1])
      for (const Z of [-0.34, 3]) {
        const sx = p.x(X, Y),
          sy = p.y(X, Y, Z);
        a = Math.min(a, sx);
        c = Math.max(c, sx);
        b = Math.min(b, sy);
        d = Math.max(d, sy);
      }
  return [a, b, c, d];
}

export { dansPolygone };
