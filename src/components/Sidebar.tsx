import { useId, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react';
import logoUrl from '../assets/ocellis-logo.png';
import type { Categorie, CategorieId, Espace, PlanInfo } from '../types';
import { CheckIcon, ChevronIcon, CloseIcon, ListIcon, SearchIcon } from './Icons';

interface SidebarProps {
  panelRef: RefObject<HTMLElement | null>;
  plan: PlanInfo;
  categories: Categorie[];
  counts: Map<CategorieId, number>;
  results: Espace[];
  total: number;
  query: string;
  onQueryChange: (query: string) => void;
  activeCategories: Set<CategorieId>;
  onToggleCategory: (id: CategorieId) => void;
  onClearFilters: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  isDesktop: boolean;
  /** Vue Maquette : glisser fait pivoter au lieu de déplacer. */
  maquette?: boolean;
}

export function Sidebar({
  panelRef,
  plan,
  categories,
  counts,
  results,
  total,
  query,
  onQueryChange,
  activeCategories,
  onToggleCategory,
  onClearFilters,
  selectedId,
  onSelect,
  onHover,
  isDesktop,
  maquette = false,
}: SidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [listOpen, setListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searching = query.trim() !== '';
  const filtering = searching || activeCategories.size > 0;
  // Sur mobile, la liste ne s'affiche qu'à la demande (recherche ou bouton « Liste »).
  const showList = isDesktop || listOpen || searching;

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const groups = categories
    .map((categorie) => ({ categorie, espaces: results.filter((e) => e.categorie === categorie.id) }))
    .filter((group) => group.espaces.length > 0);
  // Ordre de navigation clavier : celui de l'affichage (par catégorie, sauf pendant une recherche).
  const ordered = searching ? results : groups.flatMap((g) => g.espaces);

  const choose = (id: string) => {
    onSelect(id);
    if (!isDesktop) {
      setListOpen(false);
      inputRef.current?.blur();
    }
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, ordered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      const target = ordered[activeIndex] ?? ordered[0];
      if (target) choose(target.id);
    } else if (event.key === 'Escape') {
      if (query) onQueryChange('');
      else inputRef.current?.blur();
      setListOpen(false);
    }
  };

  const renderItem = (espace: Espace) => {
    const categorie = categoryById.get(espace.categorie);
    const index = ordered.indexOf(espace);
    const classes = ['space-item'];
    if (espace.id === selectedId) classes.push('is-selected');
    if (index === activeIndex) classes.push('is-active');
    return (
      <li key={espace.id}>
        <button
          type="button"
          id={`${listId}-${espace.id}`}
          className={classes.join(' ')}
          style={{ '--cat-color': categorie?.couleur } as CSSProperties}
          aria-current={espace.id === selectedId || undefined}
          onClick={() => choose(espace.id)}
          onPointerEnter={(e) => e.pointerType === 'mouse' && onHover(espace.id)}
          onPointerLeave={(e) => e.pointerType === 'mouse' && onHover(null)}
        >
          {searching && <span className="swatch" aria-hidden="true" />}
          <span className="space-item-text">
            <span className="space-item-name">{espace.nom}</span>
            {searching && categorie && <span className="space-item-cat">{categorie.libelle}</span>}
          </span>
          <ChevronIcon className="space-item-chevron" width={16} height={16} />
        </button>
      </li>
    );
  };

  return (
    <aside ref={panelRef} className={`sidebar${showList ? ' is-list-open' : ''}`} data-no-pan aria-label="Recherche et filtres">
      <header className="brand">
        <h1 className="brand-logo">
          <img src={logoUrl} alt={plan.titre} />
        </h1>
        {plan.sousTitre && <p className="brand-subtitle">{plan.sousTitre}</p>}
      </header>

      <div className="search">
        <SearchIcon className="search-icon" />
        <input
          ref={inputRef}
          type="search"
          inputMode="search"
          placeholder="Rechercher un espace"
          aria-label="Rechercher un espace"
          aria-controls={listId}
          aria-activedescendant={ordered[activeIndex] ? `${listId}-${ordered[activeIndex].id}` : undefined}
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => setListOpen(true)}
          onKeyDown={onSearchKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button type="button" className="icon-button search-clear" aria-label="Effacer la recherche" onClick={() => onQueryChange('')}>
            <CloseIcon width={16} height={16} />
          </button>
        ) : (
          !isDesktop && (
            <button
              type="button"
              className="icon-button search-clear"
              aria-label={listOpen ? 'Masquer la liste des espaces' : 'Afficher la liste des espaces'}
              aria-expanded={listOpen}
              onClick={() => setListOpen((open) => !open)}
            >
              {listOpen ? <CloseIcon width={16} height={16} /> : <ListIcon width={16} height={16} />}
            </button>
          )
        )}
      </div>

      <section className="filters-section" aria-labelledby={`${listId}-filters`}>
        {isDesktop && (
          <div className="section-head">
            <h2 id={`${listId}-filters`} className="label">
              Catégories
            </h2>
            {activeCategories.size > 0 && (
              <button type="button" className="link-button" onClick={onClearFilters}>
                Réinitialiser
              </button>
            )}
          </div>
        )}
        <div className="filters" role="group" aria-label="Filtrer par catégorie">
          {categories.map((categorie) => {
            const active = activeCategories.has(categorie.id);
            return (
              <button
                key={categorie.id}
                type="button"
                className={`filter${active ? ' is-active' : ''}`}
                style={{ '--cat-color': categorie.couleur } as CSSProperties}
                aria-pressed={active}
                onClick={() => onToggleCategory(categorie.id)}
              >
                <span className="swatch" aria-hidden="true">
                  {active && <CheckIcon width={10} height={10} />}
                </span>
                <span className="filter-label">{categorie.libelle}</span>
                <span className="filter-count">{counts.get(categorie.id) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </section>

      {showList && (
        <section className="results" id={listId} aria-label="Liste des espaces">
          <div className="results-header">
            <h2 className="label">
              {filtering ? `${results.length} sur ${total} espaces` : `${total} espaces`}
            </h2>
            {filtering && (
              <button type="button" className="link-button" onClick={onClearFilters}>
                Tout afficher
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <p className="empty">
              {searching
                ? `Aucun espace ne correspond à « ${query.trim()} ». Essayez un autre mot ou retirez un filtre.`
                : 'Aucun espace dans cette sélection.'}
            </p>
          ) : searching ? (
            <ul className="space-list">{results.map(renderItem)}</ul>
          ) : (
            groups.map(({ categorie, espaces }) => (
              <section key={categorie.id} className="space-group">
                <h3 style={{ '--cat-color': categorie.couleur } as CSSProperties}>
                  <span className="swatch" aria-hidden="true" />
                  {categorie.libelle}
                  <span className="space-group-count">{espaces.length}</span>
                </h3>
                <ul className="space-list">{espaces.map(renderItem)}</ul>
              </section>
            ))
          )}
        </section>
      )}

      {isDesktop && (
        <footer className="sidebar-footer">
          <span>
            <kbd>Molette</kbd> zoomer
          </span>
          <span>
            <kbd>Glisser</kbd> {maquette ? 'pivoter' : 'se déplacer'}
          </span>
          <span>
            <kbd>/</kbd> rechercher
          </span>
        </footer>
      )}
    </aside>
  );
}
