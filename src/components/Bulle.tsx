import type { CSSProperties } from 'react';

interface BulleProps {
  nom: string;
  /** Position du point d'ancrage, en coordonnées de la maquette (data-x/y/z), ou en pixels écran. */
  data?: { x: number; y: number; z: number };
  ecran?: { x: number; y: number };
  /** Bulle à gauche du point (près du bord droit de l'écran). */
  gauche?: boolean;
  couleur?: string;
}

/**
 * Nom d'un espace dans une bulle ovale, reliée au sol par un trait courbe,
 * à la manière d'une planche d'architecte illustrée.
 * Le point d'ancrage est l'origine de l'élément : le placement se fait par `transform`.
 */
export function Bulle({ nom, data, ecran, gauche = false, couleur }: BulleProps) {
  const style = {
    '--zone-color': couleur,
    ...(ecran ? { transform: `translate(${ecran.x}px, ${ecran.y}px)` } : {}),
  } as CSSProperties;
  return (
    <div
      className={`bulle${gauche ? ' is-gauche' : ''}`}
      data-x={data?.x}
      data-y={data?.y}
      data-z={data?.z}
      style={style}
      role="status"
    >
      <svg className="bulle-trait" width="72" height="62" viewBox="0 0 72 62" aria-hidden="true">
        <path d="M2 60 C 6 34, 26 14, 70 4" />
      </svg>
      <span className="bulle-point" aria-hidden="true" />
      <span className="bulle-nom">{nom}</span>
    </div>
  );
}
