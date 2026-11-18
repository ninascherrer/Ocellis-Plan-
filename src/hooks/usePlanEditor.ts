import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { EditableConfig } from './useEditableConfig';
import type { Espace, PlanConfig, Point } from '../types';

interface Options {
  store: EditableConfig;
  active: boolean;
  /** Échelle courante (pixels écran par unité du plan). */
  scale: number;
  screenToPlan: (clientX: number, clientY: number) => Point;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}

type Drag = { kind: 'vertex'; index: number } | { kind: 'zone'; last: Point };

/** Distance d'aimantation vers les sommets des autres zones, en pixels écran. */
const SNAP_PX = 7;
/** Pas de la grille d'arrondi, en unités du plan. */
const GRID = 0.5;

const roundToGrid = (value: number) => Math.round(value / GRID) * GRID;

function mapEspace(config: PlanConfig, id: string, recipe: (espace: Espace) => Espace): PlanConfig {
  return { ...config, espaces: config.espaces.map((e) => (e.id === id ? recipe(e) : e)) };
}

function nextId(espaces: Espace[]): string {
  const used = new Set(espaces.map((e) => e.id));
  for (let n = espaces.length + 1; ; n++) {
    const id = `espace-${String(n).padStart(2, '0')}`;
    if (!used.has(id)) return id;
  }
}

export function usePlanEditor({ store, active, scale, screenToPlan, selectedId, setSelectedId }: Options) {
  const { config, update, checkpoint, undo, redo } = store;
  const [selectedVertex, setSelectedVertex] = useState<number | null>(null);
  const [drawing, setDrawing] = useState<Point[] | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const dragRef = useRef<Drag | null>(null);

  const zone = config.espaces.find((e) => e.id === selectedId) ?? null;
  const { largeur, hauteur } = config.plan;

  useEffect(() => setSelectedVertex(null), [selectedId]);
  useEffect(() => {
    if (!active) {
      setDrawing(null);
      setCursor(null);
    }
  }, [active]);

  /** Aimante aux sommets voisins (sauf avec Alt), sinon arrondit à la grille et borne au plan. */
  const snap = useCallback(
    (p: Point, excludeId: string | null, free = false): Point => {
      if (!free) {
        let best: Point | null = null;
        let bestDistance = SNAP_PX / scale;
        for (const espace of config.espaces) {
          if (espace.id === excludeId) continue;
          for (const q of espace.contour) {
            const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
            if (d < bestDistance) {
              best = q;
              bestDistance = d;
            }
          }
        }
        if (best) return [best[0], best[1]];
      }
      return [
        Math.min(Math.max(roundToGrid(p[0]), 0), largeur),
        Math.min(Math.max(roundToGrid(p[1]), 0), hauteur),
      ];
    },
    [config.espaces, scale, largeur, hauteur],
  );

  const updateSelected = useCallback(
    (recipe: (espace: Espace) => Espace, options?: { record?: boolean }) => {
      if (!selectedId) return;
      update((c) => mapEspace(c, selectedId, recipe), options);
    },
    [selectedId, update],
  );

  const setVertex = useCallback(
    (index: number, point: Point, options?: { record?: boolean }) =>
      updateSelected((e) => ({ ...e, contour: e.contour.map((p, i) => (i === index ? point : p)) }), options),
    [updateSelected],
  );

  const deleteVertex = useCallback(
    (index: number) => {
      if (!zone || zone.contour.length <= 3) return;
      updateSelected((e) => ({ ...e, contour: e.contour.filter((_, i) => i !== index) }));
      setSelectedVertex(null);
    },
    [updateSelected, zone],
  );

  const nudge = useCallback(
    (dx: number, dy: number) => {
      if (!zone) return;
      updateSelected((e) => ({
        ...e,
        contour: e.contour.map(([x, y], i) =>
          selectedVertex === null || i === selectedVertex ? [x + dx, y + dy] : [x, y],
        ),
      }));
    },
    [selectedVertex, updateSelected, zone],
  );

  const deleteZone = useCallback(
    (id: string) => {
      update((c) => ({ ...c, espaces: c.espaces.filter((e) => e.id !== id) }));
      setSelectedId(null);
    },
    [setSelectedId, update],
  );

  // --- Tracé d'une nouvelle zone -------------------------------------------------

  const startDrawing = useCallback(() => {
    setSelectedId(null);
    setDrawing([]);
  }, [setSelectedId]);

  const cancelDrawing = useCallback(() => setDrawing(null), []);

  const addDrawingPoint = useCallback(
    (clientX: number, clientY: number, free = false) => {
      setDrawing((points) => (points ? [...points, snap(screenToPlan(clientX, clientY), null, free)] : points));
    },
    [screenToPlan, snap],
  );

  const finishDrawing = useCallback(() => {
    if (!drawing || drawing.length < 3) return;
    const id = nextId(config.espaces);
    const espace: Espace = {
      id,
      nom: 'Nouvel espace',
      categorie: config.categories[0]?.id ?? 'travail',
      description: '',
      infos: [],
      aConfirmer: true,
      contour: drawing,
    };
    update((c) => ({ ...c, espaces: [...c.espaces, espace] }));
    setDrawing(null);
    setSelectedId(id);
  }, [config.categories, config.espaces, drawing, setSelectedId, update]);

  // --- Glisser des poignées et des zones -------------------------------------------

  const startDrag = (drag: Drag, event: ReactPointerEvent<Element>) => {
    event.stopPropagation();
    event.preventDefault();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    checkpoint();
    dragRef.current = drag;
  };

  const onVertexPointerDown = (index: number, event: ReactPointerEvent<Element>) => {
    if (event.button !== 0) return;
    setSelectedVertex(index);
    startDrag({ kind: 'vertex', index }, event);
  };

  /** Appui sur un point médian : insère un sommet, aussitôt déplaçable. */
  const onMidpointPointerDown = (index: number, event: ReactPointerEvent<Element>) => {
    if (!zone || event.button !== 0) return;
    const a = zone.contour[index];
    const b = zone.contour[(index + 1) % zone.contour.length];
    const middle: Point = [roundToGrid((a[0] + b[0]) / 2), roundToGrid((a[1] + b[1]) / 2)];
    startDrag({ kind: 'vertex', index: index + 1 }, event);
    updateSelected((e) => ({ ...e, contour: [...e.contour.slice(0, index + 1), middle, ...e.contour.slice(index + 1)] }), {
      record: false,
    });
    setSelectedVertex(index + 1);
  };

  /** Maj + glisser sur la zone sélectionnée : déplace toute la zone. */
  const onZonePointerDown = (id: string, event: ReactPointerEvent<SVGPolygonElement>) => {
    if (!active || !event.shiftKey || id !== selectedId || event.button !== 0) return;
    startDrag({ kind: 'zone', last: screenToPlan(event.clientX, event.clientY) }, event);
  };

  const onPointerMove = (event: ReactPointerEvent<Element>) => {
    if (!active) return;
    const point = screenToPlan(event.clientX, event.clientY);
    setCursor(point);
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === 'vertex') {
      setVertex(drag.index, snap(point, selectedId, event.altKey), { record: false });
    } else {
      const dx = roundToGrid(point[0] - drag.last[0]);
      const dy = roundToGrid(point[1] - drag.last[1]);
      if (dx === 0 && dy === 0) return;
      drag.last = [drag.last[0] + dx, drag.last[1] + dy];
      updateSelected((e) => ({ ...e, contour: e.contour.map(([x, y]) => [x + dx, y + dy]) }), { record: false });
    }
  };

  const onPointerUp = (event: ReactPointerEvent<Element>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    const target = event.target as Element;
    if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
  };

  const onPointerLeave = () => setCursor(null);

  // --- Raccourcis clavier ---------------------------------------------------------

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if (drawing) {
        if (event.key === 'Escape') cancelDrawing();
        else if (event.key === 'Enter') finishDrawing();
        else if (event.key === 'Backspace') setDrawing((points) => points?.slice(0, -1) ?? null);
        else return;
        event.preventDefault();
        return;
      }

      if (!zone) return;
      const step = event.shiftKey ? 5 : GRID;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      if (moves[event.key]) {
        event.preventDefault();
        nudge(...moves[event.key]);
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && selectedVertex !== null) {
        event.preventDefault();
        deleteVertex(selectedVertex);
      } else if (event.key === 'Escape') {
        if (selectedVertex !== null) setSelectedVertex(null);
        else setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    active,
    cancelDrawing,
    deleteVertex,
    drawing,
    finishDrawing,
    nudge,
    redo,
    selectedVertex,
    setSelectedId,
    undo,
    zone,
  ]);

  return {
    zone,
    selectedVertex,
    setSelectedVertex,
    drawing,
    cursor,
    startDrawing,
    cancelDrawing,
    finishDrawing,
    addDrawingPoint,
    setVertex,
    deleteVertex,
    deleteZone,
    updateSelected,
    onVertexPointerDown,
    onMidpointPointerDown,
    onZonePointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
  };
}

export type PlanEditor = ReturnType<typeof usePlanEditor>;
