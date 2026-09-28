"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import {
  DEFAULT_PREFERENCES,
  normalizePreferences,
  type AnalysisPreferences,
} from "./analysis-preferences";
import { useEventCatalog } from "./event-catalog";
import { getEventType } from "./data";
import { legacyWorkspaceId, normalizeLegacyBranding } from "./workspace-identity";
const snapshots = new Map<string, AnalysisPreferences>();
const listeners = new Set<() => void>();
const key = (workspace: string) => `mars-analysis-preferences-${workspace}`;
export function useAnalysisPreferences() {
  const workspace = useSearchParams().get("workspace") ?? "aiir";
  const preferences = useSyncExternalStore(
    (listener) => {
      if (!snapshots.has(workspace)) {
        let saved;
        try {
          const current = localStorage.getItem(key(workspace));
          const legacy = legacyWorkspaceId(workspace);
          const legacyValue = legacy ? localStorage.getItem(key(legacy)) : null;
          saved = normalizeLegacyBranding(JSON.parse(current ?? legacyValue ?? "null"));
          if (!current && legacyValue) {
            localStorage.setItem(key(workspace), JSON.stringify(saved));
            localStorage.removeItem(key(legacy!));
          }
        } catch {}
        snapshots.set(workspace, normalizePreferences(saved));
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => snapshots.get(workspace) ?? DEFAULT_PREFERENCES,
    () => DEFAULT_PREFERENCES,
  );
  const { events } = useEventCatalog();
  const save = (next: AnalysisPreferences) => {
    const normalized = normalizePreferences(next);
    localStorage.setItem(key(workspace), JSON.stringify(normalized));
    snapshots.set(workspace, normalized);
    listeners.forEach((listener) => listener());
  };
  useEffect(() => {
    if (!snapshots.has(workspace) || !preferences.autoRegisterTypes) return;
    const ids = [...new Set(events.flatMap((event) => event.types))].filter(
      (id) =>
        id.startsWith("ai:") &&
        !preferences.typeDefinitions.some((type) => type.id === id),
    );
    if (!ids.length) return;
    try {
      save({
        ...preferences,
        typeDefinitions: [
          ...preferences.typeDefinitions,
          ...ids.map((id) => ({
            id,
            label: getEventType(id).label,
            description: getEventType(id).description,
            origin: "AI" as const,
          })),
        ],
        types: {
          ...preferences.types,
          ...Object.fromEntries(ids.map((id) => [id, true])),
        },
      });
    } catch {
      /* Retry when storage becomes available and the catalog changes. */
    }
  }, [events, preferences, workspace]);
  return { preferences, save, workspace };
}
