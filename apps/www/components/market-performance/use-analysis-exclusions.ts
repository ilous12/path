"use client";
import { useMemo } from "react";
import { useEventCatalog } from "./event-catalog";
import { useEventVisibility } from "./event-visibility";
import { useAnalysisPreferences } from "./use-analysis-preferences";
import { isReferenced } from "./analysis-preferences";
export function useAnalysisExclusions() {
  const { events } = useEventCatalog();
  const { hiddenIds } = useEventVisibility();
  const { preferences } = useAnalysisPreferences();
  return useMemo(
    () => [
      ...new Set([
        ...hiddenIds,
        ...events
          .filter((event) => !isReferenced(event, preferences))
          .map((event) => event.id),
      ]),
    ],
    [events, hiddenIds, preferences],
  );
}
