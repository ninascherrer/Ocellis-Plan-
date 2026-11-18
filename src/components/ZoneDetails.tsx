import { useState, type CSSProperties, type RefObject } from 'react';
import type { Categorie, Espace } from '../types';
import { CloseIcon, LinkIcon, TargetIcon } from './Icons';

interface ZoneDetailsProps {
  panelRef: RefObject<HTMLElement | null>;
  espace: Espace;
  categorie: Categorie | undefined;
  onClose: () => void;
  onFocus: () => void;
}

export function ZoneDetails({ panelRef, espace, categorie, onClose, onFocus }: ZoneDetailsProps) {
  const [copied, setCopied] = useState(false);
  const infos = (espace.infos ?? []).filter((info) => info.trim() !== '');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Presse-papiers indisponible : l'adresse reste visible dans la barre du navigateur.
    }
  };

  return (
    <section
      ref={panelRef}
      key={espace.id}
      className="details"
      data-no-pan
      aria-live="polite"
      aria-labelledby="details-title"
      style={{ '--cat-color': categorie?.couleur } as CSSProperties}
    >
      <div className="details-grabber" aria-hidden="true" />
      <header className="details-header">
        <p className="details-category">
          <span className="swatch" aria-hidden="true" />
          {categorie?.libelle ?? espace.categorie}
        </p>
        <button type="button" className="icon-button details-close" aria-label="Fermer la fiche" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>

      <h2 id="details-title" className="details-title">
        {espace.nom}
      </h2>

      {espace.aConfirmer && (
        <p className="badge-pending">
          <span className="pending-dot" aria-hidden="true" />
          Informations à confirmer
        </p>
      )}

      {espace.description && <p className="details-description">{espace.description}</p>}

      {infos.length > 0 && (
        <div className="details-infos-block">
          <h3 className="label">Infos pratiques</h3>
          <ul className="details-infos">
            {infos.map((info, i) => (
              <li key={i}>{info}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="details-actions">
        <button type="button" className="button button-primary" onClick={onFocus}>
          <TargetIcon width={16} height={16} />
          Centrer sur le plan
        </button>
        <button type="button" className="button button-ghost" onClick={copyLink}>
          <LinkIcon width={16} height={16} />
          {copied ? 'Lien copié' : 'Copier le lien'}
        </button>
      </div>
    </section>
  );
}
