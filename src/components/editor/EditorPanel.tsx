import { useEffect, useMemo, useState, type RefObject } from 'react';
import { validerConfig } from '../../config';
import type { EditableConfig } from '../../hooks/useEditableConfig';
import type { PlanEditor } from '../../hooks/usePlanEditor';
import { downloadText, serializeConfig } from '../../lib/exportConfig';
import type { CategorieId, Point } from '../../types';
import { CloseIcon, CopyIcon, DownloadIcon, RedoIcon, ShapeIcon, TrashIcon, UndoIcon } from '../Icons';

interface EditorPanelProps {
  panelRef: RefObject<HTMLElement | null>;
  store: EditableConfig;
  editor: PlanEditor;
  onSelect: (id: string | null) => void;
  onClose: () => void;
}

const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatPoints = (points: Point[]) => points.map(([x, y]) => `${x}, ${y}`).join('\n');

function parsePoints(text: string): Point[] | null {
  const points: Point[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const numbers = line.match(/-?\d+(?:[.,]\d+)?/g);
    if (!numbers || numbers.length !== 2) return null;
    points.push([Number(numbers[0].replace(',', '.')), Number(numbers[1].replace(',', '.'))]);
  }
  return points.length >= 3 ? points : null;
}

export function EditorPanel({ panelRef, store, editor, onSelect, onClose }: EditorPanelProps) {
  const { config, checkpoint, undo, redo, canUndo, canRedo } = store;
  const { zone, selectedVertex, drawing, cursor } = editor;
  const [message, setMessage] = useState<string | null>(null);
  const [idDraft, setIdDraft] = useState('');
  const [pointsDraft, setPointsDraft] = useState('');
  const erreurs = useMemo(() => validerConfig(config), [config]);
  const sortedEspaces = useMemo(
    () => [...config.espaces].sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { numeric: true })),
    [config.espaces],
  );

  useEffect(() => setIdDraft(zone?.id ?? ''), [zone?.id]);
  useEffect(() => setPointsDraft(zone ? formatPoints(zone.contour) : ''), [zone]);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2200);
  };

  const commitId = () => {
    if (!zone) return;
    const id = slugify(idDraft);
    if (id === zone.id) return setIdDraft(id);
    if (!id || config.espaces.some((e) => e.id === id)) {
      flash(id ? `L'identifiant « ${id} » existe déjà.` : 'Identifiant vide.');
      return setIdDraft(zone.id);
    }
    editor.updateSelected((e) => ({ ...e, id }));
    onSelect(id);
  };

  const applyPoints = () => {
    const points = parsePoints(pointsDraft);
    if (!points) return flash('Format attendu : une ligne « x, y » par sommet, au moins 3 sommets.');
    editor.updateSelected((e) => ({ ...e, contour: points }));
  };

  const exportFile = () => {
    downloadText('espaces.json', serializeConfig(config));
    flash('Fichier téléchargé : remplacez src/config/espaces.json.');
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(serializeConfig(config));
      flash('JSON copié dans le presse-papiers.');
    } catch {
      flash('Copie impossible : utilisez le téléchargement.');
    }
  };

  const resetDraft = () => {
    if (window.confirm('Abandonner toutes les modifications non exportées et revenir au fichier espaces.json ?')) {
      store.resetToFile();
      onSelect(null);
    }
  };

  const vertex = zone && selectedVertex !== null ? zone.contour[selectedVertex] : null;

  return (
    <aside ref={panelRef} className="editor" data-no-pan aria-label="Éditeur des zones">
      <header className="editor-header">
        <div>
          <p className="eyebrow">Mode édition</p>
          <h2>Zones interactives</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Fermer l'éditeur" title="Fermer l'éditeur" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>

      <div className="editor-toolbar">
        <button type="button" className="button button-secondary" onClick={undo} disabled={!canUndo} title="Annuler (Ctrl+Z)">
          <UndoIcon width={16} height={16} />
        </button>
        <button type="button" className="button button-secondary" onClick={redo} disabled={!canRedo} title="Rétablir (Ctrl+Maj+Z)">
          <RedoIcon width={16} height={16} />
        </button>
        <button
          type="button"
          className={`button ${drawing ? 'button-primary' : 'button-secondary'}`}
          onClick={drawing ? editor.cancelDrawing : editor.startDrawing}
        >
          <ShapeIcon width={16} height={16} />
          {drawing ? 'Annuler le tracé' : 'Nouvelle zone'}
        </button>
      </div>

      <div className="editor-status">
        <span className="coords">
          {cursor ? `x ${cursor[0].toFixed(1)} · y ${cursor[1].toFixed(1)}` : 'Survolez le plan'}
        </span>
        <span>
          {store.hasDraft
            ? store.savedAt
              ? `Brouillon enregistré à ${new Date(store.savedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Brouillon local'
            : 'Fichier espaces.json'}
        </span>
      </div>

      {store.draftIsStale && (
        <p className="editor-warning">
          Le fichier espaces.json a changé depuis la création de ce brouillon. Exportez ou abandonnez le brouillon pour
          éviter d'écraser ces changements.
        </p>
      )}

      <div className="editor-body">
        {drawing ? (
          <div className="editor-help">
            <p>
              <strong>Tracé en cours ({drawing.length} sommet{drawing.length > 1 ? 's' : ''})</strong>
            </p>
            <ul>
              <li>Cliquez sur le plan pour ajouter chaque sommet.</li>
              <li>Cliquez sur le premier sommet ou appuyez sur Entrée pour fermer le contour.</li>
              <li>Retour arrière supprime le dernier sommet, Échap annule.</li>
            </ul>
            <button type="button" className="button button-primary" onClick={editor.finishDrawing} disabled={drawing.length < 3}>
              Terminer la zone
            </button>
          </div>
        ) : zone ? (
          <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
            <label className="field">
              <span>Nom affiché</span>
              <input
                value={zone.nom}
                onFocus={checkpoint}
                onChange={(e) => editor.updateSelected((z) => ({ ...z, nom: e.target.value }), { record: false })}
              />
            </label>

            <div className="field-row">
              <label className="field">
                <span>Catégorie</span>
                <select
                  value={zone.categorie}
                  onChange={(e) => editor.updateSelected((z) => ({ ...z, categorie: e.target.value as CategorieId }))}
                >
                  {config.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.libelle}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Identifiant</span>
                <input
                  value={idDraft}
                  onChange={(e) => setIdDraft(e.target.value)}
                  onBlur={commitId}
                  onKeyDown={(e) => e.key === 'Enter' && commitId()}
                  spellCheck={false}
                />
              </label>
            </div>

            <label className="field">
              <span>Description</span>
              <textarea
                rows={3}
                value={zone.description ?? ''}
                onFocus={checkpoint}
                onChange={(e) => editor.updateSelected((z) => ({ ...z, description: e.target.value }), { record: false })}
              />
            </label>

            <label className="field">
              <span>Infos pratiques (une par ligne)</span>
              <textarea
                rows={3}
                value={(zone.infos ?? []).join('\n')}
                onFocus={checkpoint}
                onChange={(e) =>
                  editor.updateSelected((z) => ({ ...z, infos: e.target.value.split('\n') }), { record: false })
                }
              />
            </label>

            <label className="field">
              <span>Concept</span>
              <input
                value={zone.concept ?? ''}
                onFocus={checkpoint}
                onChange={(e) => editor.updateSelected((z) => ({ ...z, concept: e.target.value }), { record: false })}
              />
            </label>

            <label className="field">
              <span>Conception (une ligne « Thème : texte »)</span>
              <textarea
                rows={4}
                value={(zone.conception ?? []).map((c) => `${c.theme} : ${c.texte}`).join('\n')}
                onFocus={checkpoint}
                onChange={(e) =>
                  editor.updateSelected(
                    (z) => ({
                      ...z,
                      conception: e.target.value.split('\n').map((ligne) => {
                        const i = ligne.indexOf(':');
                        return i < 0 ? { theme: '', texte: ligne.trim() } : { theme: ligne.slice(0, i).trim(), texte: ligne.slice(i + 1).trim() };
                      }),
                    }),
                    { record: false },
                  )
                }
              />
            </label>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={Boolean(zone.aConfirmer)}
                onChange={(e) => editor.updateSelected((z) => ({ ...z, aConfirmer: e.target.checked }))}
              />
              Afficher « Informations à confirmer »
            </label>

            <fieldset className="vertex-box">
              <legend>
                Contour · {zone.contour.length} sommets
              </legend>
              {vertex && selectedVertex !== null ? (
                <div className="vertex-edit">
                  <span className="vertex-index">Sommet {selectedVertex + 1}</span>
                  <label>
                    x
                    <input
                      type="number"
                      step={0.5}
                      value={vertex[0]}
                      onChange={(e) => editor.setVertex(selectedVertex, [Number(e.target.value), vertex[1]])}
                    />
                  </label>
                  <label>
                    y
                    <input
                      type="number"
                      step={0.5}
                      value={vertex[1]}
                      onChange={(e) => editor.setVertex(selectedVertex, [vertex[0], Number(e.target.value)])}
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    title="Supprimer ce sommet"
                    aria-label="Supprimer ce sommet"
                    disabled={zone.contour.length <= 3}
                    onClick={() => editor.deleteVertex(selectedVertex)}
                  >
                    <TrashIcon width={16} height={16} />
                  </button>
                </div>
              ) : (
                <p className="hint">Sélectionnez un sommet sur le plan pour saisir ses coordonnées.</p>
              )}
              <details>
                <summary>Coordonnées (avancé)</summary>
                <textarea
                  className="mono"
                  rows={6}
                  value={pointsDraft}
                  onChange={(e) => setPointsDraft(e.target.value)}
                  spellCheck={false}
                />
                <button type="button" className="button button-secondary" onClick={applyPoints}>
                  Appliquer les coordonnées
                </button>
              </details>
            </fieldset>

            <button
              type="button"
              className="button button-danger"
              onClick={() => window.confirm(`Supprimer la zone « ${zone.nom} » ?`) && editor.deleteZone(zone.id)}
            >
              <TrashIcon width={16} height={16} />
              Supprimer la zone
            </button>
          </form>
        ) : (
          <div className="editor-help">
            <p>Cliquez sur une zone du plan, ou choisissez-la ci-dessous, pour modifier son nom, sa description et son contour.</p>
            <select className="zone-picker" value="" onChange={(e) => onSelect(e.target.value || null)}>
              <option value="">Choisir une zone…</option>
              {sortedEspaces.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nom} ({e.id})
                </option>
              ))}
            </select>
          </div>
        )}

        {!drawing && (
          <details className="editor-help shortcuts" open={!zone}>
            <summary>Gestes et raccourcis</summary>
            <ul>
              <li>Glisser un sommet pour le déplacer (aimanté aux sommets voisins, Alt pour désactiver).</li>
              <li>Glisser un point médian pour ajouter un sommet ; double-clic sur un sommet pour le supprimer.</li>
              <li>Flèches : déplacer le sommet sélectionné de 0,5 (Maj : 5). Sans sommet sélectionné, toute la zone.</li>
              <li>Maj + glisser la zone : la déplacer entièrement.</li>
              <li>Ctrl+Z / Ctrl+Maj+Z : annuler / rétablir.</li>
            </ul>
          </details>
        )}

        {erreurs.length > 0 && (
          <div className="editor-errors" role="alert">
            <strong>À corriger avant export</strong>
            <ul>
              {erreurs.map((erreur) => (
                <li key={erreur}>{erreur}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="editor-footer">
        {message && <p className="editor-message">{message}</p>}
        <div className="editor-export">
          <button type="button" className="button button-primary" onClick={exportFile}>
            <DownloadIcon width={16} height={16} />
            Exporter espaces.json
          </button>
          <button type="button" className="button button-secondary" onClick={copyJson} title="Copier le JSON">
            <CopyIcon width={16} height={16} />
          </button>
        </div>
        {store.hasDraft && (
          <button type="button" className="link-button" onClick={resetDraft}>
            Abandonner le brouillon
          </button>
        )}
      </footer>
    </aside>
  );
}
