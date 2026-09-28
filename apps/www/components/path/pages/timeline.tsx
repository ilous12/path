"use client";
import Link from "next/link";
import { useMemo } from "react";
import type { MarketEvent } from "@/components/market-performance/data";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useAnnualTargets } from "@/components/market-performance/home-annual-targets";
import {
  Tabs,
  TabsListContent,
  TabsPanel,
  TabsTab,
} from "@/components/ui/tabs";
import { trendRows } from "../blocks";
import {
  type Campaign,
  forecast,
  STATUS_LABEL,
  useCampaigns,
} from "../campaigns";
import { TrendChart } from "../charts";
import { timelineInsights } from "../insights";
import {
  detectPivots,
  eventImpact,
  eventsFor,
  isOwn,
  kindLabel,
} from "../market";
import { AS_OF, BIZ, type Biz, days, fmt } from "../model";
import { usePeriod, usePivotCriteria } from "../state";
import {
  type Column,
  DataTable,
  Delta,
  InsightPanel,
  PageHeader,
  PeriodPicker,
  Section,
  Tag,
  useTable,
} from "../ui";

type EventRow = {
  e: MarketEvent;
  impact: number | null;
  progress: number | null;
  response: MarketEvent | null;
};

function Legend() {
  const items = [
    ["시장·타사", "var(--color-gray-400)", "line"],
    ["자사 판매정책", "var(--primary)", "line"],
    ["변곡점", "var(--color-blue-600)", "line"],
    ["캠페인 기간", "var(--color-amber-400)", "area"],
    ["목표", "var(--foreground)", "dash"],
  ] as const;
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {items.map(([l, c, k]) => (
        <span className="flex items-center gap-1.5" key={l}>
          <span
            className={
              k === "area"
                ? "h-2.5 w-3 rounded-sm opacity-40"
                : k === "dash"
                  ? "w-3 border-t-2 border-dashed"
                  : "h-3 w-0.5"
            }
            style={k === "dash" ? { borderColor: c } : { background: c }}
          />
          {l}
        </span>
      ))}
    </div>
  );
}

function Gantt({ items, biz }: { items: Campaign[]; biz: Biz }) {
  if (!items.length)
    return (
      <p className="text-[12px] text-muted-foreground">
        등록된 캠페인이 없습니다.
      </p>
    );
  const start = items.reduce(
    (m, c) => (c.params.start < m ? c.params.start : m),
    items[0].params.start,
  );
  const end = items.reduce(
    (m, c) => (c.params.end > m ? c.params.end : m),
    items[0].params.end,
  );
  const total = days({ start, end });
  const pos = (d: string) => ((days({ start, end: d }) - 1) / total) * 100;
  return (
    <div className="space-y-2">
      <div className="relative ml-[38%] h-5 text-[10px] text-muted-foreground">
        <span className="absolute left-0">{fmt.md(start)}</span>
        <span className="absolute right-0">{fmt.md(end)}</span>
        {AS_OF >= start && AS_OF <= end && (
          <span
            className="absolute top-0 -translate-x-1/2 font-semibold text-primary"
            style={{ left: `${pos(AS_OF)}%` }}
          >
            오늘
          </span>
        )}
      </div>
      {items.map((c) => {
        const { rows, summary } = forecast(c.workspace, c.params);
        const seen = rows.filter((r) => r.actual !== null && r.inWindow);
        const actual = seen.reduce((s, r) => s + (r.actual ?? 0) - r.base, 0);
        const plan = seen.reduce((s, r) => s + r.plan - r.base, 0);
        return (
          <div
            className="grid grid-cols-[38%_1fr] items-center gap-0 text-[12px]"
            key={c.id}
          >
            <div className="min-w-0 pr-3">
              <Link
                className="block truncate font-medium hover:underline"
                href={`/?workspace=${biz}&view=campaigns&step=analyze&id=${c.id}`}
              >
                {c.name}
              </Link>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {STATUS_LABEL[c.status]} · 예측 +{fmt.n(summary.net)}
                {seen.length
                  ? ` · 실적 ${fmt.rate(plan ? (actual / plan) * 100 : null)}`
                  : ""}
              </span>
            </div>
            <div className="relative h-7 rounded-md bg-muted/40">
              <div
                className="absolute inset-y-1 rounded"
                style={{
                  left: `${pos(c.params.start)}%`,
                  width: `${Math.max(1.5, pos(c.params.end) - pos(c.params.start))}%`,
                  background: BIZ[c.workspace].color,
                  opacity: c.status === "draft" ? 0.35 : 0.85,
                }}
              />
              {AS_OF >= start && AS_OF <= end && (
                <span
                  className="absolute inset-y-0 w-0.5 bg-primary"
                  style={{ left: `${pos(AS_OF)}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TimelinePage({ biz }: { biz: Biz }) {
  const { range, period } = usePeriod("qtd");
  const [targets] = useAnnualTargets();
  const [criteria] = usePivotCriteria();
  const { events } = useEventCatalog();
  const { items } = useCampaigns();
  const list = useMemo(
    () => eventsFor(biz, range, events),
    [biz, range, events],
  );
  const pivots = useMemo(
    () => detectPivots(biz, range, criteria),
    [biz, range, criteria],
  );
  const campaigns = items
    .filter((c) => c.workspace === biz)
    .sort((a, b) => a.params.start.localeCompare(b.params.start));
  const rows = trendRows([biz], range, targets, period === "mtd");
  const eventRows: EventRow[] = useMemo(
    () =>
      list.map((e) => {
        const at = e.startAt.slice(0, 10);
        const hit = eventImpact(biz, at);
        const response = isOwn(e)
          ? null
          : (list
              .filter(
                (o) =>
                  isOwn(o) &&
                  o.startAt.slice(0, 10) >= at &&
                  days({ start: at, end: o.startAt.slice(0, 10) }) <= 11,
              )
              .at(-1) ?? null);
        return { e, impact: hit.impact, progress: hit.progress, response };
      }),
    [list, biz],
  );
  const columns: Column<EventRow>[] = [
    {
      key: "date",
      label: "발생",
      render: (r) => fmt.md(r.e.startAt),
      sort: (r) => r.e.startAt,
    },
    {
      key: "kind",
      label: "구분",
      render: (r) => (
        <Tag color={kindLabel(r.e).color}>
          {isOwn(r.e) ? `${kindLabel(r.e).label} 정책` : kindLabel(r.e).label}
        </Tag>
      ),
    },
    {
      key: "title",
      label: "이벤트",
      className: "max-w-[340px]",
      render: (r) => (
        <Link
          className="line-clamp-1 hover:underline"
          href={`/events/${encodeURIComponent(r.e.id)}?workspace=${biz}`}
        >
          {r.e.title}
        </Link>
      ),
    },
    {
      key: "impact",
      label: "영향(7일)",
      align: "right",
      render: (r) => <Delta value={r.impact} />,
      sort: (r) => r.impact ?? 0,
    },
    {
      key: "response",
      label: "대응",
      className: "max-w-[220px]",
      render: (r) =>
        r.response ? (
          <span className="line-clamp-1">{r.response.title}</span>
        ) : (
          <span className="text-muted-foreground">
            {isOwn(r.e) ? "자사 조치" : "미대응"}
          </span>
        ),
    },
    {
      key: "progress",
      label: "경과(현재)",
      align: "right",
      render: (r) => <Delta value={r.progress} />,
      sort: (r) => r.progress ?? 0,
    },
  ];
  const table = useTable(
    eventRows,
    {
      search: (r) => r.e.title,
      filters: [
        {
          key: "kind",
          label: "구분",
          options: [
            { value: "own", label: "자사 정책" },
            { value: "market", label: "시장·타사" },
          ],
          test: (r, v) => (v === "own") === isOwn(r.e),
        },
        {
          key: "impact",
          label: "영향",
          options: [
            { value: "neg", label: "부정 영향" },
            { value: "pos", label: "긍정 영향" },
          ],
          test: (r, v) =>
            v === "neg" ? (r.impact ?? 0) < 0 : (r.impact ?? 0) > 0,
        },
      ],
      pageSize: 8,
      initialSort: { key: "date", dir: -1 },
    },
    columns,
  );
  return (
    <div className="space-y-4">
      <PageHeader
        actions={<PeriodPicker fallback="qtd" />}
        description="실적과 이벤트 연결 · 발생·영향·대응·경과 분석 · 캠페인 일정·예측·실적 비교"
        eyebrow={
          <>
            {BIZ[biz].name} · {BIZ[biz].full}
          </>
        }
        title="이벤트 타임라인"
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Section
          actions={<Legend />}
          meta={`이벤트 ${list.length} · 변곡점 ${pivots.length} · 캠페인 ${campaigns.length}`}
          title="실적 × 이벤트"
        >
          <TrendChart
            band={period === "mtd" ? "band" : undefined}
            data={rows}
            forecast={period === "mtd" ? "forecast" : undefined}
            height={340}
            markers={[
              ...list
                .filter((e) => !isOwn(e))
                .map((e) => ({
                  x: e.startAt.slice(0, 10),
                  color: "var(--color-gray-400)",
                  label: e.title,
                })),
              ...list.filter(isOwn).map((e) => ({
                x: e.startAt.slice(0, 10),
                color: "var(--primary)",
                label: e.title,
              })),
              ...pivots.map((p) => ({
                x: p.date,
                color:
                  p.pct < 0 ? "var(--color-rose-500)" : "var(--color-blue-600)",
                label: `변곡 ${fmt.pct(p.pct, 0)}`,
              })),
            ]}
            series={[{ key: biz, name: BIZ[biz].name, color: BIZ[biz].color }]}
            target="target"
            today={AS_OF}
            windows={campaigns
              .filter(
                (c) =>
                  c.status !== "draft" &&
                  c.params.end >= range.start &&
                  c.params.start <= range.end,
              )
              .map((c, _, shown) => ({
                from:
                  c.params.start < range.start ? range.start : c.params.start,
                to: c.params.end > range.end ? range.end : c.params.end,
                color: "var(--color-amber-400)",
                label: shown.length <= 2 ? c.name : undefined,
              }))}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {pivots.slice(0, 6).map((p) => (
              <Link
                className="rounded-lg border px-2.5 py-1.5 text-[12px] hover:border-primary/40"
                href={`/analysis?workspace=${biz}&pivots=${p.date}&start=${range.start}&end=${range.end}`}
                key={p.date}
              >
                <span className="text-muted-foreground">
                  {fmt.md(p.date)} 변곡
                </span>{" "}
                <Delta digits={0} value={p.pct} />
              </Link>
            ))}
          </div>
        </Section>
        <InsightPanel
          items={timelineInsights(biz, pivots, list, items)}
          scope={[
            BIZ[biz].name,
            `${fmt.md(range.start)}–${fmt.md(range.end)}`,
            `변곡 기준 ±${criteria.thresholdPct}%`,
          ]}
        />
      </div>
      <Tabs defaultValue="events">
        <TabsListContent aria-label="분석 보기" className="w-fit">
          <TabsTab className="px-3 text-xs" value="events">
            발생·영향·대응·경과
          </TabsTab>
          <TabsTab className="px-3 text-xs" value="campaigns">
            캠페인 일정·예측·실적
          </TabsTab>
        </TabsListContent>
        <TabsPanel value="events">
          <Section
            meta="영향 = 발생 후 7일 평균 가입 vs 직전 7일 · 경과 = 최근 7일 vs 직전 7일"
            title="이벤트 영향 분석"
          >
            <DataTable
              dense
              rowKey={(r) => r.e.id}
              searchLabel="이벤트 검색"
              table={table}
            />
          </Section>
        </TabsPanel>
        <TabsPanel value="campaigns">
          <Section
            meta="막대 = 기간 · 초안은 흐리게"
            title="캠페인 일정 · 예측 · 실적"
          >
            <Gantt biz={biz} items={campaigns} />
          </Section>
        </TabsPanel>
      </Tabs>
    </div>
  );
}
