import type { View } from '../hooks/usePanZoom';
import type { ZoneGeom } from '../lib/zones';
import { Bulle } from './Bulle';

interface ZoneTagsProps {
  view: View;
  /** Conservé pour la compatibilité : les noms ne s'affichent plus au survol. */
  hovered?: ZoneGeom | null;
  selected: ZoneGeom | null;
  colorOf: (zone: ZoneGeom) => string;
}

/** Bulle du nom de l'espace choisi sur le plan 2D (taille constante quel que soit le zoom). */
export function ZoneTags({ view, selected, colorOf }: ZoneTagsProps) {
  if (!selected) return <div className="zone-tags" />;
  const x = view.x + selected.label[0] * view.k;
  const y = view.y + selected.label[1] * view.k;
  // Près du bord droit (ou sous la fiche ouverte), la bulle part vers la gauche.
  const gauche = typeof window !== 'undefined' && x > window.innerWidth - 640;
  return (
    <div className="zone-tags">
      <Bulle key={selected.espace.id} nom={selected.espace.nom} ecran={{ x, y }} gauche={gauche} couleur={colorOf(selected)} />
    </div>
  );
}
