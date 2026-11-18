import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Bbox } from '../lib/geometry';
import type { Point } from '../types';

/** Transformation plan → écran : écran = plan × k + (x, y). */
export interface View {
  x: number;
  y: number;
  k: number;
}

/** Marges occupées par les panneaux flottants, à éviter lors des recadrages. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface Options {
  contentWidth: number;
  contentHeight: number;
  getInsets: () => Insets;
}

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
/** Zoom maximal, en multiple de l'échelle « plan entier ». */
const MAX_ZOOM = 14;
const MIN_ZOOM = 0.6;
/** Au-delà de ce déplacement (px), un appui devient un glisser et non un clic. */
const DRAG_THRESHOLD = 5;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export function usePanZoom(containerRef: RefObject<HTMLElement | null>, options: Options) {
  const { contentWidth, contentHeight } = options;
  const [view, setViewState] = useState<View>({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ width: 0, height: 0 });

  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  const getInsetsRef = useRef(options.getInsets);
  getInsetsRef.current = options.getInsets;
  const animationRef = useRef<number | null>(null);

  /** Échelle à laquelle le plan entier tient dans la zone visible. */
  const fitScale = useCallback(
    (insets: Insets = NO_INSETS) => {
      const { width, height } = sizeRef.current;
      const availableW = Math.max(width - insets.left - insets.right, 80);
      const availableH = Math.max(height - insets.top - insets.bottom, 80);
      return Math.min(availableW / contentWidth, availableH / contentHeight);
    },
    [contentWidth, contentHeight],
  );

  /** Borne le zoom et empêche de perdre le plan hors de l'écran. */
  const clamp = useCallback(
    (v: View): View => {
      const { width, height } = sizeRef.current;
      const base = fitScale();
      const k = Math.min(Math.max(v.k, base * MIN_ZOOM), base * MAX_ZOOM);
      const w = contentWidth * k;
      const h = contentHeight * k;
      const marginX = Math.min(width * 0.3, w * 0.5);
      const marginY = Math.min(height * 0.3, h * 0.5);
      const x = Math.min(Math.max(v.x, marginX - w), width - marginX);
      const y = Math.min(Math.max(v.y, marginY - h), height - marginY);
      return { x, y, k };
    },
    [contentWidth, contentHeight, fitScale],
  );

  const setView = useCallback(
    (v: View) => {
      const next = clamp(v);
      viewRef.current = next;
      setViewState(next);
    },
    [clamp],
  );

  const stopAnimation = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  /** Transition douce : interpolation du centre visé et du zoom (en logarithme). */
  const animateTo = useCallback(
    (target: View, duration = 550) => {
      stopAnimation();
      const to = clamp(target);
      if (prefersReducedMotion() || duration <= 0) {
        setView(to);
        return;
      }
      const from = viewRef.current;
      const { width, height } = sizeRef.current;
      const centerOf = (v: View): Point => [(width / 2 - v.x) / v.k, (height / 2 - v.y) / v.k];
      const c0 = centerOf(from);
      const c1 = centerOf(to);
      const start = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const e = easeInOutCubic(t);
        const k = Math.exp(Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * e);
        const cx = c0[0] + (c1[0] - c0[0]) * e;
        const cy = c0[1] + (c1[1] - c0[1]) * e;
        const next = { k, x: width / 2 - cx * k, y: height / 2 - cy * k };
        viewRef.current = next;
        setViewState(next);
        animationRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      animationRef.current = requestAnimationFrame(step);
    },
    [clamp, setView, stopAnimation],
  );

  /** Vue cadrant la boîte donnée dans la partie de l'écran non couverte par les panneaux. */
  const viewForBox = useCallback(
    (box: Bbox, { padding = 32, maxZoom = MAX_ZOOM }: { padding?: number; maxZoom?: number } = {}): View => {
      const { width, height } = sizeRef.current;
      const insets = getInsetsRef.current();
      const availableW = Math.max(width - insets.left - insets.right - padding * 2, 40);
      const availableH = Math.max(height - insets.top - insets.bottom - padding * 2, 40);
      const boxW = Math.max(box.maxX - box.minX, 1);
      const boxH = Math.max(box.maxY - box.minY, 1);
      const k = Math.min(availableW / boxW, availableH / boxH, fitScale() * maxZoom);
      return {
        k,
        x: insets.left + padding + (availableW - boxW * k) / 2 - box.minX * k,
        y: insets.top + padding + (availableH - boxH * k) / 2 - box.minY * k,
      };
    },
    [fitScale],
  );

  const fitAll = useCallback(
    (animate = true) => {
      const target = viewForBox({ minX: 0, minY: 0, maxX: contentWidth, maxY: contentHeight }, { padding: 20 });
      if (animate) animateTo(target);
      else setView(target);
    },
    [animateTo, contentHeight, contentWidth, setView, viewForBox],
  );

  /** Centre une boîte en gardant du contexte autour (le plan reste lisible). */
  const focusBox = useCallback(
    (box: Bbox, maxZoom = 2.3) => {
      const { width, height } = sizeRef.current;
      const padding = Math.max(56, Math.min(width, height) * 0.12);
      animateTo(viewForBox(box, { padding, maxZoom }));
    },
    [animateTo, viewForBox],
  );

  /** Zoom autour d'un point écran (par défaut le centre de la zone visible). */
  const zoomBy = useCallback(
    (factor: number, around?: { x: number; y: number }, animate = true) => {
      const v = viewRef.current;
      const insets = getInsetsRef.current();
      const { width, height } = sizeRef.current;
      const px = around?.x ?? insets.left + (width - insets.left - insets.right) / 2;
      const py = around?.y ?? insets.top + (height - insets.top - insets.bottom) / 2;
      const k = v.k * factor;
      const target = { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
      if (animate) animateTo(target, 260);
      else setView(target);
    },
    [animateTo, setView],
  );

  /** Décale la vue au minimum, sans changer le zoom, pour que la boîte soit visible hors des panneaux. */
  const reveal = useCallback(
    (box: Bbox) => {
      const v = viewRef.current;
      const { width, height } = sizeRef.current;
      const insets = getInsetsRef.current();
      const padding = 24;
      const shift = (start: number, end: number, min: number, max: number) => {
        if (end - start > max - min) return (min + max) / 2 - (start + end) / 2;
        if (start < min) return min - start;
        if (end > max) return max - end;
        return 0;
      };
      const dx = shift(v.x + box.minX * v.k, v.x + box.maxX * v.k, insets.left + padding, width - insets.right - padding);
      const dy = shift(v.y + box.minY * v.k, v.y + box.maxY * v.k, insets.top + padding, height - insets.bottom - padding);
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) animateTo({ k: v.k, x: v.x + dx, y: v.y + dy }, 420);
    },
    [animateTo],
  );

  /** Convertit des coordonnées écran (clientX/clientY) en coordonnées du plan. */
  const screenToPlan = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = containerRef.current?.getBoundingClientRect();
      const v = viewRef.current;
      const sx = clientX - (rect?.left ?? 0);
      const sy = clientY - (rect?.top ?? 0);
      return [(sx - v.x) / v.k, (sy - v.y) / v.k];
    },
    [containerRef],
  );

  // Taille du conteneur : premier cadrage, puis conservation du centre lors des redimensionnements.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    let first = true;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const previous = sizeRef.current;
      sizeRef.current = { width, height };
      setSize({ width, height });
      if (first) {
        first = false;
        fitAll(false);
      } else if (previous.width > 0) {
        const v = viewRef.current;
        setView({ k: v.k, x: v.x + (width - previous.width) / 2, y: v.y + (height - previous.height) / 2 });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef, fitAll, setView]);

  // Gestes : glisser, pincer, molette, double-clic.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number } | null = null;
    let dragging = false;
    let suppressClick = false;
    let pinch: { distance: number; mid: { x: number; y: number } } | null = null;

    const local = (e: { clientX: number; clientY: number }) => {
      const rect = element.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    // Les éléments marqués `data-no-pan` (poignées de l'éditeur, panneaux) gèrent leurs propres gestes,
    // de même que ceux marqués `data-shift-drag` lorsque la touche Maj est enfoncée.
    const ignored = (e: Event) => {
      const target = e.target;
      if (!(target instanceof Element)) return false;
      if (target.closest('[data-no-pan]')) return true;
      return 'shiftKey' in e && e.shiftKey === true && target.closest('[data-shift-drag]') !== null;
    };

    const pinchState = () => {
      const [a, b] = [...pointers.values()];
      return { distance: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (ignored(e) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      stopAnimation();
      pointers.set(e.pointerId, local(e));
      if (pointers.size === 1) {
        start = local(e);
        dragging = false;
      } else if (pointers.size === 2) {
        pinch = pinchState();
        dragging = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      const current = local(e);
      pointers.set(e.pointerId, current);

      if (pointers.size >= 2 && pinch) {
        const next = pinchState();
        const v = viewRef.current;
        const factor = next.distance / Math.max(pinch.distance, 1);
        const k = v.k * factor;
        // Zoom autour de l'ancien point médian, puis translation du point médian.
        const x = next.mid.x - ((pinch.mid.x - v.x) / v.k) * k;
        const y = next.mid.y - ((pinch.mid.y - v.y) / v.k) * k;
        setView({ k, x, y });
        pinch = next;
        return;
      }

      if (!dragging && start && Math.hypot(current.x - start.x, current.y - start.y) > DRAG_THRESHOLD) {
        dragging = true;
        element.setPointerCapture(e.pointerId);
        element.classList.add('is-panning');
      }
      if (dragging) {
        const v = viewRef.current;
        setView({ k: v.k, x: v.x + current.x - previous.x, y: v.y + current.y - previous.y });
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 1) {
        // Reprise d'un glisser à un doigt après un pincement.
        start = [...pointers.values()][0];
      }
      if (pointers.size === 0) {
        if (dragging) suppressClick = true;
        dragging = false;
        start = null;
        element.classList.remove('is-panning');
      }
    };

    // Un glisser ne doit pas être interprété comme un clic sur une zone.
    const onClickCapture = (e: MouseEvent) => {
      if (suppressClick) {
        suppressClick = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (ignored(e)) return;
      e.preventDefault();
      stopAnimation();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      // Les pincements sur pavé tactile arrivent avec ctrlKey : on les rend plus réactifs.
      const factor = Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0018));
      zoomBy(factor, local(e), false);
    };

    const onDoubleClick = (e: MouseEvent) => {
      if (ignored(e)) return;
      zoomBy(e.shiftKey ? 0.5 : 2, local(e));
    };

    element.addEventListener('pointerdown', onPointerDown);
    element.addEventListener('pointermove', onPointerMove);
    element.addEventListener('pointerup', onPointerUp);
    element.addEventListener('pointercancel', onPointerUp);
    element.addEventListener('click', onClickCapture, true);
    element.addEventListener('wheel', onWheel, { passive: false });
    element.addEventListener('dblclick', onDoubleClick);
    return () => {
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointermove', onPointerMove);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointercancel', onPointerUp);
      element.removeEventListener('click', onClickCapture, true);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('dblclick', onDoubleClick);
    };
  }, [containerRef, setView, stopAnimation, zoomBy]);

  useEffect(() => stopAnimation, [stopAnimation]);

  return { view, size, fitScale, fitAll, focusBox, reveal, zoomBy, screenToPlan, animateTo };
}
