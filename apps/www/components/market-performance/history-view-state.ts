"use client";
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";

/** UI state belongs to a history entry, not to the latest visit to a URL. */
export function useHistoryViewState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState(initial);
  const initialValue = useRef(value);
  const current = useRef(value);
  useEffect(() => {
    const restore = () => {
      const saved = window.history.state?.marsViewState;
      const next = saved && Object.prototype.hasOwnProperty.call(saved, key) ? saved[key] as T : initialValue.current;
      current.current = next;
      setValue(next);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [key]);
  const update = useCallback((next: SetStateAction<T>) => {
    const resolved = typeof next === "function" ? (next as (v: T) => T)(current.current) : next;
    current.current = resolved;
    setValue(resolved);
    window.history.replaceState({ ...window.history.state, marsViewState: { ...window.history.state?.marsViewState, [key]: resolved } }, "");
  }, [key]);
  return [value, update] as const;
}
