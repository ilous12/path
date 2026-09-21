"use client";
import { DataBasis } from "@/components/market-performance/data-basis";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { useTimelineRange } from "@/components/market-performance/timeline-range";
import { ChartMixedAxes } from "./chart-mixed-axes";
import { ChannelPerformance } from "./channel-performance";
import { AnalysisRangeControl } from "@/components/market-performance/analysis-range-control";
import { RefreshingAnalysis } from "@/components/market-performance/refreshing-analysis";
import { DecisionOverview } from "@/components/market-performance/decision-workspace";
import { daysBetween } from "@/components/market-performance/data";

export function DashboardContent({
  showOnboarding: _showOnboarding = true,
}: {
  showOnboarding?: boolean;
}) {
  const params = useSearchParams();
  const [refreshRevision, setRefreshRevision] = useState(0);
  const workspace = params.get("workspace") ?? "air";
  const [range, , rangeMode, selectRange] = useTimelineRange(workspace);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("start") && !url.searchParams.has("end")) return;
    url.searchParams.delete("start");
    url.searchParams.delete("end");
    const query = url.searchParams.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${query ? `?${query}` : ""}${url.hash}`,
    );
  }, [params]);
  return (
    <div className="@container mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col gap-3 sm:gap-4">
      <section aria-label="타임라인 공통 분석 조건" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>

            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              시장.정책 현황
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-xs tabular-nums sm:text-sm">
            <CalendarDays
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            <span>
              {range.start} — {range.end}
            </span>
            <span className="border-l pl-2 text-muted-foreground">
              {daysBetween(range.start, range.end)}일
            </span>
          </div>
        </div>
      </section>
      <RefreshingAnalysis refreshKey={`${workspace}:${refreshRevision}`} mode="detail">
      <DecisionOverview range={range} workspace={workspace} />
      <section aria-label="시장과 실적 흐름" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-xs font-semibold tracking-wider text-primary">
            01 · 흐름 관찰
          </p>
          <DataBasis label="합성 데이터" details="실적은 합성 데이터이며 실제 보도와의 인과관계는 확인되지 않았습니다." />
        </div>
        <ChartMixedAxes range={range} onRangeChange={(next) => selectRange(next, "custom")} periodControl={<AnalysisRangeControl compact range={range} mode={rangeMode} onChange={(next, mode) => {selectRange(next, mode);setRefreshRevision(value=>value+1);}} />} />
      </section>
      <ChannelPerformance range={range} workspace={workspace} />
      </RefreshingAnalysis>
    </div>
  );
}
