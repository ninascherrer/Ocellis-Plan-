import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

/** Position d'un axe : `t` = position (0 à 1), `part` = fraction du plan visible (0 à 1). */
export interface Axe {
  t: number;
  part: number;
}
export interface PositionDefilement {
  x: Axe;
  y: Axe;
}

interface BarresDefilementProps {
  /** La vue y pousse sa position à chaque image, sans re-rendre l'application. */
  abonnement: RefObject<((p: PositionDefilement) => void) | null>;
  /** Place le plan à la position `t` (0 à 1) sur l'axe donné. */
  onChange: (axe: 'x' | 'y', t: number) => void;
}

const borne = (v: number) => Math.min(1, Math.max(0, v));
const egal = (a: Axe, b: Axe) => Math.abs(a.t - b.t) < 0.002 && Math.abs(a.part - b.part) < 0.002;

/**
 * Barres de défilement à la manière d'un lecteur PDF : une barre verticale à
 * droite, une barre horizontale en bas. La taille du curseur correspond à la
 * partie visible du plan ; on le fait glisser, ou on clique sur la barre.
 */
export function BarresDefilement({ abonnement, onChange }: BarresDefilementProps) {
  const [pos, setPos] = useState<PositionDefilement>({ x: { t: 0.5, part: 1 }, y: { t: 0.5, part: 1 } });
  const glisse = useRef<null | { axe: 'x' | 'y'; depart: number; t0: number; course: number }>(null);

  useEffect(() => {
    abonnement.current = (p) =>
      setPos((ancien) => (glisse.current || (egal(ancien.x, p.x) && egal(ancien.y, p.y)) ? ancien : p));
    return () => {
      abonnement.current = null;
    };
  }, [abonnement]);

  const barre = (axe: 'x' | 'y') => {
    const { t, part } = pos[axe];
    const taille = Math.max(0.08, Math.min(1, part));
    const inutile = part >= 0.995;
    const coord = (e: PointerEvent) => (axe === 'y' ? e.clientY : e.clientX);
    const longueur = (el: Element) => {
      const r = el.getBoundingClientRect();
      return axe === 'y' ? r.height : r.width;
    };
    const debut = (el: Element) => {
      const r = el.getBoundingClientRect();
      return axe === 'y' ? r.top : r.left;
    };
    const style = axe === 'y' ? { top: `${t * (1 - taille) * 100}%`, height: `${taille * 100}%` } : { left: `${t * (1 - taille) * 100}%`, width: `${taille * 100}%` };

    return (
      <div
        className={`defil defil-${axe}${inutile ? ' is-inutile' : ''}`}
        data-no-pan
        role="scrollbar"
        aria-orientation={axe === 'y' ? 'vertical' : 'horizontal'}
        aria-label={axe === 'y' ? 'Défilement vertical du plan' : 'Défilement horizontal du plan'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(t * 100)}
        aria-controls="plan"
        onPointerDown={(e) => {
          if (inutile) return;
          // Clic sur la barre, hors curseur : le curseur se centre sur le point cliqué.
          const L = longueur(e.currentTarget);
          const course = L * (1 - taille);
          if (!(e.target as Element).classList.contains('defil-curseur')) {
            const v = borne((coord(e) - debut(e.currentTarget) - (L * taille) / 2) / Math.max(course, 1));
            onChange(axe, v);
            setPos((p) => ({ ...p, [axe]: { ...p[axe], t: v } }));
            glisse.current = { axe, depart: coord(e), t0: v, course };
          } else glisse.current = { axe, depart: coord(e), t0: t, course };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const g = glisse.current;
          if (!g || g.axe !== axe) return;
          const v = borne(g.t0 + (coord(e) - g.depart) / Math.max(g.course, 1));
          onChange(axe, v);
          setPos((p) => ({ ...p, [axe]: { ...p[axe], t: v } }));
        }}
        onPointerUp={() => {
          glisse.current = null;
        }}
        onPointerCancel={() => {
          glisse.current = null;
        }}
      >
        <span className="defil-curseur" style={style} />
      </div>
    );
  };

  return (
    <>
      {barre('y')}
      {barre('x')}
    </>
  );
}
