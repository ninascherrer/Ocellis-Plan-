import { useCallback, useEffect, useMemo, useState } from 'react';
import { configFichier } from '../config';
import { fingerprint, serializeConfig } from '../lib/exportConfig';
import type { PlanConfig } from '../types';

const STORAGE_KEY = 'ocellis-plan:brouillon:v1';
const HISTORY_LIMIT = 100;
const fileFingerprint = fingerprint(serializeConfig(configFichier));

interface StoredDraft {
  base: string;
  savedAt: string;
  config: PlanConfig;
}

interface History {
  past: PlanConfig[];
  present: PlanConfig;
  future: PlanConfig[];
}

function readDraft(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredDraft;
    return Array.isArray(draft?.config?.espaces) ? draft : null;
  } catch {
    return null;
  }
}

/**
 * Configuration modifiable depuis l'éditeur visuel : historique annuler /
 * rétablir et brouillon conservé dans le navigateur (localStorage) tant que
 * le fichier `espaces.json` n'a pas été remplacé par l'export.
 *
 * Hors mode édition, c'est toujours le fichier qui fait foi.
 */
export function useEditableConfig(enabled: boolean) {
  const initialDraft = useMemo(() => (enabled ? readDraft() : null), [enabled]);
  const [history, setHistory] = useState<History>(() => ({
    past: [],
    present: initialDraft?.config ?? configFichier,
    future: [],
  }));
  const [hasDraft, setHasDraft] = useState(initialDraft !== null);
  const [savedAt, setSavedAt] = useState<string | null>(initialDraft?.savedAt ?? null);
  /** Le fichier a été modifié depuis la création du brouillon : le brouillon risque de l'écraser. */
  const [draftIsStale, setDraftIsStale] = useState(initialDraft !== null && initialDraft.base !== fileFingerprint);

  useEffect(() => {
    if (!enabled || !hasDraft) return;
    const handle = setTimeout(() => {
      const now = new Date().toISOString();
      try {
        const draft: StoredDraft = { base: fileFingerprint, savedAt: now, config: history.present };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setSavedAt(now);
      } catch {
        // Stockage indisponible (navigation privée…) : l'export reste possible.
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [enabled, hasDraft, history.present]);

  /** Mémorise l'état courant dans l'historique (avant un glisser ou une saisie). */
  const checkpoint = useCallback(() => {
    setHistory((h) => ({ past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: h.present, future: [] }));
  }, []);

  /** Modifie la configuration ; `record: false` pour les mises à jour continues (glisser, frappe). */
  const update = useCallback((recipe: (config: PlanConfig) => PlanConfig, { record = true } = {}) => {
    setHistory((h) => {
      const next = recipe(h.present);
      if (next === h.present) return h;
      return record
        ? { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] }
        : { ...h, present: next };
    });
    setHasDraft(true);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) =>
      h.past.length === 0
        ? h
        : { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] },
    );
  }, []);

  const redo = useCallback(() => {
    setHistory((h) =>
      h.future.length === 0 ? h : { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) },
    );
  }, []);

  /** Abandonne le brouillon et recharge le contenu du fichier. */
  const resetToFile = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignoré
    }
    setHistory({ past: [], present: configFichier, future: [] });
    setHasDraft(false);
    setDraftIsStale(false);
    setSavedAt(null);
  }, []);

  return {
    config: history.present,
    update,
    checkpoint,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    hasDraft,
    draftIsStale,
    savedAt,
    resetToFile,
  };
}

export type EditableConfig = ReturnType<typeof useEditableConfig>;
