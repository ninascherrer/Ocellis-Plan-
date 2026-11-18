import type { PlanVariant } from './PlanView';
import { FitIcon, MinusIcon, PlusIcon, RotateLeftIcon, RotateRightIcon } from './Icons';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  /** Quart de tour de la maquette (présent seulement en vue Maquette). */
  onRotate?: (sens: 1 | -1) => void;
  /** Absent quand aucun plan d'origine n'est configuré. */
  variant?: PlanVariant;
  onVariantChange?: (variant: PlanVariant) => void;
  /** Propose la maquette (masquée pendant l'édition des contours). */
  allow3d?: boolean;
}

const VARIANTES: { value: PlanVariant; label: string; title: string }[] = [
  { value: '3d', label: 'Maquette', title: 'Maquette illustrée en 3D, rotation libre' },
  { value: 'dessin', label: 'Dessin', title: 'Plan redessiné et simplifié' },
  { value: 'original', label: 'Original', title: "Plan d'architecte d'origine" },
];

export function MapControls({ onZoomIn, onZoomOut, onReset, onRotate, variant, onVariantChange, allow3d = true }: MapControlsProps) {
  return (
    <div className="map-controls" data-no-pan>
      {variant && onVariantChange && (
        <div className="segmented" role="radiogroup" aria-label="Rendu du plan">
          {VARIANTES.filter((v) => allow3d || v.value !== '3d').map(({ value, label, title }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={variant === value}
              className={variant === value ? 'is-active' : ''}
              title={title}
              onClick={() => onVariantChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="control-stack">
        {onRotate && (
          <div className="zoom-group" role="group" aria-label="Rotation">
            <button type="button" className="control-button" aria-label="Pivoter vers la gauche" title="Pivoter d'un quart de tour" onClick={() => onRotate(-1)}>
              <RotateLeftIcon />
            </button>
            <button type="button" className="control-button" aria-label="Pivoter vers la droite" title="Pivoter d'un quart de tour" onClick={() => onRotate(1)}>
              <RotateRightIcon />
            </button>
          </div>
        )}
        <div className="zoom-group" role="group" aria-label="Zoom">
          <button type="button" className="control-button" aria-label="Zoomer" title="Zoomer (+)" onClick={onZoomIn}>
            <PlusIcon />
          </button>
          <button type="button" className="control-button" aria-label="Dézoomer" title="Dézoomer (−)" onClick={onZoomOut}>
            <MinusIcon />
          </button>
        </div>
        <button type="button" className="control-button control-reset" title="Vue générale (0)" onClick={onReset}>
          <FitIcon />
          <span>Vue générale</span>
        </button>
      </div>
    </div>
  );
}
