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
const snapshots = new Map<string, AnalysisPreferences>();
const listeners = new Set<() => void>();
const key = (workspace: string) => `mars-analysis-preferences-${workspace}`;
export function useAnalysisPreferences() {
  const workspace = useSearchParams().get("workspace") ?? "air";
  const preferences = useSyncExternalStore(
    (listener) => {
      if (!snapshots.has(workspace)) {
        let saved;
        try {
          saved = JSON.parse(localStorage.getItem(key(workspace)) ?? "null");
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
