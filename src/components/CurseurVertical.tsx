import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { ChevronIcon } from './Icons';

interface CurseurVerticalProps {
  /**
   * Abonnement à la position du plan : la vue y pousse la position courante
   * (0 = haut du plan visible au centre, 1 = bas) sans faire re-rendre l'application.
   */
  abonnement: RefObject<((t: number) => void) | null>;
  /** Place le plan à la position `t` (0 à 1). */
  onChange: (t: number) => void;
  /** Décale le plan d'un pas (−1 : vers le haut, 1 : vers le bas). */
  onPas: (sens: -1 | 1) => void;
}

const borne = (t: number) => Math.min(1, Math.max(0, t));

/** Curseur vertical pour faire défiler le plan de haut en bas. */
export function CurseurVertical({ abonnement, onChange, onPas }: CurseurVerticalProps) {
  const [t, setT] = useState(0.5);
  const rail = useRef<HTMLDivElement>(null);
  const glisse = useRef(false);

  useEffect(() => {
    abonnement.current = (v) => {
      if (!glisse.current) setT(borne(v));
    };
    return () => {
      abonnement.current = null;
    };
  }, [abonnement]);

  const depuisPointeur = (e: PointerEvent) => {
    const r = rail.current?.getBoundingClientRect();
    if (!r) return;
    const v = borne((e.clientY - r.top - 9) / Math.max(r.height - 18, 1));
    setT(v);
    onChange(v);
  };

  const clavier = (e: KeyboardEvent) => {
    const pas = e.shiftKey ? 0.2 : 0.05;
    let v: number | null = null;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') v = t - pas;
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') v = t + pas;
    else if (e.key === 'Home' || e.key === 'PageUp') v = 0;
    else if (e.key === 'End' || e.key === 'PageDown') v = 1;
    if (v === null) return;
    e.preventDefault();
    e.stopPropagation();
    v = borne(v);
    setT(v);
    onChange(v);
  };

  return (
    <div className="curseur-vertical" data-no-pan>
      <button type="button" className="curseur-fleche" aria-label="Monter dans le plan" title="Monter" onClick={() => onPas(-1)}>
        <ChevronIcon width={16} height={16} style={{ transform: 'rotate(-90deg)' }} />
      </button>
      <div
        ref={rail}
        className="curseur-rail"
        role="slider"
        tabIndex={0}
        aria-label="Position verticale dans le plan"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(t * 100)}
        aria-valuetext={t < 0.2 ? 'Haut du plan' : t > 0.8 ? 'Bas du plan' : 'Milieu du plan'}
        onKeyDown={clavier}
        onPointerDown={(e) => {
          glisse.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          depuisPointeur(e);
        }}
        onPointerMove={(e) => glisse.current && depuisPointeur(e)}
        onPointerUp={() => {
          glisse.current = false;
        }}
        onPointerCancel={() => {
          glisse.current = false;
        }}
      >
        <span className="curseur-piste" aria-hidden="true" />
        <span className="curseur-pouce" aria-hidden="true" style={{ top: `calc(9px + ${t} * (100% - 18px))` }} />
      </div>
      <button type="button" className="curseur-fleche" aria-label="Descendre dans le plan" title="Descendre" onClick={() => onPas(1)}>
        <ChevronIcon width={16} height={16} style={{ transform: 'rotate(90deg)' }} />
      </button>
    </div>
  );
}
