import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { EditorLayer } from './components/editor/EditorLayer';
import { EditorPanel } from './components/editor/EditorPanel';
import { PenIcon } from './components/Icons';
import { MapControls } from './components/MapControls';
import { PlanView, type PlanVariant } from './components/PlanView';
import { Sidebar } from './components/Sidebar';
import { ZoneDetails } from './components/ZoneDetails';
import { ZoneTags } from './components/ZoneTags';
import { useEditableConfig } from './hooks/useEditableConfig';
import { useMediaQuery } from './hooks/useMediaQuery';
import { usePanZoom, type Insets } from './hooks/usePanZoom';
import { usePlanEditor } from './hooks/usePlanEditor';
import { searchEspaces } from './lib/search';
import { buildZones, type ZoneGeom } from './lib/zones';
import PlanMaquette, { type PlanMaquetteHandle } from './maquette/PlanMaquette';
import type { CategorieId } from './types';

/** L'éditeur de zones n'est proposé qu'avec `?edition` dans l'adresse. */
const editionActivee = new URLSearchParams(window.location.search).has('edition');

function idFromHash(): string | null {
  // Format actuel « #<identifiant> » ; l'ancien « #espace=<identifiant> » reste accepté.
  const hash = decodeURIComponent(window.location.hash.slice(1));
  return hash ? hash.replace(/^espace=/, '') : null;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]') !== null;

type FocusMode = 'fly' | 'reveal';

const VARIANT_KEY = 'ocellis-plan:rendu-v2';
/** Pas de la grille de fond, en unités du plan (le plan mesure 12 carreaux de large). */
const GRID_STEP = 52;

function readVariant(): PlanVariant {
  try {
    return localStorage.getItem(VARIANT_KEY) === 'original' ? 'original' : 'dessin';
  } catch {
    return 'dessin';
  }
}

export default function App() {
  const store = useEditableConfig(editionActivee);
  const { config } = store;
  const { plan, categories } = config;
  const isDesktop = useMediaQuery('(min-width: 900px)');

  const [editorOpen, setEditorOpen] = useState(editionActivee);
  // Un lien partagé (#<identifiant>) ouvre directement la fiche correspondante.
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = idFromHash();
    return id && config.espaces.some((e) => e.id === id) ? id : null;
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<Set<CategorieId>>(() => new Set());
  // La maquette illustrée est la vue d'ouverture ; l'éditeur de zones s'ouvre sur le plan 2D.
  const [variant, setVariant] = useState<PlanVariant>(() => (editionActivee ? readVariant() : '3d'));

  const changeVariant = useCallback((next: PlanVariant) => {
    setVariant(next);
    // La maquette reste la vue d'ouverture : seul le choix Dessin / Original est mémorisé.
    if (next === '3d') return;
    try {
      localStorage.setItem(VARIANT_KEY, next);
    } catch {
      // Préférence non mémorisée (navigation privée…) : sans conséquence.
    }
  }, []);

  const mapRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const editorRef = useRef<HTMLElement>(null);
  const maquetteRef = useRef<PlanMaquetteHandle>(null);
  const is3d = variant === '3d' && !editorOpen;

  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const zones = useMemo(() => buildZones(config.espaces), [config.espaces]);
  const zonesById = useMemo(() => new Map(zones.map((z) => [z.espace.id, z])), [zones]);
  const colorOf = useCallback(
    (zone: ZoneGeom) => categoriesById.get(zone.espace.categorie)?.couleur ?? '#7B8794',
    [categoriesById],
  );
  const selected = selectedId ? (zonesById.get(selectedId) ?? null) : null;
  const hovered = hoveredId ? (zonesById.get(hoveredId) ?? null) : null;

  // --- Recherche et filtres ---------------------------------------------------------

  const results = useMemo(() => {
    const visibles =
      activeCategories.size === 0 ? config.espaces : config.espaces.filter((e) => activeCategories.has(e.categorie));
    return searchEspaces(visibles, categories, query);
  }, [activeCategories, categories, config.espaces, query]);
  const filtering = query.trim() !== '' || activeCategories.size > 0;
  const matchIds = useMemo(() => (filtering ? new Set(results.map((e) => e.id)) : null), [filtering, results]);
  const counts = useMemo(() => {
    const map = new Map<CategorieId, number>();
    for (const espace of config.espaces) map.set(espace.categorie, (map.get(espace.categorie) ?? 0) + 1);
    return map;
  }, [config.espaces]);

  const toggleCategory = useCallback((id: CategorieId) => {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setActiveCategories(new Set());
    setQuery('');
  }, []);

  // --- Vue (zoom et déplacement) ------------------------------------------------------

  /** Place occupée par les panneaux flottants, pour cadrer le plan dans la partie visible. */
  const getInsets = useCallback((): Insets => {
    const margin = 16;
    const sidebar = editorOpen ? null : sidebarRef.current;
    const panel = editorOpen ? editorRef.current : selectedId ? detailsRef.current : null;
    if (isDesktop) {
      return {
        top: margin,
        bottom: margin,
        left: sidebar ? sidebar.offsetLeft + sidebar.offsetWidth + margin : margin,
        right: panel ? panel.offsetWidth + margin * 2 : margin,
      };
    }
    const filters = sidebar?.querySelector<HTMLElement>('.filters');
    return {
      top: sidebar && filters ? sidebar.offsetTop + filters.offsetTop + filters.offsetHeight + 8 : margin,
      bottom: panel ? panel.offsetHeight + margin : 72,
      left: 8,
      right: 8,
    };
  }, [editorOpen, isDesktop, selectedId]);

  const panZoom = usePanZoom(mapRef, { contentWidth: plan.largeur, contentHeight: plan.hauteur, getInsets });
  const { focusBox, reveal, fitAll, zoomBy, size } = panZoom;

  // --- Sélection ----------------------------------------------------------------------

  const pendingFocus = useRef<FocusMode | null>(selectedId ? 'fly' : null);
  const select = useCallback((id: string | null, focus: FocusMode | null = null) => {
    pendingFocus.current = id ? focus : null;
    setSelectedId(id);
  }, []);

  // Le recadrage attend que le plan soit mesuré et que le panneau de détails soit rendu,
  // car sa taille compte dans les marges.
  const ready = size.width > 0;
  useEffect(() => {
    const focus = pendingFocus.current;
    if (!ready || !selected || !focus) return;
    pendingFocus.current = null;
    if (is3d) {
      if (focus === 'fly') maquetteRef.current?.focus(selected);
    } else if (focus === 'fly') focusBox(selected.box);
    else reveal(selected.box);
  }, [ready, selected, focusBox, reveal, is3d]);

  // Commandes de vue : elles pilotent la caméra 3D ou le plan 2D selon la vue affichée.
  const zoomView = useCallback(
    (factor: number) => (is3d ? maquetteRef.current?.zoomBy(factor) : zoomBy(factor)),
    [is3d, zoomBy],
  );
  const resetView = useCallback(() => (is3d ? maquetteRef.current?.reset() : fitAll()), [is3d, fitAll]);

  // Lien partageable : #<identifiant>
  useEffect(() => {
    const hash = selectedId ? `#${encodeURIComponent(selectedId)}` : '';
    if (window.location.hash !== hash) {
      history.replaceState(null, '', hash || `${window.location.pathname}${window.location.search}`);
    }
  }, [selectedId]);

  useEffect(() => {
    const openFromHash = () => {
      const id = idFromHash();
      if (id && zonesById.has(id)) select(id, 'fly');
    };
    window.addEventListener('hashchange', openFromHash);
    return () => window.removeEventListener('hashchange', openFromHash);
  }, [select, zonesById]);

  const editor = usePlanEditor({
    store,
    active: editorOpen,
    scale: panZoom.view.k,
    screenToPlan: panZoom.screenToPlan,
    selectedId,
    setSelectedId: select,
  });

  const onZoneClick = useCallback(
    (id: string) => {
      if (editorOpen) return select(id);
      if (is3d) return select(id);
      // Sur mobile, une zone trop petite à l'écran est agrandie ; sinon la vue bouge le moins possible.
      const zone = zonesById.get(id);
      const k = panZoom.view.k;
      const small = zone && Math.max(zone.box.maxX - zone.box.minX, zone.box.maxY - zone.box.minY) * k < 90;
      select(id, !isDesktop && small ? 'fly' : 'reveal');
    },
    [editorOpen, is3d, isDesktop, panZoom.view.k, select, zonesById],
  );

  // Un clic sur le fond du plan (hors zone et hors poignée) ferme la sélection.
  const onMapClick = (event: MouseEvent) => {
    const target = event.target as Element;
    if (editor.drawing || target.closest('[data-zone-id], [data-no-pan]')) return;
    select(null);
  };

  // --- Raccourcis clavier communs -----------------------------------------------------

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === '+' || event.key === '=') zoomView(1.5);
      else if (event.key === '-' || event.key === '_') zoomView(1 / 1.5);
      else if (event.key === '0') resetView();
      else if (event.key === 'Escape' && !editorOpen) select(null);
      else if (event.key === '/' && !editorOpen) {
        event.preventDefault();
        sidebarRef.current?.querySelector('input')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editorOpen, resetView, select, zoomView]);

  const appClasses = ['app'];
  if (editorOpen) appClasses.push('is-editing');
  if (selected && !editorOpen) appClasses.push('has-details');
  if (is3d) appClasses.push('is-3d');

  return (
    <div className={appClasses.join(' ')}>
      <main
        ref={mapRef}
        className="map"
        onClick={onMapClick}
        aria-label="Plan interactif"
        style={
          {
            '--grid-size': `${GRID_STEP * panZoom.view.k}px`,
            '--grid-x': `${panZoom.view.x}px`,
            '--grid-y': `${panZoom.view.y}px`,
          } as CSSProperties
        }
      >
        <PlanView
          plan={plan}
          view={panZoom.view}
          zones={zones}
          colorOf={colorOf}
          selectedId={selectedId}
          hoveredId={hoveredId}
          matchIds={editorOpen ? null : matchIds}
          variant={variant === '3d' ? 'dessin' : variant}
          editing={editorOpen}
          onZoneClick={onZoneClick}
          onZoneHover={setHoveredId}
          onZonePointerDown={editorOpen ? editor.onZonePointerDown : undefined}
          svgProps={
            editorOpen
              ? {
                  onPointerMove: editor.onPointerMove,
                  onPointerUp: editor.onPointerUp,
                  onPointerCancel: editor.onPointerUp,
                  onPointerLeave: editor.onPointerLeave,
                }
              : undefined
          }
        >
          {editorOpen && (
            <EditorLayer editor={editor} plan={plan} scale={panZoom.view.k} color={selected ? colorOf(selected) : '#010d2d'} />
          )}
        </PlanView>
        <ZoneTags
          view={panZoom.view}
          hovered={isDesktop && !editor.drawing ? hovered : null}
          selected={editorOpen ? null : selected}
          colorOf={colorOf}
        />
        {is3d && (
          <PlanMaquette
            ref={maquetteRef}
            zones={zones}
            colorOf={colorOf}
            selectedId={selectedId}
            hoveredId={hoveredId}
            matchIds={matchIds}
            onZoneClick={onZoneClick}
            onZoneHover={setHoveredId}
            onBackgroundClick={() => select(null)}
            getInsets={getInsets}
            isDesktop={isDesktop}
          />
        )}
      </main>

      {!editorOpen && (
        <Sidebar
          panelRef={sidebarRef}
          plan={plan}
          categories={categories}
          counts={counts}
          results={results}
          total={config.espaces.length}
          query={query}
          onQueryChange={setQuery}
          activeCategories={activeCategories}
          onToggleCategory={toggleCategory}
          onClearFilters={clearFilters}
          selectedId={selectedId}
          onSelect={(id) => select(id, 'fly')}
          onHover={setHoveredId}
          isDesktop={isDesktop}
          maquette={is3d}
        />
      )}

      {!editorOpen && selected && (
        <ZoneDetails
          panelRef={detailsRef}
          espace={selected.espace}
          categorie={categoriesById.get(selected.espace.categorie)}
          onClose={() => select(null)}
          onFocus={() => (is3d ? maquetteRef.current?.focus(selected) : focusBox(selected.box))}
        />
      )}

      <MapControls
        onZoomIn={() => zoomView(1.5)}
        onZoomOut={() => zoomView(1 / 1.5)}
        onReset={resetView}
        onRotate={is3d ? (sens) => maquetteRef.current?.rotate(sens) : undefined}
        variant={editorOpen && variant === '3d' ? 'dessin' : variant}
        onVariantChange={changeVariant}
        allow3d={!editorOpen}
      />

      {editionActivee &&
        (editorOpen ? (
          <EditorPanel
            panelRef={editorRef}
            store={store}
            editor={editor}
            onSelect={(id) => select(id, id ? 'reveal' : null)}
            onClose={() => setEditorOpen(false)}
          />
        ) : (
          <button type="button" className="editor-toggle" data-no-pan onClick={() => setEditorOpen(true)}>
            <PenIcon width={16} height={16} />
            Éditer les zones
          </button>
        ))}
    </div>
  );
}
