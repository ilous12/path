"use client";
import { normalizePresentation } from "./presentation-copy";
import { useSyncExternalStore } from "react";
import { EVENTS, type MarketEvent } from "./data";
import { mergeCustomEvents } from "./event-validation";
import { normalizeLegacyBranding } from "./workspace-identity";
const key = "mars-added-events";
let snapshot = EVENTS;
let initialized = false;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  if (!initialized) {
    initialized = true;
    try {
      const raw = localStorage.getItem(key);
      const saved = normalizeLegacyBranding<MarketEvent[]>(JSON.parse(raw ?? "[]"));
      if (raw && JSON.stringify(saved) !== raw) localStorage.setItem(key, JSON.stringify(saved));
      snapshot = normalizePresentation(mergeCustomEvents(EVENTS, saved));
    } catch {
      /* Use built-in examples when storage is unavailable. */
    }
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useEventCatalog() {
  const events = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EVENTS,
  );
  const addEvent = (event: MarketEvent) => {
    snapshot = normalizePresentation(mergeCustomEvents(snapshot, [event]));
    try {
      localStorage.setItem(
        key,
        JSON.stringify(snapshot.filter((e) => e.id.startsWith("custom-"))),
      );
    } catch {
      /* Keep this session's events in memory. */
    }
    listeners.forEach((listener) => listener());
  };
  return { events, addEvent };
}
