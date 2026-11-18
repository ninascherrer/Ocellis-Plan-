import type { CSSProperties } from 'react';
import type { View } from '../hooks/usePanZoom';
import type { ZoneGeom } from '../lib/zones';

interface ZoneTagsProps {
  view: View;
  hovered: ZoneGeom | null;
  selected: ZoneGeom | null;
  colorOf: (zone: ZoneGeom) => string;
}

/** Étiquettes HTML positionnées sur le plan (taille constante quel que soit le zoom). */
export function ZoneTags({ view, hovered, selected, colorOf }: ZoneTagsProps) {
  const tags = [selected, hovered && hovered !== selected ? hovered : null].filter(Boolean) as ZoneGeom[];
  return (
    <div className="zone-tags" aria-hidden="true">
      {tags.map((zone) => {
        const isSelected = zone === selected;
        // L'étiquette de la sélection se pose au-dessus du contour pour ne pas le masquer.
        const x = view.x + zone.label[0] * view.k;
        const y = isSelected ? view.y + zone.box.minY * view.k - 12 : view.y + zone.label[1] * view.k;
        return (
          <div
            key={zone.espace.id}
            className={`zone-tag${isSelected ? ' is-selected' : ''}`}
            style={
              {
                '--zone-color': colorOf(zone),
                transform: `translate(${x}px, ${y}px) translate(-50%, ${isSelected ? '-100%' : '-50%'})`,
              } as CSSProperties
            }
          >
            <span className="dot" />
            <span className="tag-text">{zone.espace.nom}</span>
          </div>
        );
      })}
    </div>
  );
}
