"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { presetRange, type Range } from "./data";

import type { RangeMode } from "./analysis-range-control";

type Selection = { range: Range; mode: RangeMode };
const initialRange = presetRange("1M");
const initialSelection: Selection = { range: initialRange, mode: "1M" };
const TimelineRangeContext = createContext<{
  ranges: Record<string, Selection>;
  setRanges: Dispatch<SetStateAction<Record<string, Selection>>>;
} | null>(null);

// The shared layout survives detail navigation. A fresh page starts at one month.
export function TimelineRangeProvider({ children }: { children: ReactNode }) {
  const [ranges, setRanges] = useState<Record<string, Selection>>({});
  return (
    <TimelineRangeContext.Provider value={{ ranges, setRanges }}>
      {children}
    </TimelineRangeContext.Provider>
  );
}

export function useTimelineRange(workspace: string) {
  const context = useContext(TimelineRangeContext);
  if (!context) throw new Error("TimelineRangeProvider is required");
  const { ranges, setRanges } = context;
  const setRange = useCallback<Dispatch<SetStateAction<Range>>>(
    (next) =>
      setRanges((current) => {
        const previous = current[workspace] ?? initialSelection;
        const resolved =
          typeof next === "function" ? next(previous.range) : next;
        if (
          resolved.start === previous.range.start &&
          resolved.end === previous.range.end
        )
          return current;
        return { ...current, [workspace]: { range: resolved, mode: "custom" } };
      }),
    [workspace, setRanges],
  );
  const selectRange = useCallback(
    (range: Range, mode: RangeMode) => {
      setRanges((current) => ({ ...current, [workspace]: { range, mode } }));
    },
    [workspace, setRanges],
  );
  const selection = ranges[workspace] ?? initialSelection;
  return [selection.range, setRange, selection.mode, selectRange] as const;
}
