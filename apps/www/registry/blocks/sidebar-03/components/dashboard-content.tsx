"use client";
import { MAX_DATE } from "@/components/market-performance/data";
import { dayShift } from "@/components/market-performance/alternative-model";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { useTimelineRange } from "@/components/market-performance/timeline-range";
import { ChartMixedAxes } from "./chart-mixed-axes";
import { AnalysisRangeControl } from "@/components/market-performance/analysis-range-control";
import { RefreshingAnalysis } from "@/components/market-performance/refreshing-analysis";
import { DecisionOverview } from "@/components/market-performance/decision-workspace";
import { daysBetween } from "@/components/market-performance/data";
import { WorkspaceIntelligence } from "@/components/market-performance/intelligence-ui";
import type { HomeBusiness } from "@/components/market-performance/home-performance";

export function DashboardContent({
  showOnboarding: _showOnboarding = true,
}: {
  showOnboarding?: boolean;
}) {
  const params = useSearchParams();
  const [refreshRevision, setRefreshRevision] = useState(0);
  const workspace = params.get("workspace") ?? "air";
  const [range, , rangeMode, selectRange] = useTimelineRange(workspace);
  const name = workspace === "air" ? "AIR" : workspace.toUpperCase();
  return (
    <div className="@container mx-auto flex w-full min-w-0 max-w-none flex-1 flex-col gap-3 pb-4">
      <header aria-label="조회 조건" className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-xl font-semibold tracking-tight">{name} 현황</h1>
          <p className="text-xs text-muted-foreground">시장 변화 → 변곡점 → 판매정책</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <DecisionOverview range={range} workspace={workspace} />
          <div className="flex h-8 items-center gap-2 rounded-lg border bg-card px-2.5 text-xs tabular-nums">
            <CalendarDays aria-hidden className="size-3.5 text-muted-foreground" />
            <span>{range.start} — {range.end}</span>
            <span className="border-l pl-2 text-muted-foreground">{daysBetween(range.start, range.end)}일</span>
          </div>
        </div>
      </header>
      <RefreshingAnalysis refreshKey={`${workspace}:${refreshRevision}`} mode="detail">
        <div className="flex flex-col gap-3">
          {["air", "tds", "mvno"].includes(workspace) && (
            <WorkspaceIntelligence business={workspace as HomeBusiness} range={range} />
          )}
          <ChartMixedAxes range={range} onRangeChange={(next) => selectRange(next, "custom")} periodControl={<AnalysisRangeControl maxSelectableDate={dayShift(MAX_DATE,180)} range={range} mode={rangeMode} onChange={(next, mode) => {selectRange(next, mode);setRefreshRevision(value=>value+1);}} />} />
        </div>
      </RefreshingAnalysis>
    </div>
  );
}
