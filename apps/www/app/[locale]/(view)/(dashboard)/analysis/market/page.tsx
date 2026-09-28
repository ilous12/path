"use client";

import { DetailLoading } from "@/components/market-performance/detail-loading";
import { Suspense } from "react";
import { AnalysisBackLink } from "@/components/market-performance/analysis-navigation";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModeSwitcher } from "@/components/mode-switcher";
import { AnalysisEvents } from "@/components/market-performance/analysis-events";
import { RefreshingAnalysis } from "@/components/market-performance/refreshing-analysis";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useAnalysisExclusions } from "@/components/market-performance/use-analysis-exclusions";
import {
  getEventType,
  presetRange,
  validateRange,
} from "@/components/market-performance/data";
import { buildEventInsights } from "@/components/market-performance/event-insights";

export default function MarketDetailPage() {
  return (
    <Suspense
      fallback={
        <DetailLoading/>
      }
    >
      <MarketDetail />
    </Suspense>
  );
}
function MarketDetail() {
  const params = useSearchParams();
  const { events } = useEventCatalog();
  const exclusions = useAnalysisExclusions();
  const requested = {
    start: params.get("start") ?? "",
    end: params.get("end") ?? "",
  };
  const range = validateRange(requested) ? presetRange("1M") : requested;
  const workspace = ["aiir", "tdds", "mvvno"].includes(
    params.get("workspace") ?? "",
  )
    ? params.get("workspace")!
    : "aiir";
  const kind = params.get("kind");
  const value = params.get("value") ?? "";
  const valid = (kind === "type" || kind === "operator") && !!value;
  const title = valid
    ? kind === "type"
      ? getEventType(value).label
      : value
    : "선택 항목 없음";
  const scoped = buildEventInsights(
    range,
    exclusions,
    events,
    workspace,
  ).events.filter(
    (event) =>
      valid &&
      (kind === "type"
        ? event.types.includes(value)
        : event.operator === value),
  );
  const channels = [...new Set(scoped.map((e) => e.channel))];
  const actors = [...new Set(scoped.map((e) => e.operator))];
  const types = [...new Set(scoped.flatMap((e) => e.types))];
  const back = `/analysis?${new URLSearchParams({ ...range, workspace })}`;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8">
          <AnalysisBackLink
            href={back}
            className="flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="size-4" />
            상세 분석으로 돌아가기
          </AnalysisBackLink>
          <ModeSwitcher />
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="outline">
              {kind === "operator" ? "사업자별 움직임" : "변화 유형"}
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold">
              {title} · 이벤트 상세
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              선택한 기간의 관련 이벤트와 변경 전후 내용, 출처를 모아
              확인합니다.
            </p>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-4" />
            {range.start} ~ {range.end}
          </p>
        </div>
        <RefreshingAnalysis
          refreshKey={`${workspace}:${range.start}:${range.end}:${kind}:${value}:${exclusions.join(",")}:${events.length}`}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["관련 이벤트", `${scoped.length}건`],
              ["수행 사업자", `${actors.length}개`],
              ["관련 채널", `${channels.length}개`],
            ].map(([label, count]) => (
              <Card key={label}>
                <CardHeader>
                  <CardDescription>{label}</CardDescription>
                  <CardTitle className="text-2xl">{count}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>변화 범위</CardTitle>
              <CardDescription>
                숨긴 이벤트와 설정에서 제외한 참조 대상은 포함하지 않습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 text-sm md:grid-cols-3">
              {[
                ["사업자", actors],
                ["채널", channels],
                ["유형", types.map((t) => getEventType(t).label)],
              ].map(([label, values]) => (
                <div key={String(label)}>
                  <p className="mb-2 text-xs text-muted-foreground">{label}</p>
                  <p className="leading-7">
                    {(values as string[]).join(" · ") || "N/A"}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>관련 이벤트 기록</CardTitle>
              <CardDescription>
                이벤트 상세에서 변경 전·후 정책과 근거를 확인할 수 있습니다. 한
                페이지에 최대 10건을 표시합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnalysisEvents
                key={`${kind}:${value}:${range.start}:${range.end}`}
                events={scoped}
                range={range}
                workspace={workspace}
              />
            </CardContent>
          </Card>
        </RefreshingAnalysis>
      </div>
    </main>
  );
}
