import { dayShift } from "@/components/market-performance/alternative-model";
import {
  MAX_DATE,
  MIN_DATE,
  type Range,
} from "@/components/market-performance/data";
import { projectSeries } from "@/components/market-performance/forecast";
import {
  type AnnualTargets,
  dailyTarget,
  monthTarget,
} from "@/components/market-performance/home-annual-targets";
import {
  buildHomePerformance,
  type HomeBusiness,
} from "@/components/market-performance/home-performance";

export type Biz = HomeBusiness;
export const AS_OF = MAX_DATE;

export const BIZ: Record<
  Biz,
  { id: Biz; name: string; full: string; color: string; soft: string }
> = {
  aiir: {
    id: "aiir",
    name: "aiir",
    full: "SKKT aiir · 자급제 다이렉트",
    color: "var(--color-sky-500)",
    soft: "color-mix(in oklab, var(--color-sky-500) 14%, transparent)",
  },
  tdds: {
    id: "tdds",
    name: "TDDS",
    full: "T다이렉트샵",
    color: "var(--color-emerald-500)",
    soft: "color-mix(in oklab, var(--color-emerald-500) 14%, transparent)",
  },
  mvvno: {
    id: "mvvno",
    name: "MVVNO",
    full: "SKKT망 알뜰폰",
    color: "var(--color-violet-500)",
    soft: "color-mix(in oklab, var(--color-violet-500) 14%, transparent)",
  },
};
export const ONLINE: Biz[] = ["aiir", "tdds"];

export type Row = {
  key: string;
  lines: number;
  churn: number;
  net: number;
  revenue: number;
  profit: number;
};
export type Totals = Omit<Row, "key"> & { days: number };
export const METRICS = [
  { key: "lines", label: "가입", unit: "회선" },
  { key: "churn", label: "해지", unit: "회선", inverse: true },
  { key: "net", label: "순증", unit: "회선" },
  { key: "revenue", label: "매출", unit: "원" },
  { key: "profit", label: "순익", unit: "원" },
] as const;
export type MetricKey = (typeof METRICS)[number]["key"];

const clip = (r: Range): Range => ({
  start: r.start < MIN_DATE ? MIN_DATE : r.start,
  end: r.end > MAX_DATE ? MAX_DATE : r.end,
});
const cache = new Map<string, Row[]>();
/** Daily observed performance of a business, clipped to observed dates. */
export function perf(biz: Biz, range: Range): Row[] {
  const r = clip(range);
  if (r.start > r.end) return [];
  const key = `${biz}:${r.start}:${r.end}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rows = buildHomePerformance(r, biz).map((x) => ({
    key: x.key,
    lines: x.customers,
    churn: x.cancellations,
    net: x.customers - x.cancellations,
    revenue: x.revenue,
    profit: x.netProfit,
  }));
  cache.set(key, rows);
  return rows;
}
export function totals(rows: Row[]): Totals {
  return rows.reduce(
    (t, r) => ({
      lines: t.lines + r.lines,
      churn: t.churn + r.churn,
      net: t.net + r.net,
      revenue: t.revenue + r.revenue,
      profit: t.profit + r.profit,
      days: t.days + 1,
    }),
    { lines: 0, churn: 0, net: 0, revenue: 0, profit: 0, days: 0 },
  );
}
export const days = (r: Range) =>
  Math.round((Date.parse(r.end) - Date.parse(r.start)) / 86400000) + 1;
export const previous = (r: Range): Range => ({
  start: dayShift(r.start, -days(r)),
  end: dayShift(r.start, -1),
});
export const change = (a: number, b: number) =>
  b ? ((a - b) / Math.abs(b)) * 100 : null;

export function compare(biz: Biz | Biz[], range: Range) {
  const list = Array.isArray(biz) ? biz : [biz];
  const sum = (r: Range) =>
    list
      .map((b) => totals(perf(b, r)))
      .reduce((a, b) => ({
        lines: a.lines + b.lines,
        churn: a.churn + b.churn,
        net: a.net + b.net,
        revenue: a.revenue + b.revenue,
        profit: a.profit + b.profit,
        days: Math.max(a.days, b.days),
      }));
  const cur = sum(range);
  const prev = sum(previous(range));
  const delta = Object.fromEntries(
    METRICS.map((m) => [m.key, change(cur[m.key], prev[m.key])]),
  ) as Record<MetricKey, number | null>;
  return { cur, prev, delta };
}

/** Churn share of new lines over the last 90 observed days. */
export function churnRatio(biz: Biz) {
  const t = totals(perf(biz, { start: dayShift(AS_OF, -89), end: AS_OF }));
  return t.lines ? t.churn / t.lines : 0.2;
}

/** Target over a range (observed part), for lines and net adds. */
export function targetFor(biz: Biz, range: Range, targets: AnnualTargets) {
  const r = clip(range);
  let lines = 0;
  for (let d = r.start; d <= r.end; d = dayShift(d, 1))
    lines += dailyTarget(targets, d, biz) ?? 0;
  const net = Math.round(lines * (1 - churnRatio(biz)));
  return { lines, net };
}

export type OutlookRow = {
  key: string;
  actual: number | null;
  forecast: number | null;
  band: [number, number] | null;
  target: number | null;
};
/** Month view: observed days, damped-trend forecast to month end with a band, and daily targets. */
export function monthOutlook(
  biz: Biz | Biz[],
  targets: AnnualTargets,
  asOf = AS_OF,
) {
  const list = Array.isArray(biz) ? biz : [biz];
  const first = `${asOf.slice(0, 8)}01`;
  const monthEnd = new Date(
    Date.UTC(Number(asOf.slice(0, 4)), Number(asOf.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
  const history = (b: Biz) =>
    perf(b, { start: dayShift(asOf, -55), end: asOf }).map((r) => r.lines);
  const horizon = days({ start: asOf, end: monthEnd }) - 1;
  const fc = list.map((b) => projectSeries(history(b), "damped", horizon));
  const hist = list.map(history);
  const resid = hist.map((h) => {
    const s = h.slice(-28);
    const m = s.reduce((a, v) => a + v, 0) / s.length;
    return Math.sqrt(s.reduce((a, v) => a + (v - m) ** 2, 0) / s.length);
  });
  const rows: OutlookRow[] = [];
  for (let d = first; d <= monthEnd; d = dayShift(d, 1)) {
    const target = list.reduce(
      (s, b) => s + (dailyTarget(targets, d, b) ?? 0),
      0,
    );
    if (d <= asOf) {
      const actual = list.reduce(
        (s, b) => s + (perf(b, { start: d, end: d })[0]?.lines ?? 0),
        0,
      );
      rows.push({
        key: d,
        actual,
        forecast: d === asOf ? actual : null,
        band: d === asOf ? [actual, actual] : null,
        target,
      });
    } else {
      const i = days({ start: asOf, end: d }) - 2;
      const f = fc.reduce((s, series) => s + Math.max(0, series[i] ?? 0), 0);
      const spread = resid.reduce((s, v) => s + v, 0) * Math.sqrt(i + 1) * 0.35;
      rows.push({
        key: d,
        actual: null,
        forecast: Math.round(f),
        band: [Math.max(0, Math.round(f - spread)), Math.round(f + spread)],
        target,
      });
    }
  }
  const mtd = rows.reduce((s, r) => s + (r.actual ?? 0), 0);
  const rest = rows.reduce(
    (s, r) => s + (r.actual === null ? (r.forecast ?? 0) : 0),
    0,
  );
  const monthTargetTotal = list.reduce(
    (s, b) => s + (monthTarget(targets, asOf, b) ?? 0),
    0,
  );
  return {
    rows,
    mtd,
    forecastEnd: mtd + rest,
    target: monthTargetTotal,
    pace: (Number(asOf.slice(8, 10)) / Number(monthEnd.slice(8, 10))) * 100,
  };
}

/** Year to date vs annual target, with a simple run-rate year-end outlook. */
export function yearOutlook(
  biz: Biz | Biz[],
  targets: AnnualTargets,
  asOf = AS_OF,
) {
  const list = Array.isArray(biz) ? biz : [biz];
  const year = asOf.slice(0, 4);
  const ytd = list.reduce(
    (s, b) => s + totals(perf(b, { start: `${year}-01-01`, end: asOf })).lines,
    0,
  );
  const target = list.reduce((s, b) => s + (targets[year]?.[b] ?? 0), 0);
  const recent = list.reduce(
    (s, b) =>
      s + totals(perf(b, { start: dayShift(asOf, -27), end: asOf })).lines,
    0,
  );
  const left = days({ start: asOf, end: `${year}-12-31` }) - 1;
  return { ytd, target, yearEnd: Math.round(ytd + (recent / 28) * left) };
}

export const fmt = {
  n: (v: number) => Math.round(v).toLocaleString("ko-KR"),
  signed: (v: number) =>
    `${v > 0 ? "+" : ""}${Math.round(v).toLocaleString("ko-KR")}`,
  pct: (v: number | null, d = 1) =>
    v === null || !Number.isFinite(v)
      ? "—"
      : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`,
  rate: (v: number | null, d = 0) =>
    v === null || !Number.isFinite(v) ? "—" : `${v.toFixed(d)}%`,
  won: (v: number) => {
    const a = Math.abs(v);
    const s = v < 0 ? "-" : "";
    if (a >= 1e8) return `${s}${(a / 1e8).toFixed(1)}억`;
    if (a >= 1e4) return `${s}${Math.round(a / 1e4).toLocaleString("ko-KR")}만`;
    return `${s}${Math.round(a).toLocaleString("ko-KR")}`;
  },
  md: (d: string) => d.slice(5, 10).replace("-", "."),
};
