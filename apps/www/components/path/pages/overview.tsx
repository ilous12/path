"use client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useAnnualTargets } from "@/components/market-performance/home-annual-targets";
import {
  EVENT_KINDS,
  eventKind,
} from "@/components/market-performance/path-intelligence";
import { Button } from "@/components/ui/button";
import {
  CampaignStrip,
  EventList,
  marketEvents,
  ownEvents,
  trendRows,
} from "../blocks";
import { useCampaigns } from "../campaigns";
import { BarList, Donut, Spark, TrendChart } from "../charts";
import { channelInsights, overviewInsights } from "../insights";
import { channelStats, eventsFor } from "../market";
import {
  AS_OF,
  BIZ,
  type Biz,
  compare,
  fmt,
  METRICS,
  monthOutlook,
  perf,
  targetFor,
  yearOutlook,
} from "../model";
import { usePeriod } from "../state";
import {
  Delta,
  InsightPanel,
  Kpi,
  PageHeader,
  PeriodPicker,
  Section,
} from "../ui";

export function NewCampaignButton({ biz }: { biz: Biz }) {
  return (
    <Button
      nativeButton={false}
      render={<Link href={`/?workspace=${biz}&view=campaigns&step=register`} />}
      size="sm"
    >
      <Plus /> 판매 정책
    </Button>
  );
}

export function OverviewPage({ biz }: { biz: Biz }) {
  const { range, period } = usePeriod();
  const [targets] = useAnnualTargets();
  const { events } = useEventCatalog();
  const { items: campaigns } = useCampaigns();
  const c = useMemo(() => compare(biz, range), [biz, range]);
  const t = targetFor(biz, range, targets);
  const m = monthOutlook(biz, targets);
  const y = yearOutlook(biz, targets);
  const list = eventsFor(biz, range, events);
  const market = marketEvents(list);
  const own = ownEvents(list);
  const rows = trendRows([biz], range, targets, period === "mtd");
  const spark = perf(biz, range);
  const kinds = Object.entries(
    market.reduce<Record<string, number>>((a, e) => {
      const k = eventKind(e);
      a[k] = (a[k] ?? 0) + 1;
      return a;
    }, {}),
  ).map(([k, n]) => ({
    name: EVENT_KINDS[k as keyof typeof EVENT_KINDS].label,
    value: n,
    color: EVENT_KINDS[k as keyof typeof EVENT_KINDS].color,
  }));
  const channels = biz === "mvvno" ? [] : channelStats(biz, range);
  const insights = [
    ...overviewInsights(biz, range, targets, list, campaigns),
    ...channelInsights(channels).slice(0, 1),
  ];
  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <>
            <PeriodPicker />
            <NewCampaignButton biz={biz} />
          </>
        }
        description="시장 요약, 실적·순증 목표·달성률, 주요 시장 동향과 판매 정책 변경"
        eyebrow={
          <>
            <span
              className="size-2 rounded-full"
              style={{ background: BIZ[biz].color }}
            />{" "}
            {BIZ[biz].name} · {BIZ[biz].full}
          </>
        }
        title="현황"
      />
      <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {METRICS.map((mt) => (
          <Kpi
            accent={mt.key === "lines" ? BIZ[biz].color : undefined}
            delta={c.delta[mt.key]}
            inverse={"inverse" in mt}
            key={mt.key}
            label={mt.key === "net" ? "순증 · 목표" : mt.label}
            pace={mt.key === "net" && period === "mtd" ? m.pace : undefined}
            rate={
              mt.key === "net"
                ? t.net
                  ? (c.cur.net / t.net) * 100
                  : null
                : undefined
            }
            spark={
              mt.key === "lines" ? (
                <Spark
                  color={BIZ[biz].color}
                  values={spark.map((r) => r.lines)}
                />
              ) : undefined
            }
            target={mt.key === "net" ? `목표 ${fmt.n(t.net)}` : undefined}
            unit={mt.unit}
            value={
              mt.unit === "원" ? fmt.won(c.cur[mt.key]) : fmt.n(c.cur[mt.key])
            }
          />
        ))}
        <Kpi
          label="월말 · 연말 전망"
          rate={m.target ? (m.forecastEnd / m.target) * 100 : null}
          target={`연말 ${fmt.n(y.yearEnd)} / ${fmt.n(y.target)}`}
          unit="회선"
          value={fmt.n(m.forecastEnd)}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Section
          meta={period === "mtd" ? "실적 · 목표 · 월말 전망" : "실적 · 목표"}
          title="일별 가입 추이"
        >
          <TrendChart
            band={period === "mtd" ? "band" : undefined}
            data={rows}
            forecast={period === "mtd" ? "forecast" : undefined}
            height={300}
            markers={own.map((e) => ({
              x: e.startAt.slice(0, 10),
              color: BIZ[biz].color,
              label: e.title,
            }))}
            series={[{ key: biz, name: BIZ[biz].name, color: BIZ[biz].color }]}
            target="target"
            today={AS_OF}
          />
        </Section>
        <InsightPanel
          items={insights}
          scope={[
            BIZ[biz].name,
            `${fmt.md(range.start)}–${fmt.md(range.end)}`,
            "전 채널",
          ]}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Section meta={`${market.length}건`} title="시장 요약">
          <div className="flex items-center gap-4">
            <Donut
              center={String(market.length)}
              data={
                kinds.length
                  ? kinds
                  : [{ name: "없음", value: 1, color: "var(--muted)" }]
              }
              size={112}
              sub="시장 변화"
            />
            <ul className="flex-1 space-y-1.5 text-[12px]">
              {kinds.map((k) => (
                <li className="flex items-center justify-between" key={k.name}>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: k.color }}
                    />
                    {k.name}
                  </span>
                  <span className="font-medium tabular-nums">{k.value}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 border-t pt-2">
            <EventList events={market} limit={4} ws={biz} />
          </div>
        </Section>
        <Section meta={`${own.length}건`} title="판매 정책 변경">
          <EventList events={own} limit={4} ws={biz} />
          <div className="mt-3 border-t pt-3">
            <CampaignStrip campaigns={campaigns} ws={biz} />
          </div>
        </Section>
        <Section
          actions={
            biz === "mvvno" ? undefined : (
              <Link
                className="text-[11px] text-primary hover:underline"
                href={`/?workspace=${biz}&view=products#channels`}
              >
                채널 분석 →
              </Link>
            )
          }
          meta="기간 가입 · 직전 대비"
          title={biz === "mvvno" ? "주요 지표" : "채널 기여"}
        >
          {channels.length ? (
            <BarList
              items={channels.map((ch) => ({
                label: ch.id,
                value: ch.lines,
                color: BIZ[biz].color,
                note: <Delta value={ch.delta} />,
              }))}
            />
          ) : (
            <BarList
              items={METRICS.slice(0, 3).map((mt) => ({
                label: mt.label,
                value: c.cur[mt.key],
                color: BIZ[biz].color,
                note: (
                  <Delta inverse={"inverse" in mt} value={c.delta[mt.key]} />
                ),
              }))}
            />
          )}
        </Section>
      </div>
    </div>
  );
}
