"use client";
import { useMemo } from "react";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useAnnualTargets } from "@/components/market-performance/home-annual-targets";
import { EventList, trendRows } from "../blocks";
import { useCampaigns } from "../campaigns";
import { BarList, Donut, Spectrum, StackedArea, TrendChart } from "../charts";
import { mvvnoInsights, overviewInsights, portfolioInsights } from "../insights";
import {
  dataTier,
  eventsFor,
  MVVNO_MARKET_MONTHS,
  mvvnoMargin,
  NETWORKS,
  type Offer,
  type OperatorStat,
  offersFor,
  operatorStats,
  priceOf,
  TIERS,
} from "../market";
import { AS_OF, BIZ, compare, fmt, monthOutlook, targetFor } from "../model";
import { usePeriod } from "../state";
import {
  type Column,
  DataTable,
  Delta,
  InsightPanel,
  Kpi,
  PageHeader,
  PeriodPicker,
  Section,
  Tag,
  useTable,
} from "../ui";
import { NewCampaignButton } from "./overview";

/* ───────────── 4.1 시장 현황 ───────────── */

export function MvvnoMarket() {
  const { range, period } = usePeriod();
  const [targets] = useAnnualTargets();
  const { events } = useEventCatalog();
  const { items: campaigns } = useCampaigns();
  const c = useMemo(() => compare("mvvno", range), [range]);
  const t = targetFor("mvvno", range, targets);
  const m = monthOutlook("mvvno", targets);
  const ops = useMemo(() => operatorStats(range), [range]);
  const last = MVVNO_MARKET_MONTHS.at(-1)!;
  const prev = MVVNO_MARKET_MONTHS.at(-2)!;
  const share = (x: typeof last) => (x.byNetwork.SKKT / x.total) * 100;
  const list = eventsFor("mvvno", range, events);
  const mnp = ops.reduce((s, o) => s + o.mnp, 0);
  const columns: Column<OperatorStat>[] = [
    {
      key: "name",
      label: "사업자",
      render: (o) => <span className="font-medium">{o.name}</span>,
      sort: (o) => o.name,
    },
    {
      key: "lines",
      label: "신규",
      align: "right",
      render: (o) => fmt.n(o.lines - o.mnp),
      sort: (o) => o.lines - o.mnp,
    },
    {
      key: "mnp",
      label: "번호이동",
      align: "right",
      render: (o) => fmt.n(o.mnp),
      sort: (o) => o.mnp,
    },
    {
      key: "net",
      label: "순증",
      align: "right",
      render: (o) => <span className="font-semibold">{fmt.n(o.net)}</span>,
      sort: (o) => o.net,
    },
    {
      key: "rev",
      label: "매출",
      align: "right",
      render: (o) => fmt.won(o.revenue),
      sort: (o) => o.revenue,
    },
    {
      key: "share",
      label: "SKKT망 내 점유",
      align: "right",
      render: (o) => fmt.rate(o.share, 1),
      sort: (o) => o.share,
    },
    {
      key: "delta",
      label: "증감",
      align: "right",
      render: (o) => <Delta value={o.delta} />,
      sort: (o) => o.delta ?? 0,
    },
    { key: "offers", label: "요금제", align: "right", render: (o) => o.offers },
  ];
  const table = useTable(
    ops,
    {
      search: (o) => o.name,
      pageSize: 8,
      initialSort: { key: "lines", dir: -1 },
    },
    columns,
  );
  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <>
            <PeriodPicker />
            <NewCampaignButton biz="mvvno" />
          </>
        }
        description="시장 규모·망별·사업자별 동향, 신규·번호이동·순증·매출·점유율 및 목표 대비 실적"
        eyebrow={<>MVVNO · {BIZ.mvvno.full}</>}
        title="시장 현황"
      />
      <div className="grid gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        <Kpi
          accent={BIZ.mvvno.color}
          label="시장 규모"
          target={`전월 ${fmt.pct(((last.total - prev.total) / prev.total) * 100)}`}
          unit="천 회선"
          value={fmt.n(last.total)}
        />
        <Kpi
          label="SKKT망 점유율"
          target={`전월 대비 ${fmt.pct(share(last) - share(prev), 2)}p`}
          unit="%"
          value={share(last).toFixed(1)}
        />
        <Kpi
          delta={c.delta.lines}
          label="신규"
          unit="회선"
          value={fmt.n(c.cur.lines - mnp)}
        />
        <Kpi
          label="번호이동"
          target={`비중 ${fmt.rate((mnp / Math.max(c.cur.lines, 1)) * 100)}`}
          unit="회선"
          value={fmt.n(mnp)}
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
          label="매출"
          unit="원"
          value={fmt.won(c.cur.revenue)}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Section meta="월별 · 망 점유 구성" title="망별 동향">
          <StackedArea
            data={MVVNO_MARKET_MONTHS.map((x) => ({
              key: x.month.slice(2).replace("-", "."),
              ...x.byNetwork,
            }))}
            height={250}
            percent
            series={NETWORKS.map((n) => ({
              key: n.id,
              name: n.label,
              color: n.color,
            }))}
          />
        </Section>
        <Section meta="SKKT망 · 기간 가입" title="사업자별 동향">
          <div className="flex items-center gap-4">
            <Donut
              center={fmt.n(ops.reduce((s, o) => s + o.lines, 0))}
              data={ops.map((o, i) => ({
                name: o.name,
                value: o.lines,
                color: `color-mix(in oklab, ${BIZ.mvvno.color} ${100 - i * 10}%, var(--muted))`,
              }))}
              size={120}
              sub="SKKT망 가입"
            />
            <div className="flex-1">
              <BarList
                format={(v) => fmt.rate(v, 1)}
                items={ops.slice(0, 6).map((o) => ({
                  label: o.name,
                  value: o.share,
                  color: BIZ.mvvno.color,
                  note: <Delta value={o.delta} />,
                }))}
              />
            </div>
          </div>
        </Section>
        <InsightPanel
          items={[
            ...mvvnoInsights(MVVNO_MARKET_MONTHS, ops),
            ...overviewInsights("mvvno", range, targets, list, campaigns).slice(
              1,
              2,
            ),
          ]}
          scope={[
            "MVVNO",
            `${fmt.md(range.start)}–${fmt.md(range.end)}`,
            "SKKT망",
          ]}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Section meta="검색·정렬·페이지" title="사업자별 실적">
          <DataTable
            dense
            rowKey={(o) => o.name}
            searchLabel="사업자 검색"
            table={table}
          />
        </Section>
        <Section meta="MVVNO 소식 · 타사 · 자사 정책" title="주요 변화">
          <EventList events={list} limit={8} ws="mvvno" />
        </Section>
      </div>
      <Section
        meta={period === "mtd" ? "실적 · 목표 · 월말 전망" : "실적 · 목표"}
        title="SKKT망 일별 가입"
      >
        <TrendChart
          band={period === "mtd" ? "band" : undefined}
          data={trendRows(["mvvno"], range, targets, period === "mtd")}
          forecast={period === "mtd" ? "forecast" : undefined}
          height={240}
          series={[{ key: "mvvno", name: "SKKT망 MVVNO", color: BIZ.mvvno.color }]}
          target="target"
          today={AS_OF}
        />
      </Section>
    </div>
  );
}

/* ───────────── 4.3 상품·포트폴리오 ───────────── */

export function MvvnoPortfolio() {
  const all = useMemo(() => offersFor("mvvno"), []);
  const networks = NETWORKS.map((n) => n.id);
  const operators = [...new Set(all.map((o) => o.operator))].sort();
  const columns: Column<Offer>[] = [
    {
      key: "name",
      label: "요금제",
      render: (o) => <span className="font-medium">{o.name}</span>,
      sort: (o) => o.name,
    },
    {
      key: "op",
      label: "사업자",
      render: (o) => o.operator,
      sort: (o) => o.operator,
    },
    {
      key: "net",
      label: "망",
      render: (o) => (
        <Tag color={NETWORKS.find((n) => n.id === o.network)?.color}>
          {o.network}
        </Tag>
      ),
      sort: (o) => o.network,
    },
    {
      key: "tier",
      label: "상품군",
      render: (o) => (
        <span className="text-muted-foreground">{dataTier(o)}</span>
      ),
      sort: (o) => TIERS.indexOf(dataTier(o)),
    },
    {
      key: "price",
      label: "체감가",
      align: "right",
      render: (o) => <span className="font-semibold">{fmt.n(priceOf(o))}</span>,
      sort: priceOf,
    },
    {
      key: "period",
      label: "할인",
      align: "right",
      render: (o) => (o.months ? `${o.months}개월` : "상시"),
      sort: (o) => o.months ?? 0,
    },
    {
      key: "margin",
      label: "추정 마진/월",
      align: "right",
      render: (o) => {
        const v = mvvnoMargin(o);
        return (
          <span
            className={
              v < 0
                ? "font-semibold text-rose-600 dark:text-rose-400"
                : "font-semibold text-emerald-600 dark:text-emerald-400"
            }
          >
            {fmt.won(v)}
          </span>
        );
      },
      sort: mvvnoMargin,
    },
  ];
  const table = useTable(
    all,
    {
      search: (o) => `${o.name} ${o.operator}`,
      filters: [
        {
          key: "net",
          label: "망",
          options: networks.map((n) => ({ value: n, label: n })),
          test: (o, v) => o.network === v,
        },
        {
          key: "tier",
          label: "상품군",
          options: TIERS.map((t) => ({ value: t, label: t })),
          test: (o, v) => dataTier(o) === v,
        },
        {
          key: "op",
          label: "사업자",
          options: operators.map((o) => ({ value: o, label: o })),
          test: (o, v) => o.operator === v,
        },
        {
          key: "margin",
          label: "수익성",
          options: [
            { value: "neg", label: "역마진" },
            { value: "pos", label: "흑자" },
          ],
          test: (o, v) =>
            v === "neg" ? mvvnoMargin(o) < 0 : mvvnoMargin(o) >= 0,
        },
      ],
      pageSize: 9,
      initialSort: { key: "price", dir: 1 },
    },
    columns,
  );
  const f = table.filtered;
  const tiers = TIERS.map((t) => {
    const xs = f.filter((o) => dataTier(o) === t);
    return {
      t,
      n: xs.length,
      margin: xs.length
        ? xs.reduce((s, o) => s + mvvnoMargin(o), 0) / xs.length
        : 0,
    };
  });
  const byNet = NETWORKS.map((n) => ({
    name: n.label,
    value: f.filter((o) => o.network === n.id).length,
    color: n.color,
  }));
  const points = f
    .filter((_, i) => i % Math.ceil(Math.max(1, f.length / 700)) === 0)
    .map((o) => ({
      x: o.unlimited ? 150 : (o.dataGb ?? 0),
      y: priceOf(o),
      name: `${o.operator} ${o.name}`,
      group: o.network === "SKKT" ? "SKKT망" : "시장",
      color: o.network === "SKKT" ? BIZ.mvvno.color : "var(--muted-foreground)",
      size: o.network === "SKKT" ? 60 : 24,
      detail: `${dataTier(o)} · 마진 ${fmt.won(mvvnoMargin(o))}`,
    }));
  return (
    <div className="space-y-4">
      <PageHeader
        description="요금제 경쟁력, 망·사업자·상품군별 구성 및 수익성 분석"
        eyebrow={<>MVVNO · {BIZ.mvvno.full}</>}
        title="상품·포트폴리오"
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Section meta="데이터 × 체감가 · SKKT망 강조" title="요금제 경쟁력">
          <Spectrum
            height={260}
            points={points}
            xLabel="데이터(GB)"
            yLabel="체감가"
          />
        </Section>
        <Section
          meta={`필터 결과 ${fmt.n(f.length)}개`}
          title="포트폴리오 구성"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Donut
                center={fmt.n(f.length)}
                data={byNet}
                size={110}
                sub="요금제"
              />
              <ul className="flex-1 space-y-1 text-[12px]">
                {byNet.map((n) => (
                  <li className="flex justify-between" key={n.name}>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="size-2 rounded-full"
                        style={{ background: n.color }}
                      />
                      {n.name}
                    </span>
                    <span className="tabular-nums">{fmt.n(n.value)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">
                상품군별 평균 추정 마진
              </p>
              <BarList
                format={(v) => `${fmt.won(v)}원`}
                items={tiers.map((x) => ({
                  label: `${x.t} (${x.n})`,
                  value: x.margin,
                  color:
                    x.margin < 0
                      ? "var(--color-rose-500)"
                      : "var(--color-emerald-500)",
                }))}
              />
            </div>
          </div>
        </Section>
        <InsightPanel
          items={portfolioInsights(f)}
          scope={[
            "MVVNO 포트폴리오",
            ...Object.values(table.values).filter((v) => v && v !== "all"),
            `${fmt.n(f.length)}개`,
          ]}
        />
      </div>
      <Section
        meta="망·사업자·상품군·수익성 필터 · 추정 마진 = 체감가 − 도매대가 가정"
        title="요금제 목록"
      >
        <DataTable
          dense
          rowKey={(o) => o.id}
          searchLabel="요금제·사업자 검색"
          table={table}
        />
      </Section>
    </div>
  );
}
