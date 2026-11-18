/**
 * Aperçu 3D en axonométrie (caméra orthographique), style dessin d'architecte,
 * sans plafond. Chargé à la demande : three.js n'alourdit pas la vue 2D.
 *
 * Gestes : glisser pour faire pivoter et incliner, molette ou pincement pour
 * zoomer, clic droit ou deux doigts pour déplacer le cadrage.
 */
import { useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type Ref } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Insets } from '../hooks/usePanZoom';
import { pointInPolygon } from '../lib/geometry';
import type { ZoneGeom } from '../lib/zones';
import { CHOIX_SCHEMATIQUES, POINTS_A_CONFIRMER } from './aConfirmer';
import {
  construireMaquette,
  lirePalette,
  SECTEUR_APERCU,
  versMonde,
  versPlan,
  type Maquette,
  type Palette,
} from './scene';

export interface Plan3DHandle {
  zoomBy: (factor: number) => void;
  /** Revient au cadrage initial, de trois quarts. */
  reset: () => void;
  focus: (zone: ZoneGeom) => void;
}

interface Plan3DProps {
  ref?: Ref<Plan3DHandle>;
  zones: ZoneGeom[];
  colorOf: (zone: ZoneGeom) => string;
  selectedId: string | null;
  hoveredId: string | null;
  matchIds: Set<string> | null;
  onZoneClick: (id: string) => void;
  onZoneHover: (id: string | null) => void;
  onBackgroundClick: () => void;
  getInsets: () => Insets;
  /** Image du plan PDF, superposable au sol pour comparer le tracé ; `null` : option absente. */
  calqueUrl: string | null;
  isDesktop: boolean;
}

/** Axonométrie de trois quarts depuis le sud-ouest (inclinaison proche de l'isométrie). */
const POLAIRE = THREE.MathUtils.degToRad(55);
const AZIMUT = THREE.MathUtils.degToRad(-40);
/** Hauteur du cadre visible à zoom 1, en mètres. */
const CADRE = 30;
const DISTANCE = 80;

type Vue = { position: THREE.Vector3; cible: THREE.Vector3; zoom: number };

const melanger = (a: string, b: string, t: number) => new THREE.Color(a).lerp(new THREE.Color(b), t);

export default function Plan3D({
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
  calqueUrl,
  isDesktop,
}: Plan3DProps) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const etiquettesRef = useRef<HTMLDivElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Sur téléphone, les points à confirmer encombrent la vue : ils s'affichent depuis la légende.
  const [afficherDoutes, setAfficherDoutes] = useState(isDesktop);
  const [afficherCalque, setAfficherCalque] = useState(false);
  const [douteOuvert, setDouteOuvert] = useState<string | null>(null);
  const [pret, setPret] = useState(false);

  const moteur = useRef<{
    renderer: THREE.WebGLRenderer;
    camera: THREE.OrthographicCamera;
    controls: OrbitControls;
    maquette: Maquette | null;
    palette: Palette;
    calque: THREE.Mesh | null;
    invalider: () => void;
    animer: (vers: Vue, duree?: number) => void;
    cadrer: (points: THREE.Vector3[], cible: THREE.Vector3, part: number, direction?: THREE.Vector3) => Vue;
  } | null>(null);
  const rappels = useRef({ onZoneClick, onZoneHover, onBackgroundClick, getInsets, zones, selectedId });
  rappels.current = { onZoneClick, onZoneHover, onBackgroundClick, getInsets, zones, selectedId };

  // --- Moteur : rendu, caméra orthographique, contrôles, rendu à la demande ---------
  useEffect(() => {
    const conteneur = conteneurRef.current;
    if (!conteneur) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setErreur("La vue 3D n'est pas disponible sur cet appareil (WebGL désactivé).");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-label', 'Aperçu 3D du plan');
    renderer.domElement.setAttribute('role', 'img');
    conteneur.prepend(renderer.domElement);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.screenSpacePanning = false;
    controls.zoomToCursor = true;
    controls.zoomSpeed = 1.4;
    controls.minPolarAngle = THREE.MathUtils.degToRad(8);
    controls.maxPolarAngle = THREE.MathUtils.degToRad(80);

    const palette = lirePalette();
    let aRendre = true;
    let animation: { de: Vue; vers: Vue; debut: number; duree: number } | null = null;
    const invalider = () => {
      aRendre = true;
    };

    /** Taille du cadre et décalage de projection pour centrer la scène hors des panneaux. */
    const appliquerCadre = () => {
      const { clientWidth: w, clientHeight: h } = conteneur;
      const aspect = w / h;
      Object.assign(camera, { left: (-CADRE * aspect) / 2, right: (CADRE * aspect) / 2, top: CADRE / 2, bottom: -CADRE / 2 });
      const m = rappels.current.getInsets();
      camera.setViewOffset(w, h, -(m.left - m.right) / 2, -(m.top - m.bottom) / 2, w, h);
      camera.updateProjectionMatrix();
      return { w, h, m };
    };

    /** Vue qui fait tenir `points` dans la partie libre de l'écran (`part` = fraction occupée). */
    const cadrer = (points: THREE.Vector3[], cible: THREE.Vector3, part: number, direction?: THREE.Vector3): Vue => {
      const { w, h, m } = appliquerCadre();
      const dir = direction ?? camera.position.clone().sub(controls.target).normalize();
      const essai = new THREE.OrthographicCamera();
      essai.position.copy(cible).addScaledVector(dir, DISTANCE);
      essai.lookAt(cible);
      essai.updateMatrixWorld();
      let ex = 0;
      let ey = 0;
      for (const p of points) {
        const q = p.clone().applyMatrix4(essai.matrixWorldInverse);
        ex = Math.max(ex, Math.abs(q.x) * 2);
        ey = Math.max(ey, Math.abs(q.y) * 2);
      }
      const libreL = Math.max(w - m.left - m.right, 120) / w;
      const libreH = Math.max(h - m.top - m.bottom, 120) / h;
      const zoom = Math.min((CADRE * (w / h) * libreL) / ex, (CADRE * libreH) / ey) * part;
      return { cible, position: cible.clone().addScaledVector(dir, DISTANCE), zoom };
    };

    const animer = (vers: Vue, duree = 650) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) duree = 0;
      animation = {
        de: { position: camera.position.clone(), cible: controls.target.clone(), zoom: camera.zoom },
        vers,
        debut: performance.now(),
        duree,
      };
      invalider();
    };

    const redimensionner = () => {
      const { clientWidth: w, clientHeight: h } = conteneur;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      appliquerCadre();
      moteur.current?.maquette?.traitsEpais.forEach((mat) => mat.resolution.set(w, h));
      invalider();
    };
    const observateur = new ResizeObserver(redimensionner);
    observateur.observe(conteneur);

    // Étiquettes HTML posées sur la maquette (nom de l'espace, points à confirmer)
    const v = new THREE.Vector3();
    const placerEtiquettes = () => {
      const couche = etiquettesRef.current;
      if (!couche) return;
      const { clientWidth: w, clientHeight: h } = conteneur;
      couche.querySelectorAll<HTMLElement>('[data-x]').forEach((el) => {
        v.set(Number(el.dataset.x), Number(el.dataset.y), Number(el.dataset.z)).project(camera);
        const visible = Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
        el.style.visibility = visible ? 'visible' : 'hidden';
        el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
      });
    };

    let frame = 0;
    let derniereOrientation = new THREE.Vector3();
    const boucle = (now: number) => {
      frame = requestAnimationFrame(boucle);
      if (animation) {
        const t = animation.duree === 0 ? 1 : Math.min(1, (now - animation.debut) / animation.duree);
        const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        camera.position.lerpVectors(animation.de.position, animation.vers.position, e);
        controls.target.lerpVectors(animation.de.cible, animation.vers.cible, e);
        camera.zoom = Math.exp(THREE.MathUtils.lerp(Math.log(animation.de.zoom), Math.log(animation.vers.zoom), e));
        camera.updateProjectionMatrix();
        if (t >= 1) animation = null;
        aRendre = true;
      }
      if (controls.update() || aRendre) {
        aRendre = false;
        const maquette = moteur.current?.maquette;
        if (maquette) {
          // Coupe recalculée quand l'orientation ou la sélection change
          const versCamera = camera.position.clone().sub(controls.target).normalize();
          const selection = rappels.current.selectedId;
          if (versCamera.distanceToSquared(derniereOrientation) > 1e-6 || maquette.scene.userData.selection !== selection) {
            derniereOrientation = versCamera;
            maquette.scene.userData.selection = selection;
            maquette.decouper(versCamera, selection);
          }
          renderer.render(maquette.scene, camera);
        }
        placerEtiquettes();
      }
    };
    controls.addEventListener('start', () => {
      animation = null;
    });

    // Clic (sans glisser) : sélection ; survol à la souris : mise en évidence légère.
    const rayon = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const viser = (event: PointerEvent): string | null => {
      const maquette = moteur.current?.maquette;
      if (!maquette) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      rayon.setFromCamera(ndc, camera);
      const cibles = [
        ...maquette.sols.values(),
        ...maquette.obstacles.filter((o) => !o.userData.fantome),
        ...maquette.murs.filter((m) => !m.mesh.userData.fantome).map((m) => m.mesh),
      ];
      const touche = rayon.intersectObjects(cibles, false)[0];
      if (!touche) return null;
      if (touche.object.userData.zoneId) return touche.object.userData.zoneId as string;
      // Meuble ou mur : on retient la plus petite zone qui contient le point touché.
      const point = versPlan(touche.point);
      const aires = new Map(rappels.current.zones.map((z) => [z.espace.id, z.area]));
      const candidates = [...maquette.contours.entries()]
        .filter(([, c]) => pointInPolygon(point, c.contour))
        .sort(([a], [b]) => (aires.get(a) ?? 0) - (aires.get(b) ?? 0));
      return candidates[0]?.[0] ?? null;
    };
    let appui: { x: number; y: number; t: number } | null = null;
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => {
      appui = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    el.addEventListener('pointerup', (e) => {
      if (!appui) return;
      const bouge = Math.hypot(e.clientX - appui.x, e.clientY - appui.y);
      const court = performance.now() - appui.t < 600;
      appui = null;
      if (bouge > 6 || !court || e.button > 0) return;
      const id = viser(e);
      if (id) rappels.current.onZoneClick(id);
      else rappels.current.onBackgroundClick();
    });
    let survol: string | null = null;
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      const id = viser(e);
      el.style.cursor = id ? 'pointer' : 'grab';
      if (id !== survol) {
        survol = id;
        rappels.current.onZoneHover(id);
      }
    });
    el.addEventListener('pointerleave', () => {
      if (survol) rappels.current.onZoneHover(null);
      survol = null;
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    moteur.current = { renderer, camera, controls, maquette: null, palette, calque: null, invalider, animer, cadrer };
    redimensionner();
    frame = requestAnimationFrame(boucle);

    return () => {
      cancelAnimationFrame(frame);
      observateur.disconnect();
      controls.dispose();
      moteur.current?.maquette?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      moteur.current = null;
    };
  }, []);

  /** Cadrage initial : tout le secteur, de trois quarts. */
  const vueInitiale = () => {
    const m = moteur.current;
    if (!m?.maquette) return null;
    const cible = versMonde([(SECTEUR_APERCU.x0 + SECTEUR_APERCU.x1) / 2, (SECTEUR_APERCU.y0 + SECTEUR_APERCU.y1) / 2], 0.8);
    return m.cadrer(m.maquette.emprise, cible, 0.94, new THREE.Vector3().setFromSphericalCoords(1, POLAIRE, AZIMUT));
  };

  // --- Maquette : reconstruite si les contours des zones changent -------------------
  useEffect(() => {
    const m = moteur.current;
    if (!m) return;
    m.maquette?.dispose();
    const maquette = construireMaquette(zones, m.palette);
    m.maquette = maquette;
    const conteneur = conteneurRef.current;
    if (conteneur) maquette.traitsEpais.forEach((mat) => mat.resolution.set(conteneur.clientWidth, conteneur.clientHeight));

    // Calque du PDF sur le sol du secteur (multiplié : le blanc ne masque rien).
    let liberer = () => {};
    if (calqueUrl) {
      const texture = new THREE.TextureLoader().load(calqueUrl, () => m.invalider());
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = m.renderer.capabilities.getMaxAnisotropy();
      const s = SECTEUR_APERCU;
      texture.repeat.set((s.x1 - s.x0) / 624, (s.y1 - s.y0) / 625);
      texture.offset.set(s.x0 / 624, 1 - s.y1 / 625);
      const a = versMonde([s.x0, s.y0]);
      const b = versMonde([s.x1, s.y1]);
      const calque = new THREE.Mesh(
        new THREE.PlaneGeometry(b.x - a.x, b.z - a.z).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          premultipliedAlpha: true,
          blending: THREE.MultiplyBlending,
          depthWrite: false,
        }),
      );
      calque.position.set((a.x + b.x) / 2, 0.07, (a.z + b.z) / 2);
      calque.renderOrder = 5;
      calque.visible = false;
      maquette.scene.add(calque);
      m.calque = calque;
      liberer = () => {
        texture.dispose();
        calque.geometry.dispose();
        (calque.material as THREE.Material).dispose();
      };
    } else m.calque = null;

    if (!pret) {
      const vue = vueInitiale();
      if (vue) {
        m.camera.position.copy(vue.position);
        m.controls.target.copy(vue.cible);
        m.camera.zoom = vue.zoom;
        m.controls.minZoom = vue.zoom * 0.6;
        m.controls.maxZoom = vue.zoom * 12;
        m.camera.updateProjectionMatrix();
        m.controls.update();
      }
      setPret(true);
    }
    m.invalider();
    return liberer;
    // `pret` ne sert qu'au premier cadrage.
  }, [zones, calqueUrl]);

  useEffect(() => {
    const m = moteur.current;
    if (m?.calque) {
      m.calque.visible = afficherCalque;
      m.invalider();
    }
  }, [afficherCalque, zones]);

  // --- Couleurs des sols : recherche, survol, sélection (couleurs Ocellis) -----------
  useEffect(() => {
    const m = moteur.current;
    if (!m?.maquette) return;
    for (const zone of zones) {
      const sol = m.maquette.sols.get(zone.espace.id);
      if (!sol) continue;
      const base = sol.userData.base as string;
      const teinte = colorOf(zone);
      const id = zone.espace.id;
      const couleur =
        id === selectedId
          ? melanger(base, teinte, 0.42)
          : matchIds?.has(id)
            ? melanger(base, teinte, 0.3)
            : id === hoveredId
              ? melanger(base, teinte, 0.16)
              : new THREE.Color(base);
      sol.material.color.copy(couleur);
    }
    m.maquette.surligner(selectedId);
    m.invalider();
  }, [zones, colorOf, selectedId, hoveredId, matchIds, pret]);

  // --- Commandes exposées à l'application (boutons, raccourcis, sélection) -----------
  useImperativeHandle(
    ref,
    () => ({
      zoomBy: (facteur) => {
        const m = moteur.current;
        if (!m) return;
        const zoom = THREE.MathUtils.clamp(m.camera.zoom * facteur, m.controls.minZoom, m.controls.maxZoom);
        m.animer({ position: m.camera.position.clone(), cible: m.controls.target.clone(), zoom }, 280);
      },
      reset: () => {
        const vue = vueInitiale();
        if (vue) moteur.current?.animer(vue);
      },
      focus: (zone) => {
        const m = moteur.current;
        const entree = m?.maquette?.contours.get(zone.espace.id);
        if (!m || !entree) return;
        const points = entree.contour.flatMap((p) => [versMonde(p, 0), versMonde(p, 2.4)]);
        const vue = m.cadrer(points, entree.etiquette.clone().setY(0.8), 0.45);
        vue.zoom = THREE.MathUtils.clamp(vue.zoom, m.controls.minZoom, m.controls.maxZoom);
        m.animer(vue);
      },
    }),
    // vueInitiale lit le moteur au moment de l'appel.
    [],
  );

  // Les étiquettes changent : on demande un rendu pour les replacer aussitôt.
  useEffect(() => moteur.current?.invalider(), [selectedId, hoveredId, afficherDoutes, douteOuvert, pret]);

  const contours = pret ? moteur.current?.maquette?.contours : undefined;
  const etiquette = (zone: ZoneGeom | undefined, classe: string) => {
    const p = zone && contours?.get(zone.espace.id)?.etiquette;
    if (!zone || !p) return null;
    return (
      <div
        key={`${classe}-${zone.espace.id}`}
        className={`zone-tag ${classe}`}
        data-x={p.x}
        data-y={p.y}
        data-z={p.z}
        style={{ '--zone-color': colorOf(zone) } as CSSProperties}
      >
        <span className="dot" />
        <span className="tag-text">{zone.espace.nom}</span>
      </div>
    );
  };
  const selection = zones.find((z) => z.espace.id === selectedId);
  const survolee = hoveredId !== selectedId ? zones.find((z) => z.espace.id === hoveredId) : undefined;
  const horsSecteur = pret && selection && !contours?.has(selection.espace.id);

  return (
    <div className="plan3d" ref={conteneurRef} data-no-pan>
      {erreur ? (
        <p className="plan3d-erreur">{erreur}</p>
      ) : (
        <div className="plan3d-etiquettes" ref={etiquettesRef}>
          {etiquette(selection, 'is-selected')}
          {isDesktop && etiquette(survolee, '')}
          {afficherDoutes &&
            POINTS_A_CONFIRMER.map((point) => {
              const p = versMonde(point.position, 2.9);
              const ouvert = douteOuvert === point.id;
              return (
                <button
                  type="button"
                  key={point.id}
                  className={`a-confirmer${ouvert ? ' is-open' : ''}`}
                  data-x={p.x}
                  data-y={p.y}
                  data-z={p.z}
                  onClick={() => setDouteOuvert((id) => (id === point.id ? null : point.id))}
                  aria-expanded={ouvert}
                  title={point.texte}
                >
                  <span className="a-confirmer-titre">
                    {point.titre} <span className="a-confirmer-badge">[à confirmer]</span>
                  </span>
                  {ouvert && <span className="a-confirmer-texte">{point.texte}</span>}
                </button>
              );
            })}
        </div>
      )}

      {horsSecteur && (
        <p className="plan3d-hors-secteur" role="status">
          « {selection.espace.nom} » est en dehors du secteur de l'aperçu 3D. Il reste visible en vue Dessin.
        </p>
      )}

      <details className="plan3d-legende">
        <summary>
          Aperçu 3D · {SECTEUR_APERCU.nom.toLowerCase()} <span className="plan3d-statut">à valider</span>
          <span className="plan3d-resume">Légende et choix schématiques</span>
        </summary>
        <p className="plan3d-note">{SECTEUR_APERCU.description}.</p>
        <ul>
          <li>
            <span className="cle cle-mur" /> Murs et cloisons (arase noire)
          </li>
          <li>
            <span className="cle cle-vitre" /> Cloisons vitrées
          </li>
          <li>
            <span className="cle cle-circulation" /> Circulations
          </li>
          <li>
            <span className="cle cle-selection" /> Espace sélectionné
          </li>
        </ul>
        <p className="plan3d-sous-titre">Choix schématiques</p>
        <ul className="plan3d-choix">
          {CHOIX_SCHEMATIQUES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        {calqueUrl && (
          <label className="checkbox">
            <input type="checkbox" checked={afficherCalque} onChange={(e) => setAfficherCalque(e.target.checked)} />
            Superposer le plan PDF au sol
          </label>
        )}
        <label className="checkbox">
          <input type="checkbox" checked={afficherDoutes} onChange={(e) => setAfficherDoutes(e.target.checked)} />
          Afficher les points [à confirmer]
        </label>
        <p className="plan3d-aide">
          {isDesktop
            ? 'Glisser : pivoter et incliner · Molette : zoomer · Clic droit : déplacer'
            : 'Un doigt : pivoter et incliner · Deux doigts : zoomer et déplacer'}
        </p>
      </details>
    </div>
  );
}
