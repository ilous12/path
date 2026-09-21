"use client";

// Link entry starts a new analysis; history traversal keeps the existing result.
const entries = new Map<string, number>();
const listeners = new Set<() => void>();
export const analysisEntryStore = {
  get: (pathname: string) => entries.get(pathname) ?? 0,
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  enter: (pathname: string) => {
    entries.set(pathname, (entries.get(pathname) ?? 0) + 1);
    listeners.forEach((listener) => listener());
  },
};
