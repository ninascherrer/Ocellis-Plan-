/**
 * Maquette axonométrique illustrée du plateau, vue d'ouverture du site.
 *
 * Le dessin (traits à l'encre, aplats doux, personnages, végétation) est recalculé à
 * chaque mouvement sur un canvas 2D : rotation libre, inclinaison, zoom et déplacement.
 * Les espaces de espaces.json sont cliquables directement sur la maquette.
 *
 * Gestes : glisser pour pivoter et incliner, molette ou pincement pour zoomer,
 * clic droit, Maj + glisser ou deux doigts pour déplacer.
 */
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react';
import type { Insets } from '../hooks/usePanZoom';
import { pointInPolygon } from '../lib/geometry';
import type { ZoneGeom } from '../lib/zones';
import { AMENAGEMENT, ARCHITECTURE } from './aConfirmer';
import { dessinerScene, emprise, preparer, projeter, solSousEcran, type Camera, type Preparee, type Scene, type ZoneRendu } from './rendu';

export interface PlanMaquetteHandle {
  zoomBy: (factor: number) => void;
  /** Revient à la vue de trois quarts depuis le sud-est, plateau entier. */
  reset: () => void;
  focus: (zone: ZoneGeom) => void;
  /** Quart de tour (sens = 1 : sens horaire vu de dessus). */
  rotate: (sens: 1 | -1) => void;
}

interface PlanMaquetteProps {
  ref?: Ref<PlanMaquetteHandle>;
  zones: ZoneGeom[];
  colorOf: (zone: ZoneGeom) => string;
  selectedId: string | null;
  hoveredId: string | null;
  matchIds: Set<string> | null;
  onZoneClick: (id: string) => void;
  onZoneHover: (id: string | null) => void;
  onBackgroundClick: () => void;
  getInsets: () => Insets;
  isDesktop: boolean;
}

/** État de la vue : azimut et inclinaison (radians), échelle (px / m), point du plan au centre de la zone libre. */
interface Etat {
  az: number;
  el: number;
  k: number;
  px: number;
  py: number;
}

const AZ_DEPART = Math.PI / 4; // vue depuis le sud-est : terrasse et accès au premier plan
const EL_DEPART = (52 * Math.PI) / 180;
const EL_MIN = (22 * Math.PI) / 180;
const EL_MAX = (84 * Math.PI) / 180;
const ACCENT = '#7a3e63';
const PAPIER = '#fbf8f1';

const lisser = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export default function PlanMaquette({
  ref,
  zones,
  colorOf,
  selectedId,
  hoveredId,
  matchIds,
  onZoneClick,
  onZoneHover,
  onBackgroundClick,
  getInsets,
  isDesktop,
}: PlanMaquetteProps) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const etiquettesRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<Preparee | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const etat = useRef<Etat>({ az: AZ_DEPART, el: EL_DEPART, k: 30, px: 12, py: 12 });
  const kAjuste = useRef(30);
  const anim = useRef<{ de: Etat; vers: Etat; debut: number; duree: number } | null>(null);
  const interaction = useRef(0);
  /** Cadrage demandé avant la fin du chargement (lien partagé #<identifiant>). */
  const enAttente = useRef<ZoneGeom | null>(null);
  const image = useRef(0);
  const sale = useRef(true);

  // Contours des espaces, en mètres, et libellés au sol
  const zonesRendu = useMemo<ZoneRendu[]>(() => {
    const sc = scene?.scene;
    if (!sc) return [];
    const { ox, oy, kx, ky } = sc.repere;
    const parNom = new Map<string, number>();
    for (const z of zones) {
      if (z.espace.categorie === 'circulations') continue;
      const nom = z.espace.nom;
      if ((parNom.get(nom) ?? 0) < z.area) parNom.set(nom, z.area);
    }
    return zones.map((z) => {
      const contour = z.espace.contour.map(([u, v]) => [(u - ox) / kx, (v - oy) / ky] as [number, number]);
      const xs = contour.map((p) => p[0]),
        ys = contour.map((p) => p[1]);
      const cote = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const nom = z.espace.nom;
      let taille = Math.min(0.36, cote / (nom.length * 0.72 + 0.4), cote * 0.45);
      const principal = parNom.get(nom) === z.area;
      if (z.espace.categorie === 'circulations' || !principal || taille < 0.12) taille = 0;
      return { id: z.espace.id, contour, nom, couleur: colorOf(z), libelle: taille };
    });
  }, [scene, zones, colorOf]);

  const rappels = useRef({ onZoneClick, onZoneHover, onBackgroundClick, getInsets, zones, zonesRendu, selectedId, hoveredId, matchIds });
  rappels.current = { onZoneClick, onZoneHover, onBackgroundClick, getInsets, zones, zonesRendu, selectedId, hoveredId, matchIds };

  // --- Chargement de la scène (fichier statique, généré par outils/maquette/export.py)
  useEffect(() => {
    let annule = false;
    fetch(`${import.meta.env.BASE_URL}maquette/scene.json`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Scene>;
      })
      .then((sc) => {
        if (!annule) setScene(preparer(sc));
      })
      .catch(() => {
        if (!annule) setErreur('La maquette n’a pas pu être chargée. Les vues Dessin et Original restent disponibles.');
      });
    return () => {
      annule = true;
    };
  }, []);

  /** Zone libre de l'écran (hors panneaux flottants), en px CSS. */
  const zoneLibre = useCallback(() => {
    const c = conteneurRef.current;
    const w = c?.clientWidth ?? 1,
      h = c?.clientHeight ?? 1;
    const m = rappels.current.getInsets();
    const lw = Math.max(w - m.left - m.right, 120),
      lh = Math.max(h - m.top - m.bottom, 120);
    return { w, h, x: m.left + lw / 2, y: m.top + lh / 2, lw, lh };
  }, []);

  const camera = useCallback(
    (e: Etat): Camera => {
      const { x, y } = zoneLibre();
      const sa = Math.sin(e.az),
        ca = Math.cos(e.az),
        se = Math.sin(e.el);
      return { az: e.az, el: e.el, k: e.k, tx: x - (e.px * sa - e.py * ca) * e.k, ty: y - (e.px * ca + e.py * sa) * se * e.k };
    },
    [zoneLibre],
  );

  /** Vue qui fait tenir la boîte [x0, y0, x1, y1] (m) dans la zone libre ; `part` = fraction occupée. */
  const cadrer = useCallback(
    (az: number, el: number, b: number[], part: number): Etat => {
      const { lw, lh } = zoneLibre();
      const essai: Camera = { az, el, k: 1, tx: 0, ty: 0 };
      const [a, bb, c, d] = emprise({ bornes: b } as Scene, essai);
      const k = Math.min(lw / (c - a), lh / (d - bb)) * part;
      // centre de la boîte projetée, ramené au sol
      const [px, py] = solSousEcran(essai, (a + c) / 2, (bb + d) / 2, 0);
      return { az, el, k, px, py };
    },
    [zoneLibre],
  );

  const invalider = useCallback(() => {
    sale.current = true;
  }, []);

  const animer = useCallback(
    (vers: Etat, duree = 650) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) duree = 0;
      const de = { ...etat.current };
      // plus court chemin angulaire
      let d = vers.az - de.az;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      anim.current = { de, vers: { ...vers, az: de.az + d }, debut: performance.now(), duree };
      invalider();
    },
    [invalider],
  );

  const vueGenerale = useCallback(() => {
    if (!scene) return null;
    const v = cadrer(AZ_DEPART, EL_DEPART, scene.scene.bornes, 0.95);
    kAjuste.current = v.k;
    return v;
  }, [cadrer, scene]);

  // --- Boucle de rendu à la demande
  useEffect(() => {
    if (!scene) return;
    const cv = canvasRef.current,
      conteneur = conteneurRef.current;
    if (!cv || !conteneur) return;
    const ctx = cv.getContext('2d');
    if (!ctx) {
      setErreur('La maquette n’est pas disponible sur cet appareil.');
      return;
    }
    const depart = vueGenerale();
    if (depart) etat.current = depart;
    const attente = enAttente.current;
    enAttente.current = null;
    if (attente) requestAnimationFrame(() => poignee.current?.focus(attente));
    let dpr = 1;
    let rapidePrecedent = false;
    const redimensionner = () => {
      const w = conteneur.clientWidth,
        h = conteneur.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      invalider();
    };
    redimensionner();
    const obs = new ResizeObserver(redimensionner);
    obs.observe(conteneur);

    const placerEtiquettes = (cam: Camera) => {
      const couche = etiquettesRef.current;
      if (!couche) return;
      const w = conteneur.clientWidth,
        h = conteneur.clientHeight;
      couche.querySelectorAll<HTMLElement>('[data-x]').forEach((el) => {
        const [sx, sy] = projeter(cam, Number(el.dataset.x), Number(el.dataset.y), Number(el.dataset.z));
        el.style.visibility = sx > -20 && sx < w + 20 && sy > -20 && sy < h + 20 ? 'visible' : 'hidden';
        el.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
      });
    };

    const boucle = (now: number) => {
      image.current = requestAnimationFrame(boucle);
      const a = anim.current;
      if (a) {
        const t = a.duree === 0 ? 1 : Math.min(1, (now - a.debut) / a.duree);
        const e = lisser(t);
        etat.current = {
          az: a.de.az + (a.vers.az - a.de.az) * e,
          el: a.de.el + (a.vers.el - a.de.el) * e,
          k: Math.exp(Math.log(a.de.k) + (Math.log(a.vers.k) - Math.log(a.de.k)) * e),
          px: a.de.px + (a.vers.px - a.de.px) * e,
          py: a.de.py + (a.vers.py - a.de.py) * e,
        };
        if (t >= 1) anim.current = null;
        sale.current = true;
      }
      const enMouvement = !!anim.current || now - interaction.current < 140;
      // une image soignée dès que le mouvement s'arrête
      if (!enMouvement && rapidePrecedent) sale.current = true;
      if (!sale.current) return;
      sale.current = false;
      rapidePrecedent = enMouvement;
      const r = rappels.current;
      const cam = camera(etat.current);
      dessinerScene(ctx, scene, cam, conteneur.clientWidth, conteneur.clientHeight, dpr, {
        rapide: enMouvement,
        zones: r.zonesRendu,
        survolId: r.hoveredId !== r.selectedId ? r.hoveredId : null,
        choixId: r.selectedId,
        correspondances: r.matchIds,
        libelles: true,
        accent: ACCENT,
        papier: PAPIER,
      });
      placerEtiquettes(cam);
    };
    image.current = requestAnimationFrame(boucle);
    // les libellés au sol utilisent Poppins : redessiner quand la police est prête
    document.fonts?.ready.then(invalider).catch(() => {});
    return () => {
      cancelAnimationFrame(image.current);
      obs.disconnect();
    };
  }, [scene, camera, invalider, vueGenerale]);

  useEffect(invalider, [selectedId, hoveredId, matchIds, zonesRendu, invalider]);

  // --- Gestes
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || !scene) return;
    const pointeurs = new Map<number, { x: number; y: number }>();
    let mode: 'orbite' | 'deplacer' | null = null;
    let bouge = false;
    let depart = { x: 0, y: 0 };
    let pincement: { d: number; cx: number; cy: number } | null = null;

    const local = (e: { clientX: number; clientY: number }) => {
      const r = cv.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const toucher = () => {
      interaction.current = performance.now();
      anim.current = null;
      sale.current = true;
    };
    const solSous = (x: number, y: number) => solSousEcran(camera(etat.current), x, y, 0);
    const deplacer = (dx: number, dy: number) => {
      const e = etat.current;
      const sa = Math.sin(e.az),
        ca = Math.cos(e.az),
        se = Math.sin(e.el);
      const a = dx / e.k,
        b = dy / (e.k * se);
      e.px -= a * sa + b * ca;
      e.py -= -a * ca + b * sa;
    };
    const zoomer = (x: number, y: number, f: number) => {
      const e = etat.current;
      const avant = solSous(x, y);
      e.k = Math.min(Math.max(e.k * f, kAjuste.current * 0.55), kAjuste.current * 16);
      const apres = solSous(x, y);
      e.px += avant[0] - apres[0];
      e.py += avant[1] - apres[1];
    };
    const viser = (x: number, y: number): string | null => {
      const r = rappels.current;
      const [X, Y] = solSous(x, y);
      const { ox, oy, kx, ky } = scene.scene.repere;
      const u = X * kx + ox,
        v = Y * ky + oy;
      // zones triées de la plus grande à la plus petite : la plus petite qui contient le point l'emporte
      for (let i = r.zones.length - 1; i >= 0; i--) {
        const z = r.zones[i];
        if (pointInPolygon([u, v], z.espace.contour)) return z.espace.id;
      }
      return null;
    };

    const bas = (e: PointerEvent) => {
      try {
        cv.setPointerCapture(e.pointerId);
      } catch {
        // pointeur déjà relâché : sans conséquence
      }
      const p = local(e);
      pointeurs.set(e.pointerId, p);
      if (pointeurs.size === 1) {
        mode = e.button === 2 || e.shiftKey ? 'deplacer' : 'orbite';
        bouge = false;
        depart = p;
      } else if (pointeurs.size === 2) {
        const [a, b] = [...pointeurs.values()];
        pincement = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
        bouge = true;
      }
    };
    const deplace = (e: PointerEvent) => {
      const p = local(e);
      const precedent = pointeurs.get(e.pointerId);
      if (!precedent) {
        if (e.pointerType === 'mouse') {
          const id = viser(p.x, p.y);
          if (id !== rappels.current.hoveredId) rappels.current.onZoneHover(id);
        }
        return;
      }
      pointeurs.set(e.pointerId, p);
      if (pointeurs.size === 2 && pincement) {
        const [a, b] = [...pointeurs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const cx = (a.x + b.x) / 2,
          cy = (a.y + b.y) / 2;
        deplacer(cx - pincement.cx, cy - pincement.cy);
        if (pincement.d > 0) zoomer(cx, cy, d / pincement.d);
        pincement = { d, cx, cy };
        toucher();
        return;
      }
      if (!bouge && Math.hypot(p.x - depart.x, p.y - depart.y) < 4) return;
      bouge = true;
      const dx = p.x - precedent.x,
        dy = p.y - precedent.y;
      if (mode === 'deplacer') deplacer(dx, dy);
      else {
        const s = etat.current;
        s.az += dx * 0.008;
        s.el = Math.min(Math.max(s.el + dy * 0.005, EL_MIN), EL_MAX);
      }
      toucher();
    };
    const haut = (e: PointerEvent) => {
      const p = pointeurs.get(e.pointerId);
      pointeurs.delete(e.pointerId);
      if (pointeurs.size < 2) pincement = null;
      if (pointeurs.size === 0) {
        if (!bouge && p && e.type === 'pointerup' && e.button !== 2) {
          const id = viser(p.x, p.y);
          if (id) rappels.current.onZoneClick(id);
          else rappels.current.onBackgroundClick();
        }
        mode = null;
      }
    };
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      zoomer(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
      toucher();
    };
    const double = (e: MouseEvent) => {
      const p = local(e);
      const s = { ...etat.current };
      const avant = solSous(p.x, p.y);
      const vers = { ...s, k: Math.min(s.k * 2, kAjuste.current * 16) };
      // garder le point visé sous le curseur
      const cam = camera(vers);
      const apres = solSousEcran(cam, p.x, p.y, 0);
      vers.px += avant[0] - apres[0];
      vers.py += avant[1] - apres[1];
      animer(vers, 320);
    };
    const quitter = () => {
      if (rappels.current.hoveredId) rappels.current.onZoneHover(null);
    };
    const menu = (e: Event) => e.preventDefault();
    cv.addEventListener('pointerdown', bas);
    cv.addEventListener('pointermove', deplace);
    cv.addEventListener('pointerup', haut);
    cv.addEventListener('pointercancel', haut);
    cv.addEventListener('pointerleave', quitter);
    cv.addEventListener('wheel', molette, { passive: false });
    cv.addEventListener('dblclick', double);
    cv.addEventListener('contextmenu', menu);
    return () => {
      cv.removeEventListener('pointerdown', bas);
      cv.removeEventListener('pointermove', deplace);
      cv.removeEventListener('pointerup', haut);
      cv.removeEventListener('pointercancel', haut);
      cv.removeEventListener('pointerleave', quitter);
      cv.removeEventListener('wheel', molette);
      cv.removeEventListener('dblclick', double);
      cv.removeEventListener('contextmenu', menu);
    };
  }, [scene, camera, animer]);

  const poignee = useRef<PlanMaquetteHandle | null>(null);
  useImperativeHandle(
    ref,
    () => (poignee.current = {
      zoomBy: (f) => {
        const s = etat.current;
        animer({ ...s, k: Math.min(Math.max(s.k * f, kAjuste.current * 0.55), kAjuste.current * 16) }, 280);
      },
      reset: () => {
        const v = vueGenerale();
        if (v) animer(v);
      },
      rotate: (sens) => {
        const s = etat.current;
        // aligner sur le huitième de tour le plus proche
        const pas = Math.PI / 4;
        const cible = (Math.round((s.az - AZ_DEPART) / pas) - sens * 2) * pas + AZ_DEPART;
        animer({ ...s, az: cible }, 600);
      },
      focus: (zone) => {
        const sc = scene?.scene;
        if (!sc) {
          enAttente.current = zone;
          return;
        }
        const { ox, oy, kx, ky } = sc.repere;
        const xs = zone.espace.contour.map(([u]) => (u - ox) / kx);
        const ys = zone.espace.contour.map(([, v]) => (v - oy) / ky);
        const s = etat.current;
        const v = cadrer(s.az, s.el, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], 0.5);
        v.k = Math.min(v.k, kAjuste.current * 6);
        animer(v);
      },
    }),
    [animer, cadrer, scene, vueGenerale],
  );

  // --- Étiquettes HTML (nom de l'espace survolé ou choisi)
  const zoneRendu = (id: string | null) => (id ? zonesRendu.find((z) => z.id === id) : undefined);
  const etiquette = (id: string | null, classe: string) => {
    const z = zoneRendu(id);
    const geom = id ? zones.find((g) => g.espace.id === id) : undefined;
    if (!z || !geom) return null;
    const xs = z.contour.map((p) => p[0]),
      ys = z.contour.map((p) => p[1]);
    return (
      <div
        key={`${classe}-${id}`}
        className={`zone-tag ${classe}`}
        data-x={(Math.min(...xs) + Math.max(...xs)) / 2}
        data-y={(Math.min(...ys) + Math.max(...ys)) / 2}
        data-z={1.6}
        style={{ '--zone-color': colorOf(geom) } as CSSProperties}
      >
        <span className="dot" />
        <span className="tag-text">{geom.espace.nom}</span>
      </div>
    );
  };

  return (
    <div className="plan3d maquette" ref={conteneurRef} data-no-pan>
      {erreur ? (
        <p className="plan3d-erreur">{erreur}</p>
      ) : (
        <>
          <canvas ref={canvasRef} role="img" aria-label="Maquette axonométrique illustrée du plateau, terrasse comprise" />
          {!scene && <p className="plan3d-chargement">Chargement de la maquette…</p>}
          <div className="plan3d-etiquettes" ref={etiquettesRef}>
            {etiquette(selectedId, 'is-selected')}
            {isDesktop && hoveredId !== selectedId && etiquette(hoveredId, '')}
          </div>
        </>
      )}

      <details className="plan3d-legende">
        <summary>
          Maquette illustrée <span className="plan3d-statut">à valider</span>
          <span className="plan3d-resume">Légende et points à confirmer</span>
        </summary>
        <p className="plan3d-note">
          Plateau R6, terrasse comprise, d’après le plan d’implantation (indice 8 du 16-10-2026). Les murs qui masquent une pièce se recoupent selon l’angle de vue.
        </p>
        <p className="plan3d-sous-titre">Architecture</p>
        <ul className="plan3d-choix">
          {ARCHITECTURE.map((p) => (
            <li key={p.titre}>
              <strong>{p.titre}</strong> <span className="plan3d-statut">[à confirmer]</span> — {p.texte}
            </li>
          ))}
        </ul>
        <p className="plan3d-sous-titre">Aménagement</p>
        <ul className="plan3d-choix">
          {AMENAGEMENT.map((p) => (
            <li key={p.titre}>
              <strong>{p.titre}</strong> <span className="plan3d-statut">[à confirmer]</span> — {p.texte}
            </li>
          ))}
        </ul>
        <p className="plan3d-aide">
          {isDesktop
            ? 'Glisser : pivoter et incliner · Molette : zoomer · Clic droit ou Maj + glisser : déplacer · Double-clic : zoomer'
            : 'Un doigt : pivoter et incliner · Deux doigts : zoomer et déplacer'}
        </p>
      </details>
    </div>
  );
}
