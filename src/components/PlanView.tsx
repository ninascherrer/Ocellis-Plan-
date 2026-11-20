import {
  useMemo,
  useState,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type SVGProps,
} from 'react';
import type { View } from '../hooks/usePanZoom';
import { toSvgPoints } from '../lib/geometry';
import type { PlanInfo } from '../types';
import type { ZoneGeom } from '../lib/zones';
import { PlanDessin } from '../plan/PlanDessin';

interface PlanViewProps {
  plan: PlanInfo;
  view: View;
  /** Zones triées de la plus grande à la plus petite (les petites restent cliquables au-dessus). */
  zones: ZoneGeom[];
  colorOf: (zone: ZoneGeom) => string;
  selectedId: string | null;
  hoveredId: string | null;
  /** Ensemble des zones retenues par la recherche ou les filtres ; `null` si aucun filtre actif. */
  matchIds: Set<string> | null;
  /** Rendu affiché : plan redessiné (par défaut) ou plan d'origine. */
  variant: PlanVariant;
  editing: boolean;
  onZoneClick: (id: string) => void;
  onZoneHover: (id: string | null) => void;
  onZonePointerDown?: (id: string, event: PointerEvent<SVGPolygonElement>) => void;
  svgProps?: SVGProps<SVGSVGElement>;
  /** Calques supplémentaires dessinés dans le repère du plan (éditeur). */
  children?: ReactNode;
}

export type PlanVariant = 'dessin' | 'original' | '3d';

/** `?calque` superpose le plan d'origine au dessin pour contrôler l'alignement. */
const calque = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('calque');

const imageUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export function PlanView({
  plan,
  view,
  zones,
  colorOf,
  selectedId,
  hoveredId,
  matchIds,
  variant,
  editing,
  onZoneClick,
  onZoneHover,
  onZonePointerDown,
  svgProps,
  children,
}: PlanViewProps) {
  const selected = zones.find((z) => z.espace.id === selectedId) ?? null;
  // Une fois affichée, l'image d'origine reste en place (pas de nouveau téléchargement).
  const [afficherOriginal, setAfficherOriginal] = useState(variant === 'original' || calque);
  if (!afficherOriginal && (variant === 'original' || calque)) setAfficherOriginal(true);
  const circulations = useMemo(
    () => zones.filter((z) => z.espace.categorie === 'circulations').map((z) => z.espace.contour),
    [zones],
  );
  // Conserve la dernière zone sélectionnée pour que le voile s'estompe sans clignoter.
  const lastSelectedRef = useRef<ZoneGeom | null>(null);
  if (selected) lastSelectedRef.current = selected;
  const spotlight = selected ?? lastSelectedRef.current;
  const showSpotlight = selected !== null && !editing;

  const onKeyDown = (id: string) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onZoneClick(id);
    }
  };

  const classes = ['plan-svg'];
  if (matchIds) classes.push('is-filtering');
  if (editing) classes.push('is-editing');
  if (selected) classes.push('has-selection');

  return (
    <svg className={classes.join(' ')} width="100%" height="100%" {...svgProps}>
      <defs>
        <mask id="spotlight-mask" maskUnits="userSpaceOnUse" x={0} y={0} width={plan.largeur} height={plan.hauteur}>
          <rect x={0} y={0} width={plan.largeur} height={plan.hauteur} fill="white" />
          {spotlight && <polygon points={toSvgPoints(spotlight.espace.contour)} fill="black" />}
        </mask>
      </defs>

      <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
        {/* Dessin vectoriel (par défaut) ou plan d'origine, en fondu. */}
        <g className={`plan-layer${variant === 'dessin' ? ' is-visible' : ''}`}>
          <PlanDessin largeur={plan.largeur} hauteur={plan.hauteur} circulations={circulations} />
        </g>
        <g className={`plan-layer${variant === 'original' || calque ? ' is-visible' : ''}${calque ? ' is-calque' : ''}`}>
          <rect className="plan-original-sheet" x={0} y={0} width={plan.largeur} height={plan.hauteur} />
          {/* Image lourde (plan PDF) : chargée seulement quand la vue Original est demandée. */}
          {afficherOriginal && <image
            href={imageUrl(plan.image)}
            x={0}
            y={0}
            width={plan.largeur}
            height={plan.hauteur}
            preserveAspectRatio="none"
            className="plan-image"
          />}
        </g>

        <g className="zones" role="list" aria-label="Espaces du plan">
          {zones.map((zone) => {
            const { espace } = zone;
            const isMatch = matchIds?.has(espace.id) ?? false;
            const zoneClasses = ['zone'];
            if (isMatch) zoneClasses.push('is-match');
            if (espace.id === hoveredId) zoneClasses.push('is-hovered');
            if (espace.id === selectedId) zoneClasses.push('is-selected');
            const hiddenByFilter = matchIds !== null && !isMatch && !editing;
            return (
              <polygon
                key={espace.id}
                className={zoneClasses.join(' ')}
                style={{ '--zone-color': colorOf(zone) } as CSSProperties}
                points={toSvgPoints(espace.contour)}
                vectorEffect="non-scaling-stroke"
                data-zone-id={espace.id}
                data-shift-drag={editing && espace.id === selectedId ? '' : undefined}
                role="listitem"
                tabIndex={hiddenByFilter ? -1 : 0}
                aria-label={espace.nom}
                aria-hidden={hiddenByFilter || undefined}
                onClick={() => onZoneClick(espace.id)}
                onKeyDown={onKeyDown(espace.id)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && onZoneHover(espace.id)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && onZoneHover(null)}
                onFocus={() => onZoneHover(espace.id)}
                onBlur={() => onZoneHover(null)}
                onPointerDown={onZonePointerDown ? (e) => onZonePointerDown(espace.id, e) : undefined}
              />
            );
          })}
        </g>

        <rect
          className={`spotlight${showSpotlight ? ' is-visible' : ''}`}
          x={0}
          y={0}
          width={plan.largeur}
          height={plan.hauteur}
          mask="url(#spotlight-mask)"
        />

        {selected && !editing && (
          <g className="selection">
            <polygon className="selection-halo" points={toSvgPoints(selected.espace.contour)} vectorEffect="non-scaling-stroke" />
            <polygon className="selection-line" points={toSvgPoints(selected.espace.contour)} vectorEffect="non-scaling-stroke" />
          </g>
        )}

        {children}
      </g>
    </svg>
  );
}
