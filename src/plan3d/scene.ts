/**
 * Maquette 3D en style « dessin d'architecte » : volumes blancs, arases des
 * murs en noir, traits fins pour les portes, vitrages et mobilier, ombres
 * discrètes. Les couleurs Ocellis ne servent qu'aux repères (circulations)
 * et à la mise en évidence des espaces.
 *
 * Données : structure.ts (murs, cloisons, portes, noyau), mobilier.ts et les
 * contours de espaces.json — les mêmes que le dessin 2D. Seul le secteur de
 * l'aperçu (SECTEUR_APERCU) est construit, coupé net à ses limites.
 *
 * Repère : 1 unité three.js = 1 mètre ; le plan (x, y) devient (X, Z), Y vers le haut.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { area, labelPoint, pointInPolygon } from '../lib/geometry';
import type { ZoneGeom } from '../lib/zones';
import { HAUTEUR_PORTE_M, METRES_PAR_UNITE, MURS, NOYAU, PORTES } from '../plan/structure';
import type { Point } from '../types';
import { HAUTEURS_MOBILIER, MOBILIER, type Meuble } from './mobilier';

/** Secteur construit pour l'aperçu de style, dans le repère du plan. */
export const SECTEUR_APERCU = {
  x0: 26,
  y0: 0,
  x1: 503,
  y1: 250,
  nom: 'Secteur nord',
  description: 'Salles NOVA à OREE, escalier, espace de travail ouvert, colonne de services, matériauthèque, OCELLE et couloir',
};
type Secteur = typeof SECTEUR_APERCU;

/** Hauteurs schématiques, en mètres (absentes du PDF sauf les portes) — voir aConfirmer.ts. */
export const HAUTEURS = {
  cloison: 2.4,
  mur: 2.7,
  noyau: 2.7,
  porte: HAUTEUR_PORTE_M,
  marche: 0.17,
};

const M = METRES_PAR_UNITE;
const CENTRE: Point = [(SECTEUR_APERCU.x0 + SECTEUR_APERCU.x1) / 2, (SECTEUR_APERCU.y0 + SECTEUR_APERCU.y1) / 2];

export const versMonde = ([x, y]: Point, hauteur = 0) => new THREE.Vector3((x - CENTRE[0]) * M, hauteur, (y - CENTRE[1]) * M);
export const versPlan = (v: THREE.Vector3): Point => [v.x / M + CENTRE[0], v.z / M + CENTRE[1]];

/** Couleurs du rendu, lues dans les variables CSS (theme.css). */
export interface Palette {
  papier: string;
  sol: string;
  trait: string;
  traitFin: string;
  circulation: string;
  noyau: string;
  vitre: string;
  traitVitre: string;
  marque: string;
}

export function lirePalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    papier: v('--plan3d-paper', '#f6f4ef'),
    sol: v('--plan3d-floor', '#fdfcf9'),
    trait: v('--plan3d-ink', '#1a181a'),
    traitFin: v('--plan3d-ink-fine', '#3a3639'),
    circulation: v('--plan3d-circulation', '#dfe3e3'),
    noyau: v('--plan3d-core', '#ebe6de'),
    vitre: v('--plan3d-glass', '#dce8ed'),
    traitVitre: v('--plan3d-glass-ink', '#58788a'),
    marque: v('--brand', '#3d5c6e'),
  };
}

// --- Découpage au secteur ----------------------------------------------------------

function couperRect(x: number, y: number, w: number, h: number, s: Secteur) {
  const x0 = Math.max(x, s.x0);
  const y0 = Math.max(y, s.y0);
  const x1 = Math.min(x + w, s.x1);
  const y1 = Math.min(y + h, s.y1);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}

/** Découpe d'un polygone par le rectangle du secteur (Sutherland–Hodgman). */
export function couperPolygone(points: Point[], s: Secteur): Point[] {
  const bords: [(p: Point) => boolean, (a: Point, b: Point) => Point][] = [
    [(p) => p[0] >= s.x0, (a, b) => [s.x0, a[1] + ((b[1] - a[1]) * (s.x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= s.x1, (a, b) => [s.x1, a[1] + ((b[1] - a[1]) * (s.x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= s.y0, (a, b) => [a[0] + ((b[0] - a[0]) * (s.y0 - a[1])) / (b[1] - a[1]), s.y0]],
    [(p) => p[1] <= s.y1, (a, b) => [a[0] + ((b[0] - a[0]) * (s.y1 - a[1])) / (b[1] - a[1]), s.y1]],
  ];
  let sortie = points;
  for (const [dedans, inter] of bords) {
    const entree = sortie;
    sortie = [];
    for (let i = 0; i < entree.length; i++) {
      const a = entree[(i + entree.length - 1) % entree.length];
      const b = entree[i];
      if (dedans(b)) {
        if (!dedans(a)) sortie.push(inter(a, b));
        sortie.push(b);
      } else if (dedans(a)) sortie.push(inter(a, b));
    }
    if (sortie.length === 0) break;
  }
  return sortie;
}

const dansSecteur = ([x, y]: Point, s: Secteur) => x >= s.x0 && x <= s.x1 && y >= s.y0 && y <= s.y1;

// --- Construction ------------------------------------------------------------------

/** Mur ou cloison, avec ce qu'il faut pour le rendre transparent quand il masque l'intérieur. */
export interface MurMaquette {
  mesh: THREE.Mesh;
  centre: THREE.Vector3;
  /** Normale horizontale de la grande face, tournée vers l'extérieur du secteur. */
  normale: THREE.Vector3;
  facade: boolean;
}

export interface Maquette {
  scene: THREE.Scene;
  /** Sols des zones du secteur (cibles du clic), par identifiant d'espace. */
  sols: Map<string, THREE.Mesh<THREE.ShapeGeometry, THREE.MeshLambertMaterial>>;
  /** Contour découpé et point d'étiquette de chaque zone du secteur. */
  contours: Map<string, { contour: Point[]; etiquette: THREE.Vector3 }>;
  murs: MurMaquette[];
  /** Objets qui interceptent le clic avant le sol (mobilier, murs pleins). */
  obstacles: THREE.Object3D[];
  /** Matériaux de traits épais : leur résolution suit la taille du canevas. */
  traitsEpais: LineMaterial[];
  /** Coins de l'emprise du secteur (pour le cadrage). */
  emprise: THREE.Vector3[];
  /** Met en évidence une zone (contour épais à la couleur Ocellis), ou rien. */
  surligner: (id: string | null) => void;
  /** Rend transparents les murs de premier plan qui masquent l'intérieur. */
  decouper: (versCamera: THREE.Vector3, zoneSelectionnee: string | null) => void;
  dispose: () => void;
}

function forme(points: Point[]) {
  const shape = new THREE.Shape();
  points.forEach((p, i) => {
    const w = versMonde(p);
    // ShapeGeometry dessine en XY : Y = −Z pour que rotateX(−90°) remette le sol à plat, face vers le haut.
    if (i === 0) shape.moveTo(w.x, -w.z);
    else shape.lineTo(w.x, -w.z);
  });
  shape.closePath();
  return shape;
}

export function construireMaquette(zones: ZoneGeom[], palette: Palette, secteur: Secteur = SECTEUR_APERCU): Maquette {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.papier);
  const jetables: { dispose: () => void }[] = [];
  const garder = <T extends { dispose: () => void }>(o: T) => (jetables.push(o), o);
  const traitsEpais: LineMaterial[] = [];
  const obstacles: THREE.Object3D[] = [];
  const murs: MurMaquette[] = [];

  // --- Lumière douce : faces presque blanches, ombres portées légères.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e4dc, 2.4));
  const soleil = new THREE.DirectionalLight(0xffffff, 0.9);
  soleil.position.set(-12, 22, 9);
  soleil.castShadow = true;
  soleil.shadow.mapSize.set(2048, 2048);
  Object.assign(soleil.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  soleil.shadow.bias = -0.0004;
  scene.add(soleil);

  // --- Matériaux
  const lambert = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) =>
    garder(new THREE.MeshLambertMaterial({ color, ...extra }));
  const matBlanc = lambert('#ffffff');
  const matArase = garder(new THREE.MeshBasicMaterial({ color: palette.trait }));
  const matVitre = lambert(palette.vitre, { transparent: true, opacity: 0.28, depthWrite: false });
  const matNoyau = lambert(palette.noyau);
  const matFantome = lambert('#ffffff', { transparent: true, opacity: 0.06, depthWrite: false });
  const matAraseFantome = garder(
    new THREE.MeshBasicMaterial({ color: palette.trait, transparent: true, opacity: 0.12, depthWrite: false }),
  );
  const traitEpais = (couleur: string, largeur: number, opacite = 1) => {
    const m = garder(new LineMaterial({ color: couleur, linewidth: largeur, transparent: opacite < 1, opacity: opacite }));
    traitsEpais.push(m);
    return m;
  };
  const traitMur = traitEpais(palette.trait, 1.6);
  const traitMurFantome = traitEpais(palette.trait, 1, 0.16);
  const traitDalle = traitEpais(palette.trait, 2.2);
  const traitSurlignage = traitEpais(palette.marque, 3.2);
  const traitFin = garder(new THREE.LineBasicMaterial({ color: palette.traitFin, transparent: true, opacity: 0.78 }));
  const traitVitre = garder(new THREE.LineBasicMaterial({ color: palette.traitVitre, transparent: true, opacity: 0.8 }));
  const traitArc = garder(
    new THREE.LineDashedMaterial({ color: palette.traitFin, dashSize: 0.1, gapSize: 0.08, transparent: true, opacity: 0.6 }),
  );

  const aretesFines = (geometry: THREE.BufferGeometry, mat: THREE.LineBasicMaterial = traitFin) =>
    new THREE.LineSegments(garder(new THREE.EdgesGeometry(geometry, 25)), mat);
  const aretesEpaisses = (geometry: THREE.BufferGeometry, mat: LineMaterial) =>
    new LineSegments2(garder(new LineSegmentsGeometry().fromEdgesGeometry(garder(new THREE.EdgesGeometry(geometry)))), mat);

  /** Boîte blanche posée à `base` (repère monde), arêtes fines, ombre portée. */
  const boite = (cx: number, cz: number, l: number, p: number, h: number, base = 0, rot = 0) => {
    const g = new THREE.Group();
    const geometry = garder(new THREE.BoxGeometry(Math.max(l, 0.02), h, Math.max(p, 0.02)));
    const mesh = new THREE.Mesh(geometry, matBlanc);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh, aretesFines(geometry));
    g.position.set(cx, base + h / 2, cz);
    g.rotation.y = rot;
    obstacles.push(mesh);
    return g;
  };
  const cylindre = (cx: number, cz: number, r: number, h: number, base = 0) => {
    const geometry = garder(new THREE.CylinderGeometry(r, r, h, 24));
    const mesh = new THREE.Mesh(geometry, matBlanc);
    mesh.castShadow = true;
    const g = new THREE.Group();
    g.add(mesh, aretesFines(geometry));
    g.position.set(cx, base + h / 2, cz);
    scene.add(g);
    obstacles.push(mesh);
  };

  // --- Dalle du secteur, coupée net (trait épais sur la tranche)
  const coinA = versMonde([secteur.x0, secteur.y0]);
  const coinB = versMonde([secteur.x1, secteur.y1]);
  const dalleGeo = garder(new THREE.BoxGeometry(coinB.x - coinA.x, 0.16, coinB.z - coinA.z));
  const dalle = new THREE.Mesh(dalleGeo, lambert(palette.sol));
  dalle.position.set((coinA.x + coinB.x) / 2, -0.08, (coinA.z + coinB.z) / 2);
  dalle.receiveShadow = true;
  const dalleTrait = aretesEpaisses(dalleGeo, traitDalle);
  dalleTrait.position.copy(dalle.position);
  scene.add(dalle, dalleTrait);

  // --- Sols des zones du secteur (les grandes d'abord, 1 mm plus bas par rang)
  const sols: Maquette['sols'] = new Map();
  const contours: Maquette['contours'] = new Map();
  zones.forEach((zone, i) => {
    const contour = couperPolygone(zone.espace.contour, secteur);
    if (contour.length < 3 || area(contour) < 20) return;
    const circulation = zone.espace.categorie === 'circulations';
    const base = circulation ? palette.circulation : palette.sol;
    const mesh = new THREE.Mesh(garder(new THREE.ShapeGeometry(forme(contour)).rotateX(-Math.PI / 2)), lambert(base));
    mesh.position.y = 0.002 + i * 0.001;
    mesh.receiveShadow = true;
    mesh.userData = { zoneId: zone.espace.id, base };
    sols.set(zone.espace.id, mesh);
    contours.set(zone.espace.id, { contour, etiquette: versMonde(labelPoint(contour), 0.05) });
    scene.add(mesh);
  });

  // --- Murs et cloisons : faces blanches, arase noire, arêtes en trait épais
  const centreSecteur = versMonde(CENTRE);
  const materiauxMur = [matBlanc, matBlanc, matArase, matBlanc, matBlanc, matBlanc];
  const materiauxFantome = [matFantome, matFantome, matAraseFantome, matFantome, matFantome, matFantome];
  for (const m of MURS) {
    const r = couperRect(m.x, m.y, m.w, m.h, secteur);
    if (!r) continue;
    const c = versMonde([r.x + r.w / 2, r.y + r.h / 2]);
    const l = Math.max(r.w * M, 0.05);
    const p = Math.max(r.h * M, 0.05);
    const vitre = m.type === 'vitree' || m.type === 'vitree-allege';
    const h = m.type === 'mur' ? HAUTEURS.mur : HAUTEURS.cloison;
    const geometry = garder(new THREE.BoxGeometry(l, h, p));
    const g = new THREE.Group();
    g.position.set(c.x, h / 2, c.z);
    scene.add(g);

    if (vitre) {
      // Vitrage : verre très clair, cadre et montants en trait fin.
      const verre = new THREE.Mesh(geometry, matVitre);
      verre.renderOrder = 2;
      g.add(verre, aretesFines(geometry, traitVitre));
      const long = Math.max(l, p);
      const n = Math.max(1, Math.round(long / 1.2));
      const pts: THREE.Vector3[] = [];
      for (let k = 1; k < n; k++) {
        const t = -long / 2 + (long * k) / n;
        const [x, z] = l >= p ? [t, 0] : [0, t];
        pts.push(new THREE.Vector3(x, -h / 2, z), new THREE.Vector3(x, h / 2, z));
      }
      if (pts.length) g.add(new THREE.LineSegments(garder(new THREE.BufferGeometry().setFromPoints(pts)), traitVitre));
      continue;
    }

    const mesh = new THREE.Mesh(geometry, materiauxMur);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const trait = aretesEpaisses(geometry, traitMur);
    mesh.userData.trait = trait;
    g.add(mesh, trait);
    const normale =
      l >= p
        ? new THREE.Vector3(0, 0, Math.sign(c.z - centreSecteur.z) || 1)
        : new THREE.Vector3(Math.sign(c.x - centreSecteur.x) || 1, 0, 0);
    const facade = m.type === 'mur' && (r.x <= secteur.x0 + 4 || r.x + r.w >= secteur.x1 - 8 || r.y <= secteur.y0 + 2);
    murs.push({ mesh, centre: c, normale, facade });
  }

  // --- Noyau technique : volume plein, arase claire et trait épais
  const noyauContour = couperPolygone(NOYAU, secteur);
  let noyau: THREE.Mesh | null = null;
  if (noyauContour.length >= 3) {
    const geo = garder(
      new THREE.ExtrudeGeometry(forme(noyauContour), { depth: HAUTEURS.noyau, bevelEnabled: false }).rotateX(-Math.PI / 2),
    );
    const mesh = new THREE.Mesh(geo, matNoyau);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const trait = aretesEpaisses(geo, traitMur);
    scene.add(mesh, trait);
    obstacles.push(mesh);
    mesh.userData.trait = trait;
    noyau = mesh;
  }

  // --- Portes : vantail ouvert (2,04 m) et débattement au sol, en traits fins
  for (const porte of PORTES) {
    if (!dansSecteur(porte.h, secteur)) continue;
    const g = versMonde(porte.h);
    const o = versMonde(porte.ouvert);
    const longueur = g.distanceTo(o);
    scene.add(boite((g.x + o.x) / 2, (g.z + o.z) / 2, longueur, 0.04, HAUTEURS.porte, 0, Math.atan2(-(o.z - g.z), o.x - g.x)));
    const f = versMonde(porte.ferme);
    const a0 = Math.atan2(f.z - g.z, f.x - g.x);
    let a1 = Math.atan2(o.z - g.z, o.x - g.x);
    if (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
    if (a0 - a1 > Math.PI) a1 += 2 * Math.PI;
    const arc = Array.from({ length: 17 }, (_, k) => {
      const ang = a0 + ((a1 - a0) * k) / 16;
      return new THREE.Vector3(g.x + Math.cos(ang) * longueur, 0.06, g.z + Math.sin(ang) * longueur);
    });
    const ligne = new THREE.Line(garder(new THREE.BufferGeometry().setFromPoints(arc)), traitArc);
    ligne.computeLineDistances();
    scene.add(ligne);
  }

  // --- Escalier du haut : marches pleines, coupées à 1,90 m
  const marches = 11;
  for (let i = 0; i < marches; i++) {
    const c = versMonde([266 + (64 * (i + 0.5)) / marches, 20.5]);
    scene.add(boite(c.x, c.z, (64 / marches) * M, 35 * M, HAUTEURS.marche * (i + 1)));
  }

  // --- Mobilier en formes simples
  const construireMeuble = (m: Meuble) => {
    const h = HAUTEURS_MOBILIER[m.type];
    if (m.r !== undefined) {
      if (!dansSecteur([m.x, m.y], secteur)) return;
      const c = versMonde([m.x, m.y]);
      const r = m.r * M;
      if (m.type === 'tabouret') {
        cylindre(c.x, c.z, 0.03, h - 0.04);
        cylindre(c.x, c.z, r, 0.04, h - 0.04);
      } else cylindre(c.x, c.z, r, h);
      return;
    }
    if (m.type === 'chaise') {
      if (!dansSecteur([m.x, m.y], secteur)) return;
      const c = versMonde([m.x, m.y]);
      const g = new THREE.Group();
      g.position.copy(c);
      g.rotation.y = THREE.MathUtils.degToRad(-(m.a ?? 0));
      const s = 0.44;
      g.add(boite(0, 0, s, s, 0.04, 0.42)); // assise
      g.add(boite(0, -s / 2 + 0.02, s, 0.04, 0.4, 0.46)); // dossier, côté haut du plan pour a = 0
      g.add(boite(0, 0, 0.04, 0.04, 0.42)); // piétement
      scene.add(g);
      return;
    }

    const r = couperRect(m.x, m.y, m.w ?? 0, m.h ?? 0, secteur);
    if (!r) return;
    const c = versMonde([r.x + r.w / 2, r.y + r.h / 2]);
    const l = r.w * M;
    const p = r.h * M;
    const rot = THREE.MathUtils.degToRad(-(m.a ?? 0));

    if (m.type === 'table' || m.type === 'plan') {
      const g = new THREE.Group();
      g.position.set(c.x, 0, c.z);
      g.rotation.y = rot;
      g.add(boite(0, 0, l, p, 0.04, h - 0.04));
      const dx = l / 2 - 0.06;
      const dz = p / 2 - 0.06;
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        g.add(boite(sx * dx, sz * dz, 0.04, 0.04, h - 0.04));
      scene.add(g);
      return;
    }
    if (m.type === 'casiers') {
      const n = m.n ?? 1;
      const horizontal = l >= p;
      for (let k = 0; k < n; k++) {
        const t = ((k + 0.5) / n - 0.5) * (horizontal ? l : p);
        scene.add(boite(c.x + (horizontal ? t : 0), c.z + (horizontal ? 0 : t), horizontal ? l / n : l, horizontal ? p : p / n, h));
      }
      return;
    }
    if (m.type === 'etagere') {
      const g = boite(c.x, c.z, l, p, h, 0, rot);
      // Tablettes en trait fin sur les grandes faces
      const pts: THREE.Vector3[] = [];
      for (let k = 1; k < 5; k++) {
        const y = -h / 2 + (h * k) / 5;
        if (l >= p)
          for (const z of [-p / 2 - 0.002, p / 2 + 0.002]) pts.push(new THREE.Vector3(-l / 2, y, z), new THREE.Vector3(l / 2, y, z));
        else for (const x of [-l / 2 - 0.002, l / 2 + 0.002]) pts.push(new THREE.Vector3(x, y, -p / 2), new THREE.Vector3(x, y, p / 2));
      }
      g.add(new THREE.LineSegments(garder(new THREE.BufferGeometry().setFromPoints(pts)), traitFin));
      scene.add(g);
      return;
    }
    if (m.type === 'fauteuil') {
      const g = new THREE.Group();
      g.position.set(c.x, 0, c.z);
      g.rotation.y = rot;
      g.add(boite(0, 0, l, p, h), boite(0, -p / 2 + 0.06, l, 0.12, 0.34, h));
      scene.add(g);
      return;
    }
    scene.add(boite(c.x, c.z, l, p, h, 0, rot));
  };
  MOBILIER.forEach(construireMeuble);

  // --- Mise en évidence d'une zone : contour épais à la couleur Ocellis
  const surlignage = new Line2(new LineGeometry(), traitSurlignage);
  surlignage.visible = false;
  surlignage.renderOrder = 10;
  scene.add(surlignage);
  const surligner = (id: string | null) => {
    const entree = id ? contours.get(id) : undefined;
    if (!entree) {
      surlignage.visible = false;
      return;
    }
    surlignage.geometry.dispose();
    surlignage.geometry = new LineGeometry().setPositions(
      [...entree.contour, entree.contour[0]].flatMap((pt) => versMonde(pt, 0.06).toArray()),
    );
    surlignage.computeLineDistances();
    surlignage.visible = true;
  };

  // --- Coupe dynamique : murs de premier plan rendus transparents
  const rayon = new THREE.Raycaster();
  const fantome = (mur: MurMaquette, oui: boolean) => {
    mur.mesh.material = oui ? materiauxFantome : materiauxMur;
    (mur.mesh.userData.trait as LineSegments2).material = oui ? traitMurFantome : traitMur;
    mur.mesh.castShadow = !oui;
    mur.mesh.userData.fantome = oui;
  };
  /** Pièces (hors circulations) du secteur, avec leur contour en coordonnées monde. */
  const pieces = [...contours.entries()]
    .filter(([id]) => zones.find((z) => z.espace.id === id)?.espace.categorie !== 'circulations')
    .map(([id, c]) => ({ id, contour: c.contour, monde: c.contour.map((p) => versMonde(p)), aire: area(c.contour) }))
    .sort((a, b) => a.aire - b.aire);

  const decouper = (versCamera: THREE.Vector3, zoneSelectionnee: string | null) => {
    const v = versCamera.clone().setY(0).normalize();
    const elevation = Math.asin(THREE.MathUtils.clamp(versCamera.clone().normalize().y, 0.05, 1));
    const recul = 1 / Math.tan(elevation); // recul au sol d'un mètre de hauteur, vu de la caméra

    // Murs qui masquent la zone sélectionnée, vus depuis la caméra
    const masquants = new Set<THREE.Object3D>();
    const entree = zoneSelectionnee ? contours.get(zoneSelectionnee) : undefined;
    if (entree) {
      const dir = versCamera.clone().normalize();
      const xs = entree.contour.map((p) => p[0]);
      const ys = entree.contour.map((p) => p[1]);
      const [xmin, xmax, ymin, ymax] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const echantillons: Point[] = [labelPoint(entree.contour)];
      for (const tx of [0.2, 0.5, 0.8]) for (const ty of [0.2, 0.5, 0.8]) echantillons.push([xmin + (xmax - xmin) * tx, ymin + (ymax - ymin) * ty]);
      const cibles = [...murs.map((m) => m.mesh), ...(noyau ? [noyau] : [])];
      for (const e of echantillons) {
        for (const h of [0.1, 1.2]) {
          rayon.set(versMonde(e, h), dir);
          for (const t of rayon.intersectObjects(cibles, false)) masquants.add(t.object);
        }
      }
    }

    for (const mur of murs) {
      const face = mur.normale.dot(v);
      // Façade tournée vers la caméra : toujours ouverte, comme une coupe.
      let oui = mur.facade && face > 0.3;
      if (!oui && Math.abs(face) > 0.2) {
        // Pièce située derrière le mur, vue depuis la caméra
        const derriere = mur.centre.clone().addScaledVector(mur.normale, -Math.sign(face) * 0.35);
        const point = versPlan(derriere);
        const piece = pieces.find((p) => pointInPolygon(point, p.contour));
        if (piece) {
          // Profondeur de la pièce perpendiculairement au mur, et part qu'en cache le mur
          const n = mur.normale;
          const proj = piece.monde.map((q) => q.dot(n));
          const profondeurPiece = Math.max(...proj) - Math.min(...proj);
          const hauteur = (mur.mesh.geometry as THREE.BoxGeometry).parameters.height;
          const cache = (hauteur * recul * Math.abs(face)) / Math.max(profondeurPiece, 0.5);
          oui = cache > 0.75;
        }
      }
      oui ||= masquants.has(mur.mesh);
      if (oui !== Boolean(mur.mesh.userData.fantome)) fantome(mur, oui);
    }
    if (noyau) {
      const oui = masquants.has(noyau);
      noyau.material = oui ? matFantome : matNoyau;
      (noyau.userData.trait as LineSegments2).material = oui ? traitMurFantome : traitMur;
      noyau.castShadow = !oui;
      noyau.userData.fantome = oui;
    }
  };

  const emprise = [0, HAUTEURS.mur].flatMap((y) =>
    (
      [
        [secteur.x0, secteur.y0],
        [secteur.x1, secteur.y0],
        [secteur.x0, secteur.y1],
        [secteur.x1, secteur.y1],
      ] as Point[]
    ).map((p) => versMonde(p, y)),
  );

  return {
    scene,
    sols,
    contours,
    murs,
    obstacles,
    traitsEpais,
    emprise,
    surligner,
    decouper,
    dispose: () => {
      surlignage.geometry.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Line) o.geometry.dispose();
      });
      jetables.forEach((o) => o.dispose());
    },
  };
}
