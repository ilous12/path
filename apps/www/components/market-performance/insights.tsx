"use client";
import { useAnalysisPreferences } from "./use-analysis-preferences";
import { assessFocus } from "./focus-assessment";

import { useEventCatalog } from "./event-catalog";
import {
  Sparkles,
  Radio,
  TrendingDown,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalysisExclusions } from "./use-analysis-exclusions";
import { AnalysisMenu } from "./analysis-menu";
import { Badge } from "@/components/ui/badge";
import { buildPerformance, type Range } from "./data";
import { buildEventInsights } from "./event-insights";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function HighlightMetrics({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/(₩[\d,]+|[+-]?\d[\d,]*(?:\.\d+)?(?:%|회선|건))/g)
        .map((part, index) =>
          index % 2 === 1 ? (
            <strong
              key={index}
              className="font-semibold text-blue-700 dark:text-sky-300 tabular-nums"
            >
              {part}
            </strong>
          ) : (
            part
          ),
        )}
    </>
  );
}

export function PerformanceInsights({ range }: { range: Range }) {
  const workspace = useSearchParams().get("workspace") ?? "air";
  const { events } = useEventCatalog();
  const { preferences } = useAnalysisPreferences();
  const focus = preferences.focus;
  const assessment = assessFocus(range, focus);
  const hiddenIds = useAnalysisExclusions();
  const rangeKey = `${workspace}:${range.start}:${range.end}:${hiddenIds.join(",")}:${events.length}:${focus}`;
  const [readyKey, setReadyKey] = useState(rangeKey);
  const loading = readyKey !== rangeKey;
  useEffect(() => {
    const timer = window.setTimeout(() => setReadyKey(rangeKey), 600);
    return () => window.clearTimeout(timer);
  }, [rangeKey]);
  const summary = useMemo(
    () => buildEventInsights(range, hiddenIds, events, workspace),
    [range, hiddenIds, events, workspace],
  );

  const focusMetrics = useMemo(() => {
    const rows = buildPerformance(range, "day");
    const key = focus === "retention" ? "cancellations" : "netProfit";
    const total = rows.reduce((sum, row) => sum + row[key], 0);
    const last = rows.at(-1)?.[key] ?? 0;
    const format = (value: number) =>
      `${focus === "profit" ? "₩" : ""}${value.toLocaleString("ko-KR")}${focus === "retention" ? "건" : ""}`;
    return {
      impact: `선택 기간의 ${focus === "retention" ? "누적 해지" : "누적 순익"}는 ${format(total)}입니다. ${focus === "retention" ? "해지 추이와 경쟁사·유지 정책 변경을 함께 점검합니다." : "혜택 확대 비용과 매출 변화를 함께 검토합니다."} 이벤트별 기여도는 추가 확인이 필요합니다.`,
      progress: `${range.end}의 ${focus === "retention" ? "일간 해지" : "일간 순익"}는 ${format(last)}입니다. ${focus === "retention" ? "대응 이후 해지 감소가 지속되는지 관찰합니다." : "가입 회복과 수익 개선이 함께 이어지는지 확인합니다."}`,
    };
  }, [range, focus]);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || loading) return;
    const measure = () => setWidth(container.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [loading]);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || loading) return;
    const measure = () => setHeight(content.getBoundingClientRect().height + 2);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [loading, summary]);

  return (
    <div ref={containerRef} className="w-full min-w-0">
      <section
        aria-label="기간별 비지니스 인사이트"
        className="relative overflow-hidden rounded-xl border bg-card transition-[width,height] duration-300 ease-in-out motion-reduce:transition-none"
        style={{ height, width }}
        aria-live="polite"
        aria-busy={loading}
      >
        <div
          ref={contentRef}
          aria-hidden={loading}
          className={`p-4 sm:p-5 space-y-4 transition-opacity duration-200 motion-reduce:transition-none ${loading ? "opacity-0" : "opacity-100"}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 text-primary" />
            <h2 className="text-base font-semibold">비지니스 인사이트</h2>
            <Badge variant="outline">{assessment.decision}</Badge>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {range.start} ~ {range.end}
            </span>
            <AnalysisMenu
              label="비지니스 인사이트 메뉴"
              href={`/analysis?start=${range.start}&end=${range.end}&workspace=${encodeURIComponent(workspace)}`}
            />
          </div>
          <p className="rounded-lg bg-primary/5 px-3 py-2 text-sm leading-relaxed text-primary">
            {summary.events.length
              ? assessment.text
              : "선택 기간에 참조할 이벤트가 없습니다."}
          </p>
          <dl className="grid gap-3 text-sm leading-relaxed md:grid-cols-2 xl:grid-cols-4">
            {[
              ["발생", summary.occurrence],
              [
                "영향",
                focus !== "growth" && summary.impact
                  ? focusMetrics.impact
                  : summary.impact,
              ],
              ["대응", summary.response],
              [
                "경과",
                focus !== "growth" && summary.progress
                  ? focusMetrics.progress
                  : summary.progress,
              ],
            ].map(([label, content], index) => {
              const Icon = [Radio, TrendingDown, ShieldCheck, Activity][index];
              return (
                <div
                  key={label}
                  className="min-w-0 rounded-xl border bg-muted/20 p-4"
                >
                  <dt className="mb-3 flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 text-primary" />
                      {label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      0{index + 1}
                    </span>
                  </dt>
                  <dd className="min-w-0 leading-7 text-foreground/90">
                    {content ? (
                      <HighlightMetrics text={content} />
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
          {summary.events.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                분석 대상 이벤트 {summary.events.length}건 보기
              </summary>
              <ul className="mt-2 max-h-48 overflow-y-auto space-y-1">
                {summary.events.map((event) => (
                  <li key={event.id}>
                    <Link
                      className="block rounded px-2 py-1.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                      href={`/analysis?start=${range.start}&end=${range.end}&workspace=${encodeURIComponent(workspace)}`}
                    >
                      {event.startAt.replace("T", " ")} · {event.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        {loading && (
          <div className="absolute inset-0 flex flex-col gap-3 p-4">
            <span className="sr-only">인사이트를 업데이트하고 있습니다.</span>
            <Skeleton
              aria-hidden="true"
              className="h-5 w-56 max-w-full shrink-0 rounded-md motion-reduce:animate-none"
            />
            <div
              aria-hidden="true"
              className="flex min-h-0 flex-1 flex-col justify-between gap-2"
            >
              {["발생", "영향", "대응", "경과"].map((label, index) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-7 shrink-0 font-semibold text-primary">
                    {label}
                  </span>
                  <Skeleton
                    className={`h-5 rounded-md motion-reduce:animate-none ${index % 2 ? "w-4/5" : "flex-1"}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
