import type { MarketEvent } from "./data";

/** Group nearby markers, preserving every event and the covered date span. */
export function clusterTimelineEvents(
  groups: { key: string; events: MarketEvent[] }[],
  bucketKeys: string[],
  plotWidth: number,
  highlights: { key: string; label: string }[],
) {
  const step = Math.max(
    1,
    Math.ceil((bucketKeys.length * 50) / Math.max(150, plotWidth)),
  );
  const result: {
    key: string;
    endKey: string;
    events: MarketEvent[];
    highlight?: string;
  }[] = [];
  let anchor = -Infinity;
  for (const group of groups) {
    const index = bucketKeys.indexOf(group.key);
    const highlight = highlights.find(
      (point) => point.key === group.key,
    )?.label;
    const previous = result.at(-1);
    if (previous && index - anchor < step) {
      previous.events.push(...group.events);
      previous.endKey = group.key;
      if (highlight)
        previous.highlight = [previous.highlight, highlight]
          .filter(Boolean)
          .join(" · ");
    } else {
      result.push({
        ...group,
        endKey: group.key,
        events: [...group.events],
        highlight,
      });
      anchor = index;
    }
  }
  return result;
}

/** Rollback switch: "combined" restores the original single event row. */
export const EVENT_TIMELINE_LAYOUT: "split" | "combined" | "pivot" = "pivot";
export const EVENT_LANE_HEIGHT = 44;

export function groupTimelineLanes(
  groups: Parameters<typeof clusterTimelineEvents>[0],
  bucketKeys: string[],
  plotWidth: number,
  highlights: (Parameters<typeof clusterTimelineEvents>[3][number] & {
    stages: { date: string; title: string; stage: string }[];
  })[],
  layout: "split" | "combined" | "pivot" = EVENT_TIMELINE_LAYOUT,
  workspace = "aiir",
) {
  const lanes =
    layout !== "combined"
      ? (["external", "own"] as const)
      : (["combined"] as const);
  return lanes.flatMap((lane) => {
    const filtered = groups
      .map((group) => ({
        ...group,
        events: group.events.filter((event) => {
          if (layout === "pivot" && event.types.includes("pivot")) return false;
          const own =
            layout === "pivot"
              ? event.operator.toLowerCase() === workspace.toLowerCase()
              : ["aiir", "tdds", "mvvno"].includes(event.operator.toLowerCase());
          return lane === "combined" || (lane === "own" ? own : !own);
        }),
      }))
      .filter((group) => group.events.length > 0);
    const laneHighlights =
      layout === "pivot"
        ? []
        : lane === "combined"
          ? highlights
          : highlights.flatMap((point) => {
              const stages = point.stages.filter((stage) =>
                lane === "external"
                  ? stage.stage === "급감"
                  : stage.stage !== "급감",
              );
              return stages.length
                ? [
                    {
                      key: point.key,
                      label: stages
                        .map((stage) => `${stage.date} ${stage.title}`)
                        .join(" · "),
                    },
                  ]
                : [];
            });
    return clusterTimelineEvents(
      filtered,
      bucketKeys,
      plotWidth,
      laneHighlights,
    ).map((group) => ({
      ...group,
      id: `${lane}:${group.key}`,
      lane,
      laneLabel:
        lane === "external" ? "경쟁사·기타" : lane === "own" ? workspace : "",
      offset:
        lane === "external"
          ? EVENT_LANE_HEIGHT * (layout === "pivot" ? 2 : 1)
          : 0,
    }));
  });
}

/** Pivot influence extends to the next distinct pivot, or the viewing boundary. */
export type PivotPoint = {
  startAt: string;
  endAt?: string;
  title: string;
  stage: string;
  assessment: "ai" | "demo" | "manual";
  rationale?: string;
};

/** Assign influence before visual clustering so badges never alter boundaries. */
export function withPivotInfluence(points: PivotPoint[], rangeEnd: string): PivotPoint[] {
  const starts = [...new Set(points.map(point => point.startAt))].sort();
  const end = `${rangeEnd}T23:59`;
  return points.map(point => ({
    ...point,
    endAt: starts.find(start => start > point.startAt && start <= end) ?? end,
  }));
}

export function pivotPeriod(points: PivotPoint[]) {
  const starts = points.map(point => point.startAt.slice(0, 10)).sort();
  const ends = points.map(point => (point.endAt ?? point.startAt).slice(0, 10)).sort();
  return { start: starts[0], end: ends.at(-1) };
}

/** Pivot observations are independent of events, so recovery dates remain visible. */
export function clusterTimelinePivots(
  points: { key: string; stages: PivotPoint[] }[],
  bucketKeys: string[],
  plotWidth: number,
) {
  const step = Math.max(
    1,
    Math.ceil((bucketKeys.length * 50) / Math.max(150, plotWidth)),
  );
  const result: { key: string; endKey: string; pivots: PivotPoint[] }[] = [];
  let anchor = -Infinity;
  for (const point of points) {
    const index = bucketKeys.indexOf(point.key);
    const previous = result.at(-1);
    if (previous && index - anchor < step) {
      previous.endKey = point.key;
      previous.pivots.push(...point.stages);
    } else {
      result.push({
        key: point.key,
        endKey: point.key,
        pivots: [...point.stages],
      });
      anchor = index;
    }
  }
  return result;
}
