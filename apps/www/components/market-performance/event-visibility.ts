"use client";

import { useSyncExternalStore } from "react";

const key = "mars-hidden-events";
const empty: string[] = [];
let hidden = empty;
let initialized = false;
const listeners = new Set<() => void>();
function initialize() {
  if (initialized || typeof document === "undefined") return;
  initialized = true;
  try {
    const cookie = document.cookie
      .split("; ")
      .find((value) => value.startsWith(`${key}=`));
    const value = JSON.parse(
      decodeURIComponent(cookie?.slice(key.length + 1) ?? "[]"),
    );
    if (Array.isArray(value))
      hidden = value.filter((id) => typeof id === "string");
  } catch {
    hidden = empty;
  }
}
function subscribe(listener: () => void) {
  initialize();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useEventVisibility() {
  const hiddenIds = useSyncExternalStore(
    subscribe,
    () => hidden,
    () => empty,
  );
  const update = (ids: string[], hide: boolean) => {
    initialize();
    const next = new Set(hidden);
    for (const id of ids) {
      if (hide) next.add(id);
      else next.delete(id);
    }
    hidden = [...next];
    document.cookie = `${key}=${encodeURIComponent(JSON.stringify(hidden))}; Path=/; SameSite=Lax`;
    listeners.forEach((listener) => listener());
  };
  return {
    hiddenIds,
    hideEvents: (ids: string[]) => update(ids, true),
    restoreEvent: (id: string) => update([id], false),
  };
}
