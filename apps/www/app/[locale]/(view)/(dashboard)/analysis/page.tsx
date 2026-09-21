"use client";
import { AnalysisLoading } from "@/components/market-performance/analysis-loading";
import { ForecastLab } from "@/components/market-performance/forecast-lab";
import { EventAnalysis } from "@/components/market-performance/event-analysis";
import {
  ExperimentInsight,
  ExperimentInsightGroup,
} from "@/components/market-performance/experiment-insight";
import { PaginatedAnalysisList } from "@/components/market-performance/paginated-analysis-list";
import { AnalysisMenu } from "@/components/market-performance/analysis-menu";

import { FOCUS_LABELS } from "@/components/market-performance/focus-control";
import { PolicyWorkbench } from "@/components/market-performance/policy-workbench";
import { ChannelAnalysis } from "@/components/market-performance/channel-analysis";
import { useAnalysisPreferences } from "@/components/market-performance/use-analysis-preferences";
import { RefreshingAnalysis } from "@/components/market-performance/refreshing-analysis";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useAnalysisExclusions } from "@/components/market-performance/use-analysis-exclusions";
import { AnalysisBackLink } from "@/components/market-performance/analysis-navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Radar } from "lucide-react";
import { ModeSwitcher } from "@/components/mode-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AnalysisRangeControl,
  type RangeMode,
} from "@/components/market-performance/analysis-range-control";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AnalysisChart } from "@/components/market-performance/analysis-charts";
import { AnalysisEvents } from "@/components/market-performance/analysis-events";
import { buildAnalysis } from "@/components/market-performance/analysis-data";
import {
  presetRange,
  validateRange,
  type Range,
} from "@/components/market-performance/data";

const number = (value: number) => value.toLocaleString("ko-KR");
const percent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
export default function AnalysisPage() {
  return (
    <Suspense fallback={<AnalysisLoading />}>
      <AnalysisRoute />
    </Suspense>
  );
}
function AnalysisRoute() {
  const query = useSearchParams();
  const group = query.get("experiments");
  if (group)
    return (
      <RefreshingAnalysis mode="detail" refreshKey={query.toString()}>
        <ExperimentInsightGroup ids={group.split(",")} />
      </RefreshingAnalysis>
    );
  const experiment = query.get("experiment");
  if (experiment)
    return (
      <RefreshingAnalysis mode="detail" refreshKey={query.toString()}>
        <ExperimentInsight id={experiment} />
      </RefreshingAnalysis>
    );
  if (query.get("channel"))
    return (
      <ChannelAnalysis
        key={`${query.get("workspace")}:${query.get("channel")}:${query.get("start")}:${query.get("end")}`}
      />
    );
  if (query.has("events") || query.has("pivots"))
    return <EventAnalysis />;
  return <AnalysisContent />;
}
function AnalysisContent() {
  const query = useSearchParams();
  const single = (key: string) => query.get(key) ?? "";
  const { events } = useEventCatalog();
  const hiddenIds = useAnalysisExclusions();
  const requested = { start: single("start"), end: single("end") };
  const error = validateRange(requested);
  const requestKey = `${single("workspace")}:${requested.start}:${requested.end}`;
  const [selection, setSelection] = useState<{
    key: string;
    range: Range;
    mode: RangeMode;
  } | null>(null);
  const range =
    selection?.key === requestKey
      ? selection.range
      : error
        ? presetRange("1M")
        : requested;
  const workspace = ["air", "tds", "mvno"].includes(single("workspace"))
    ? single("workspace")
    : "air";
  const workspaceName = workspace === "air" ? "air" : workspace.toUpperCase();
  const { preferences } = useAnalysisPreferences();
  const report = buildAnalysis(
    range,
    hiddenIds,
    events,
    preferences.focus,
    workspace,
  );
  const summary = report.summary;
  const href = (next: Range, path = "/analysis") =>
    `${path}?start=${next.start}&end=${next.end}&workspace=${workspace}`;
  const detailHref = (kind: string, value: string) =>
    `${href(range, "/analysis/market")}&kind=${kind}&value=${encodeURIComponent(value)}`;
  const metrics = [
    { key: "customers", label: "가입 회선", unit: "회선", money: false },
    { key: "cancellations", label: "해지", unit: "건", money: false },
    { key: "revenue", label: "매출", unit: "", money: true },
    { key: "netProfit", label: "순익", unit: "", money: true },
  ] as const;
  const nav = [
    ["overview", "핵심 판단"],
    ["performance", "실적"],
    ["market", "시장 변화"],
    ["policy", "정책 실험"],
    ["evidence", "이벤트 근거"],
  ];
  const alternatives = [
    {
      title: "현행 유지·관찰",
      tag: report.decision === "관망" ? "우선 검토" : "기준 실험",
      benefit: "추가 지출 없이 현재 대응의 지속 효과를 확인합니다.",
      cost: "기존 혜택 비용 유지",
      risk: "경쟁사 변화에 대한 추가 대응이 늦어질 수 있습니다.",
      condition:
        "가입·해지·순익의 동반 악화가 없고, 현행 혜택의 유지 효과가 관측될 때",
    },
    {
      title: "선별 혜택 조정",
      tag: report.decision === "대응 필요" ? "우선 검토" : "실험 후보",
      benefit: "영향을 받은 상품·채널에서 가입 회복을 검증합니다.",
      cost: "혜택 지급액과 획득 비용 증가",
      risk: "단기 가입 후 이탈, 비대상 고객과의 형평성 문제",
      condition:
        "동일 조건 경쟁 상품의 우위가 확인되고, 대상군의 감소가 지속될 때",
    },
    {
      title: "가격·상품 구조 조정",
      tag: "추가 근거 필요",
      benefit: "상품의 장기 경쟁력과 수익 구조를 함께 개선합니다.",
      cost: "가격 인하에 따른 매출 감소 및 운영 변경 비용",
      risk: "기존 고객 수익 감소, 경쟁사의 추가 가격 인하",
      condition:
        "원가·마진과 장기 유지 데이터를 확보하고 실험별 손익을 비교한 뒤",
    },
  ];
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <AnalysisBackLink
            href={`/?workspace=${workspace}`}
            className="flex items-center gap-2 text-sm font-medium hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            비지니스 인사이트
          </AnalysisBackLink>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{workspaceName}</Badge>
            <ModeSwitcher />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        <section
          className="rounded-xl border bg-card p-4 sm:p-5"
          aria-label="상세 분석 조건"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-widest text-primary">
                시장 · 성과 · 정책
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                기간 별 상세 분석
              </h1>
              <p className="text-sm text-muted-foreground">
                변화의 근거를 확인하고, 대응의 우선순위를 정합니다.
              </p>
            </div>
            <div className="space-y-3 text-sm text-muted-foreground sm:text-right">
              <p className="flex items-center gap-2 text-xs sm:justify-end">
                <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  {range.start} ~ {range.end} ({report.days}일)
                </span>
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t pt-4">
            <AnalysisRangeControl
              range={range}
              mode={selection?.key === requestKey ? selection.mode : undefined}
              onChange={(next, mode) => {
                setSelection({ key: requestKey, range: next, mode });
              }}
            />
          </div>
          {error &&
            selection?.key !== requestKey &&
            (requested.start || requested.end) && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error} 기본 1개월로 표시합니다.
              </p>
            )}
        </section>
        <RefreshingAnalysis
          refreshKey={`${workspace}:${range.start}:${range.end}:${preferences.focus}:${hiddenIds.join(",")}:${events.length}`}
        >
          <nav
            aria-label="상세 분석 목차"
            className="flex gap-1 overflow-x-auto border-b pb-2"
          >
            {nav.map(([id, label]) => (
              <Button
                key={id}
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={
                  <a
                    href={`#${id}`}
                    onClick={(event) => {
                      event.preventDefault();
                      window.history.replaceState(
                        window.history.state,
                        "",
                        `#${id}`,
                      );
                      document
                        .getElementById(id)
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  />
                }
              >
                {label}
              </Button>
            ))}
          </nav>

          <section
            id="overview"
            className="scroll-mt-24 grid gap-4 lg:grid-cols-[1.6fr_1fr]"
          >
            <Card className="bg-primary/5 ring-primary/20">
              <CardHeader>
                <CardDescription className="flex items-center gap-2">
                  <Radar className="size-4 text-primary" />
                  AI 핵심 판단 · 검토용
                </CardDescription>
                <CardTitle className="flex items-center gap-3 text-xl">
                  {report.decision}
                  <Badge variant="outline">{summary.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="leading-relaxed">{report.reason}</p>
                <div className="border-t border-primary/15 pt-4">
                  <p className="mb-3 text-xs font-semibold text-primary">
                    영향과 대응 요약
                  </p>
                  <dl className="space-y-3">
                    {[
                      ["발생", summary.occurrence],
                      ["영향", summary.impact],
                      ["대응", summary.response],
                      ["경과", summary.progress],
                    ].map(([label, content]) => (
                      <div
                        key={label}
                        className="flex items-start gap-3 text-sm"
                      >
                        <dt className="w-8 shrink-0 font-semibold text-primary">
                          {label}
                        </dt>
                        <dd className="min-w-0 leading-relaxed text-foreground/85">
                          {content
                            ?.split(/(?<=[.!?])\s+/)
                            .slice(0, label === "영향" ? 3 : 1)
                            .join(" ") || "N/A"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>관측 범위</CardDescription>
                <CardTitle>시장 변화의 밀도</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["전체", summary.events.length],
                    ["우리", summary.ownCount],
                    ["경쟁사", summary.competitorCount],
                  ].map(([label, count]) => (
                    <div key={label} className="space-y-1">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-3xl font-semibold tabular-nums">
                        {count}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          건
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  기간 이전 시작 후 지속 {summary.carried}건 포함 ·{" "}
                  {report.operators.length}개 사업자 관측
                  <br />
                  진행 이벤트와 단일 시점 이벤트를 중복 없이 집계합니다.
                </p>
              </CardContent>
            </Card>
          </section>
          <section id="performance" className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">
                실적은 어떻게 달라졌나요?
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                기간 합계 ·{" "}
                {report.previous
                  ? `직전 동일 기간 ${report.previousRange.start}~${report.previousRange.end} 대비`
                  : "직전 동일 기간 데이터 부족으로 증감률을 표시하지 않습니다."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => {
                const current = report.current[metric.key];
                const previous = report.previous?.[metric.key];
                const change = previous ? (current / previous - 1) * 100 : null;
                return (
                  <Card key={metric.key}>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {metric.label}
                      </p>
                      <p className="break-all text-2xl font-semibold tabular-nums">
                        {metric.money ? "₩" : ""}
                        {number(current)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          {metric.unit}
                        </span>
                      </p>
                      <p className="text-xs font-medium text-primary">
                        {change === null ? "N/A" : percent(change)}{" "}
                        <span className="font-normal text-muted-foreground">
                          전기 대비
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>가입과 해지</CardTitle>
                  <CardDescription>동일 수량 축 · 기간별 합계</CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalysisChart range={range} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>매출과 순익</CardTitle>
                  <CardDescription>순익 = 매출 − 비용 · 금액 ₩</CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalysisChart range={range} money />
                </CardContent>
              </Card>
            </div>
          </section>
          <ForecastLab range={range} />
          <section id="market" className="scroll-mt-24 space-y-4">
            <h2 className="text-lg font-semibold">
              시장에서는 무슨 일이 있었나요?
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>변화 유형</CardTitle>
                  <CardDescription>
                    이벤트 한 건에 여러 유형이 포함될 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PaginatedAnalysisList
                    key={`${workspace}:${range.start}:${range.end}:${preferences.focus}:${summary.typeCounts.map((item) => `${item.type}:${item.count}`).join(",")}`}
                    label="변화 유형"
                    emptyMessage="해당 기간 이벤트가 없습니다."
                  >
                    {summary.typeCounts.map((item) => (
                      <div key={item.type}>
                        <div className="mb-1.5 flex justify-between text-sm">
                          <span>{item.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium tabular-nums">
                              {item.count}건
                            </span>
                            <AnalysisMenu
                              href={detailHref("type", item.type)}
                              label={`${item.label} 메뉴`}
                            />
                          </div>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${(item.count / Math.max(1, summary.events.length)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </PaginatedAnalysisList>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>사업자별 움직임</CardTitle>
                  <CardDescription>
                    변경 빈도를 나타내며 시장점유율을 의미하지 않습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaginatedAnalysisList
                    key={`${workspace}:${range.start}:${range.end}:${preferences.focus}:${report.operators.map((item) => `${item.name}:${item.count}`).join(",")}`}
                    label="사업자별 움직임"
                    emptyMessage="해당 기간 관측된 사업자가 없습니다."
                  >
                    {report.operators.map((operator) => (
                      <div
                        key={operator.name}
                        className="flex items-start justify-between gap-4 border-b pb-3"
                      >
                        <div>
                          <p className="font-medium">{operator.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {operator.channels.join(" · ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{operator.count}건</Badge>
                          <AnalysisMenu
                            href={detailHref("operator", operator.name)}
                            label={`${operator.name} 메뉴`}
                          />
                        </div>
                      </div>
                    ))}
                  </PaginatedAnalysisList>
                </CardContent>
              </Card>
            </div>
          </section>
          <section id="policy" className="scroll-mt-24 space-y-4">
            <PolicyWorkbench
              key={`${workspace}:${range.start}:${range.end}:${preferences.focus}`}
              range={range}
              alternatives={alternatives}
              events={summary.events}
              workspace={workspaceName}
              focus={FOCUS_LABELS[preferences.focus]}
              decision={report.decision}
            />
          </section>
          <section id="evidence" className="scroll-mt-24">
            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <CardTitle>분석 근거 · 이벤트 목록</CardTitle>
                  <CardDescription>
                    기간 내 발생 또는 진행 중인 이벤트입니다. 제목을 선택하면
                    상세 내용으로 이동합니다.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <AnalysisEvents
                  key={`${range.start}-${range.end}`}
                  events={summary.events}
                  range={range}
                  workspace={workspace}
                />
              </CardContent>
            </Card>
          </section>
          <footer className="flex flex-wrap items-start justify-between gap-4 border-t pt-5 pb-6">
            <AnalysisBackLink
              className="flex items-center gap-1 text-sm font-medium text-primary"
              href={`/?workspace=${workspace}`}
            >
              대시보드로 돌아가기
              <ArrowRight className="size-4" />
            </AnalysisBackLink>
          </footer>
        </RefreshingAnalysis>
      </div>
    </main>
  );
}
