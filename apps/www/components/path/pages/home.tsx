"use client";
import { useMemo } from "react";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useAnnualTargets } from "@/components/market-performance/home-annual-targets";
import { CampaignStrip, EventList, trendRows, WorkspaceLink } from "../blocks";
import { forecast, useCampaigns } from "../campaigns";
import { BarList, Donut, Spark, StackedArea, TrendChart } from "../charts";
import { mvvnoInsights, overviewInsights } from "../insights";
import {
  eventsFor,
  MVVNO_MARKET_MONTHS,
  NETWORKS,
  operatorStats,
} from "../market";
import {
  AS_OF,
  BIZ,
  type Biz,
  compare,
  fmt,
  monthOutlook,
  ONLINE,
  perf,
  targetFor,
  yearOutlook,
} from "../model";
import { usePeriod } from "../state";
import {
  BizDot,
  Delta,
  InsightPanel,
  Kpi,
  PageHeader,
  PeriodPicker,
  Section,
} from "../ui";

function useHomeData(list: Biz[]) {
  const { range, period } = usePeriod();
  const [targets] = useAnnualTargets();
  const { events } = useEventCatalog();
  const { items: campaigns } = useCampaigns();
  return {
    range,
    period,
    targets,
    events,
    campaigns,
    c: useMemo(() => compare(list, range), [list, range]),
  };
}

/* ───────────── 1.1 Online 통합 현황 ───────────── */

function BizSummary({ biz }: { biz: Biz }) {
  const { range, targets, events, campaigns, c } = useHomeData([biz]);
  const online = useMemo(() => compare(ONLINE, range), [range]);
  const t = targetFor(biz, range, targets);
  const m = monthOutlook(biz, targets);
  const bizEvents = eventsFor(biz, range, events);
  const share = (c.cur.lines / Math.max(online.cur.lines, 1)) * 100;
  const insights = overviewInsights(
    biz,
    range,
    targets,
    bizEvents,
    campaigns,
  ).slice(0, 2);
  return (
    <Section
      actions={<WorkspaceLink ws={biz} />}
      meta={BIZ[biz].full}
      title={
        <span className="flex items-center gap-2">
          <BizDot biz={biz} className="size-2.5" />
          {BIZ[biz].name} 요약
        </span>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            <Kpi
              accent={BIZ[biz].color}
              delta={c.delta.lines}
              label="가입 실적"
              unit="회선"
              value={fmt.n(c.cur.lines)}
            />
            <Kpi
              label="순증 · 목표"
              pace={m.pace}
              rate={t.net ? (c.cur.net / t.net) * 100 : null}
              target={`목표 ${fmt.n(t.net)}`}
              unit="회선"
              value={fmt.n(c.cur.net)}
            />
          </div>
          <div className="flex items-center gap-4 rounded-xl border p-3">
            <Donut
              center={fmt.rate(share)}
              data={[
                {
                  name: BIZ[biz].name,
                  value: c.cur.lines,
                  color: BIZ[biz].color,
                },
                {
                  name: "기타 Online",
                  value: Math.max(0, online.cur.lines - c.cur.lines),
                  color: "var(--muted)",
                },
              ]}
              size={92}
              sub="Online 기여"
            />
            <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
              <div>
                <dt className="text-muted-foreground">월말 전망</dt>
                <dd className="font-semibold tabular-nums">
                  {fmt.n(m.forecastEnd)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">월 목표</dt>
                <dd className="font-semibold tabular-nums">
                  {fmt.n(m.target)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">매출</dt>
                <dd className="flex items-baseline gap-1 font-semibold tabular-nums">
                  {fmt.won(c.cur.revenue)} <Delta value={c.delta.revenue} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">해지</dt>
                <dd className="flex items-baseline gap-1 font-semibold tabular-nums">
                  {fmt.n(c.cur.churn)} <Delta inverse value={c.delta.churn} />
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
              캠페인 현황
            </h3>
            <CampaignStrip campaigns={campaigns} ws={biz} />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-[11px] font-semibold text-muted-foreground">
              주요 시장 동향 · 판매 정책 변경
            </h3>
            <EventList events={bizEvents} limit={6} ws={biz} />
          </div>
          <InsightPanel
            compact
            items={insights}
            scope={[
              BIZ[biz].name,
              `${fmt.md(range.start)}–${fmt.md(range.end)}`,
            ]}
          />
        </div>
      </div>
    </Section>
  );
}

export function OnlineHome() {
  const { range, period, targets, events, campaigns, c } = useHomeData(ONLINE);
  const t = ONLINE.map((b) => targetFor(b, range, targets)).reduce((a, b) => ({
    lines: a.lines + b.lines,
    net: a.net + b.net,
  }));
  const m = monthOutlook(ONLINE, targets);
  const y = yearOutlook(ONLINE, targets);
  const live = campaigns.filter(
    (x) =>
      ONLINE.includes(x.workspace) &&
      (x.status === "running" || x.status === "scheduled"),
  );
  const liftSum = live
    .map((x) => forecast(x.workspace, x.params).summary)
    .reduce((a, s) => ({ net: a.net + s.net, profit: a.profit + s.profit }), {
      net: 0,
      profit: 0,
    });
  const rows = trendRows(ONLINE, range, targets, period === "mtd");
  const onlineEvents = [
    ...eventsFor("aiir", range, events),
    ...eventsFor("tdds", range, events),
  ].filter((e, i, a) => a.findIndex((x) => x.id === e.id) === i);
  const spark = (b: Biz) =>
    perf(b, { start: range.start, end: range.end }).map((r) => r.lines);
  return (
    <div className="space-y-4">
      <PageHeader
        actions={<PeriodPicker />}
        description="aiir·TDDS 통합 실적·목표·전망과 캠페인 예상 성과"
        eyebrow="Home · 통합"
        title="Online 통합 현황"
      />
      <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        <Kpi
          accent="var(--primary)"
          delta={c.delta.lines}
          label="Online 가입"
          spark={
            <Spark
              color="var(--primary)"
              values={ONLINE.map(spark).reduce((a, b) =>
                a.map((v, i) => v + (b[i] ?? 0)),
              )}
            />
          }
          unit="회선"
          value={fmt.n(c.cur.lines)}
        />
        <Kpi
          label="순증 · 목표 달성"
          pace={period === "mtd" ? m.pace : undefined}
          rate={t.net ? (c.cur.net / t.net) * 100 : null}
          target={`목표 ${fmt.n(t.net)}`}
          unit="회선"
          value={fmt.n(c.cur.net)}
        />
        <Kpi
          delta={c.delta.churn}
          inverse
          label="해지"
          unit="회선"
          value={fmt.n(c.cur.churn)}
        />
        <Kpi
          delta={c.delta.revenue}
          label="매출"
          unit="원"
          value={fmt.won(c.cur.revenue)}
        />
        <Kpi
          label="월말 전망 · 월 목표"
          rate={m.target ? (m.forecastEnd / m.target) * 100 : null}
          target={`연말 ${fmt.n(y.yearEnd)} / ${fmt.n(y.target)}`}
          unit="회선"
          value={fmt.n(m.forecastEnd)}
        />
        <Kpi
          accent="var(--color-emerald-500)"
          label="캠페인 예상 성과"
          target={`${live.length}건 · 순익 ${fmt.won(liftSum.profit)}원`}
          unit="회선"
          value={`+${fmt.n(liftSum.net)}`}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Section
          meta={
            period === "mtd"
              ? "실적 · 목표 · 월말 전망(점선·음영=예측 범위)"
              : "실적 · 목표"
          }
          title="Online 일별 가입 추이"
        >
          <TrendChart
            band={period === "mtd" ? "band" : undefined}
            data={rows}
            forecast={period === "mtd" ? "forecast" : undefined}
            height={300}
            series={ONLINE.map((b) => ({
              key: b,
              name: BIZ[b].name,
              color: BIZ[b].color,
              stack: true,
            }))}
            target="target"
            today={AS_OF}
            windows={live
              .filter((x) => x.params.start <= range.end)
              .map((x) => ({
                from:
                  x.params.start < range.start ? range.start : x.params.start,
                to: x.params.end,
                color: BIZ[x.workspace].color,
              }))}
          />
        </Section>
        <InsightPanel
          items={overviewInsights(
            ONLINE,
            range,
            targets,
            onlineEvents,
            campaigns,
          )}
          scope={[
            "aiir + TDDS",
            `${fmt.md(range.start)}–${fmt.md(range.end)}`,
            "전 채널",
          ]}
        />
      </div>
      <div className="grid gap-4 2xl:grid-cols-2">
        <BizSummary biz="tdds" />
        <BizSummary biz="aiir" />
      </div>
    </div>
  );
}

/* ───────────── 1.2 MVVNO 현황 ───────────── */

export function MvvnoHome() {
  const { range, period, targets, events, campaigns, c } = useHomeData([
    "mvvno",
  ]);
  const t = targetFor("mvvno", range, targets);
  const m = monthOutlook("mvvno", targets);
  const last = MVVNO_MARKET_MONTHS.at(-1)!;
  const prevYear = MVVNO_MARKET_MONTHS.at(-13)!;
  const share = (last.byNetwork.SKKT / last.total) * 100;
  const ops = operatorStats(range);
  const mvvnoEvents = eventsFor("mvvno", range, events);
  return (
    <div className="space-y-4">
      <PageHeader
        actions={<PeriodPicker />}
        description="MVVNO 시장·사업 실적·목표·주요 변화와 캠페인 예상 성과"
        eyebrow="Home · 통합"
        title="MVVNO 현황"
      />
      <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        <Kpi
          accent={BIZ.mvvno.color}
          label="MVVNO 시장 규모"
          target={`전년 대비 ${fmt.pct(((last.total - prevYear.total) / prevYear.total) * 100)}`}
          unit="천 회선"
          value={fmt.n(last.total)}
        />
        <Kpi
          label="SKKT망 점유율"
          target={`전년 ${fmt.rate((prevYear.byNetwork.SKKT / prevYear.total) * 100, 1)}`}
          unit="%"
          value={share.toFixed(1)}
        />
        <Kpi
          delta={c.delta.lines}
          label="SKKT망 가입"
          unit="회선"
          value={fmt.n(c.cur.lines)}
        />
        <Kpi
          label="순증 · 목표"
          pace={period === "mtd" ? m.pace : undefined}
          rate={t.net ? (c.cur.net / t.net) * 100 : null}
          target={`목표 ${fmt.n(t.net)}`}
          unit="회선"
          value={fmt.n(c.cur.net)}
        />
        <Kpi
          delta={c.delta.revenue}
          label="도매 매출"
          unit="원"
          value={fmt.won(c.cur.revenue)}
        />
        <Kpi
          accent="var(--color-emerald-500)"
          label="캠페인 예상 성과"
          unit="회선"
          value={`+${fmt.n(campaigns.filter((x) => x.workspace === "mvvno" && (x.status === "running" || x.status === "scheduled")).reduce((s, x) => s + forecast("mvvno", x.params).summary.net, 0))}`}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Section meta="월별 · 천 회선" title="망별 MVVNO 가입자">
          <StackedArea
            data={MVVNO_MARKET_MONTHS.map((x) => ({
              key: x.month.slice(2).replace("-", "."),
              ...x.byNetwork,
            }))}
            height={240}
            series={NETWORKS.map((n) => ({
              key: n.id,
              name: n.label,
              color: n.color,
            }))}
          />
        </Section>
        <Section
          actions={<WorkspaceLink ws="mvvno" />}
          meta="SKKT망 사업자별 · 기간 가입"
          title="사업자 기여"
        >
          <BarList
            items={ops.slice(0, 7).map((o) => ({
              label: o.name,
              value: o.lines,
              color: BIZ.mvvno.color,
              note: <Delta value={o.delta} />,
            }))}
          />
        </Section>
        <InsightPanel
          items={[
            ...mvvnoInsights(MVVNO_MARKET_MONTHS, ops),
            ...overviewInsights(
              "mvvno",
              range,
              targets,
              mvvnoEvents,
              campaigns,
            ).slice(1, 3),
          ]}
          scope={["MVVNO", `${fmt.md(range.start)}–${fmt.md(range.end)}`]}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Section meta="MVVNO 소식 · 타사 · 자사 정책" title="주요 변화">
          <EventList events={mvvnoEvents} limit={7} ws="mvvno" />
        </Section>
        <Section title="캠페인 현황">
          <CampaignStrip campaigns={campaigns} ws="mvvno" />
        </Section>
      </div>
    </div>
  );
}
