import { dayShift } from "@/components/market-performance/alternative-model";
import {
  EVENTS,
  MAX_DATE,
  type MarketEvent,
  type Range,
} from "@/components/market-performance/data";
import catalog from "@/components/market-performance/fixtures/plan-catalog.json";
import {
  EVENT_KINDS,
  eventBusiness,
  eventKind,
} from "@/components/market-performance/path-intelligence";
import { AS_OF, type Biz, change, perf, type Row, totals } from "./model";

/* ───────────────────────── Offers ───────────────────────── */

export type Offer = {
  id: string;
  name: string;
  operator: string;
  network: string;
  channel: string;
  owner: Biz | "market";
  dataGb: number | null;
  unlimited: boolean;
  bill: number | null;
  effective: number | null;
  months: number | null;
  after: number | null;
  benefits: string[];
  url?: string;
};

type CatalogOffer = (typeof catalog.offers)[number];
const toOffer = (o: CatalogOffer, owner: Offer["owner"]): Offer => ({
  id: o.offerId,
  name: o.name,
  operator: o.operator,
  network: o.network,
  channel: o.channel,
  owner,
  dataGb: o.monthlyDataGb,
  unlimited: o.unlimitedData,
  bill: o.monthlyBilledKrw,
  effective: o.displayedEffectiveKrw,
  months: o.effectivePeriodMonths,
  after: o.postEffectiveKrw,
  benefits: o.benefits ?? [],
  url: o.detailUrl,
});
const AIIR_OFFERS = catalog.offers
  .filter((o) => o.sourceId.startsWith("aiir"))
  .map((o) => toOffer(o, "aiir"));
const MVVNO_MARKET = catalog.offers
  .filter((o) => o.sourceId === "moyo")
  .map((o) => toOffer(o, "market"));

/* T다이렉트샵 and competing MNO online offers (observed 2026-09-21). */
const tdds = (
  id: string,
  name: string,
  channel: string,
  dataGb: number | null,
  bill: number,
  effective: number,
  months: number,
  benefits: string[],
  operator = "SK텔레콤",
  owner: Offer["owner"] = "tdds",
): Offer => ({
  id,
  name,
  operator,
  network: operator === "SK텔레콤" ? "SKKT" : operator === "KT" ? "KT" : "LG U+",
  channel,
  owner,
  dataGb,
  unlimited: dataGb === null,
  bill,
  effective,
  months,
  after: bill,
  benefits,
});
const TDDS_OFFERS: Offer[] = [
  tdds("tdds-1", "5GX 프라임", "T다이렉트샵 앱", null, 89000, 66750, 24, [
    "선택약정 25%",
    "T우주 패스 1개월",
  ]),
  tdds("tdds-2", "5GX 프라임", "네이버 스토어", null, 89000, 64750, 24, [
    "선택약정 25%",
    "네이버페이 2만P",
  ]),
  tdds("tdds-3", "5GX 레귤러", "T다이렉트샵 앱", 110, 69000, 51750, 24, [
    "선택약정 25%",
  ]),
  tdds("tdds-4", "5GX 레귤러", "11번가", 110, 69000, 49750, 24, [
    "선택약정 25%",
    "11pay 2만P",
  ]),
  tdds("tdds-5", "0 청년 69", "T다이렉트샵 웹", null, 69000, 51750, 24, [
    "선택약정 25%",
    "청년 데이터 2배",
  ]),
  tdds("tdds-6", "슬림", "T다이렉트샵 앱", 11, 55000, 41250, 24, [
    "선택약정 25%",
  ]),
  tdds("tdds-7", "다이렉트5G 48", "T다이렉트샵 웹", 110, 48000, 48000, 0, [
    "온라인 전용 요금",
  ]),
  tdds("tdds-8", "다이렉트5G 62", "T다이렉트샵 앱", null, 62000, 62000, 0, [
    "온라인 전용 요금",
  ]),
  tdds("tdds-9", "컴팩트", "카카오 선물하기", 6, 39000, 29250, 24, [
    "선택약정 25%",
  ]),
  tdds("tdds-10", "5GX 프리미엄", "쿠팡", null, 109000, 79750, 24, [
    "선택약정 25%",
    "쿠팡캐시 3만",
  ]),
  tdds(
    "kt-1",
    "요고 69",
    "KT닷컴",
    null,
    69000,
    69000,
    0,
    ["온라인 전용"],
    "KT",
    "market",
  ),
  tdds(
    "kt-2",
    "요고 44",
    "KT닷컴",
    50,
    44000,
    44000,
    0,
    ["온라인 전용"],
    "KT",
    "market",
  ),
  tdds(
    "kt-3",
    "5G 슬림 14GB",
    "KT닷컴",
    14,
    55000,
    41250,
    24,
    ["선택약정 25%"],
    "KT",
    "market",
  ),
  tdds(
    "kt-4",
    "5G 베이직",
    "네이버 스토어",
    null,
    80000,
    60000,
    24,
    ["선택약정 25%", "네이버페이 3만P"],
    "KT",
    "market",
  ),
  tdds(
    "lg-1",
    "너겟 69",
    "U+닷컴",
    null,
    69000,
    34500,
    6,
    ["6개월 50% 할인"],
    "LG U+",
    "market",
  ),
  tdds(
    "lg-2",
    "너겟 47",
    "U+닷컴",
    110,
    47000,
    47000,
    0,
    ["온라인 전용"],
    "LG U+",
    "market",
  ),
  tdds(
    "lg-3",
    "5G 스탠다드",
    "U+닷컴",
    150,
    75000,
    56250,
    24,
    ["선택약정 25%"],
    "LG U+",
    "market",
  ),
  tdds(
    "lg-4",
    "5G 라이트+",
    "11번가",
    14,
    55000,
    41250,
    24,
    ["선택약정 25%", "11pay 1만P"],
    "LG U+",
    "market",
  ),
];

export function offersFor(biz: Biz): Offer[] {
  if (biz === "aiir") return [...AIIR_OFFERS, ...MVVNO_MARKET];
  if (biz === "tdds") return TDDS_OFFERS;
  return MVVNO_MARKET;
}
export const dataTier = (o: Offer) =>
  o.unlimited || (o.dataGb ?? 0) >= 100
    ? "무제한·100GB+"
    : (o.dataGb ?? 0) >= 30
      ? "30~99GB"
      : (o.dataGb ?? 0) >= 10
        ? "10~29GB"
        : "10GB 미만";
export const TIERS = ["10GB 미만", "10~29GB", "30~99GB", "무제한·100GB+"];
/** Comparable price used across the page: effective price when shown, otherwise the bill. */
export const priceOf = (o: Offer) => o.effective ?? o.bill ?? 0;

/** Relative competitiveness vs. same-tier market median (50 = parity, higher = cheaper). */
export function competitiveness(o: Offer, pool: Offer[]) {
  const peers = pool.filter(
    (p) => p.owner === "market" && dataTier(p) === dataTier(o),
  );
  if (!peers.length) return null;
  const sorted = peers.map(priceOf).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const p = priceOf(o);
  return Math.max(
    0,
    Math.min(100, Math.round(50 + ((median - p) / Math.max(median, 1)) * 100)),
  );
}

/** Estimated monthly unit margin for MVVNO plans on a wholesale cost assumption per GB. */
export function mvvnoMargin(o: Offer) {
  const gb = o.unlimited ? 120 : (o.dataGb ?? 0);
  const wholesale = 2200 + Math.min(gb, 120) * 230;
  return priceOf(o) - wholesale;
}

/* ───────────────────────── Channels ───────────────────────── */

export const CHANNEL_SETS: Record<
  Exclude<Biz, "mvvno">,
  { id: string; weight: number }[]
> = {
  aiir: [
    { id: "APP", weight: 32 },
    { id: "WEB", weight: 22 },
    { id: "TOSS", weight: 15 },
    { id: "KAKAOPAY", weight: 12 },
    { id: "MOYO", weight: 10 },
    { id: "제휴몰", weight: 5 },
    { id: "기타", weight: 4 },
  ],
  tdds: [
    { id: "T다이렉트샵 앱", weight: 34 },
    { id: "T다이렉트샵 웹", weight: 21 },
    { id: "네이버 스토어", weight: 14 },
    { id: "11번가", weight: 10 },
    { id: "쿠팡", weight: 9 },
    { id: "카카오 선물하기", weight: 7 },
    { id: "제휴 카드몰", weight: 5 },
  ],
};
function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  raw
    .map((v, i) => [v - out[i], i] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, total - out.reduce((a, b) => a + b, 0))
    .forEach(([, i]) => {
      out[i]++;
    });
  return out;
}
export type ChannelStat = Omit<Row, "key"> & {
  id: string;
  share: number;
  delta: number | null;
};
export function channelStats(
  biz: Exclude<Biz, "mvvno">,
  range: Range,
): ChannelStat[] {
  const set = CHANNEL_SETS[biz];
  const split = (rows: Row[]) => {
    const acc = set.map(() => ({
      lines: 0,
      churn: 0,
      net: 0,
      revenue: 0,
      profit: 0,
    }));
    for (const r of rows) {
      const t = Date.parse(`${r.key}T00:00:00Z`) / 86400000;
      const w = set.map(
        (c, i) => c.weight * (1 + Math.sin(t * 0.17 + i) * 0.12),
      );
      const lines = allocate(r.lines, w);
      const churn = allocate(r.churn, w);
      const revenue = allocate(Math.max(0, r.revenue), w);
      set.forEach((_, i) => {
        acc[i].lines += lines[i];
        acc[i].churn += churn[i];
        acc[i].net += lines[i] - churn[i];
        acc[i].revenue += revenue[i];
        acc[i].profit += Math.round(
          (r.profit * w[i]) / w.reduce((a, b) => a + b, 0),
        );
      });
    }
    return acc;
  };
  const cur = split(perf(biz, range));
  const prev = split(
    perf(biz, {
      start: dayShift(
        range.start,
        -(Date.parse(range.end) - Date.parse(range.start)) / 86400000 - 1,
      ),
      end: dayShift(range.start, -1),
    }),
  );
  const total = cur.reduce((s, c) => s + c.lines, 0) || 1;
  return set
    .map((c, i) => ({
      id: c.id,
      ...cur[i],
      share: (cur[i].lines / total) * 100,
      delta: change(cur[i].lines, prev[i].lines),
    }))
    .sort((a, b) => b.lines - a.lines);
}

/* ───────────────────────── Events ───────────────────────── */

export type Lane = "market" | "online" | "pivot" | "campaign";
export function eventsFor(
  biz: Biz,
  range: Range,
  events: MarketEvent[] = EVENTS,
) {
  return events
    .filter((e) => {
      const d = e.startAt.slice(0, 10);
      if (d < range.start || d > range.end) return false;
      const own = eventBusiness(e);
      if (own) return own === biz;
      const kind = eventKind(e);
      return biz === "mvvno"
        ? kind === "mvvnoNews" || kind === "rival" || e.marketSegment === "MVVNO"
        : kind !== "mvvnoNews";
    })
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
}
export const kindLabel = (e: MarketEvent) => EVENT_KINDS[eventKind(e)];
export const isOwn = (e: MarketEvent) => eventBusiness(e) !== null;

/* ───────────────────────── Turning points ───────────────────────── */

export type PivotCriteria = {
  thresholdPct: number;
  minDelta: number;
  window: number;
};
export const DEFAULT_CRITERIA: PivotCriteria = {
  thresholdPct: 20,
  minDelta: 30,
  window: 7,
};
export type Pivot = {
  biz: Biz;
  date: string;
  pct: number;
  baseline: number;
  actual: number;
};
export function detectPivots(
  biz: Biz,
  range: Range,
  c: PivotCriteria = DEFAULT_CRITERIA,
): Pivot[] {
  const rows = perf(biz, {
    start: dayShift(range.start, -c.window - 1),
    end: range.end,
  });
  const out: Pivot[] = [];
  for (let i = c.window; i < rows.length; i++) {
    if (rows[i].key < range.start) continue;
    const base =
      rows.slice(i - c.window, i).reduce((s, r) => s + r.lines, 0) / c.window;
    const delta = rows[i].lines - base;
    const pct = base ? (delta / base) * 100 : 0;
    if (Math.abs(pct) < c.thresholdPct || Math.abs(delta) < c.minDelta)
      continue;
    const prev = out.at(-1);
    if (
      prev &&
      Math.sign(prev.pct) === Math.sign(pct) &&
      (Date.parse(rows[i].key) - Date.parse(prev.date)) / 86400000 <= 2
    )
      continue;
    out.push({
      biz,
      date: rows[i].key,
      pct,
      baseline: base,
      actual: rows[i].lines,
    });
  }
  return out.reverse();
}
/** Impact of an event: 7-day average of new lines after vs. before. */
export function eventImpact(biz: Biz, date: string) {
  const before = totals(
    perf(biz, { start: dayShift(date, -7), end: dayShift(date, -1) }),
  );
  const after = totals(perf(biz, { start: date, end: dayShift(date, 6) }));
  const now = totals(perf(biz, { start: dayShift(AS_OF, -6), end: AS_OF }));
  const impact = change(
    after.lines / Math.max(after.days, 1),
    before.lines / Math.max(before.days, 1),
  );
  const progress = change(
    now.lines / 7,
    before.lines / Math.max(before.days, 1),
  );
  return { impact, progress, observed: after.days };
}

/* ───────────────────────── MVVNO market ───────────────────────── */

export const NETWORKS = [
  { id: "SKKT", label: "SKKT망", color: "var(--color-violet-500)" },
  { id: "KT", label: "KT망", color: "var(--color-orange-500)" },
  { id: "LG U+", label: "LG U+망", color: "var(--color-pink-500)" },
];
/** MVVNO operators hosted on the SKKT network, ranked by catalog presence. */
export const SKKT_OPERATORS = (() => {
  const counts = new Map<string, number>();
  for (const o of MVVNO_MARKET.filter((o) => o.network === "SKKT"))
    counts.set(o.operator, (counts.get(o.operator) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, n]) => ({ name, weight: n }));
})();

const month = (i: number) => {
  const d = new Date(Date.UTC(2025, i, 1));
  return d.toISOString().slice(0, 7);
};
export type MarketMonth = {
  month: string;
  total: number;
  byNetwork: Record<string, number>;
  newLines: number;
  mnp: number;
  net: number;
  revenue: number;
};
/** Monthly MVVNO market (subscribers, thousands) from Jan 2025 to the observed month. */
export const MVVNO_MARKET_MONTHS: MarketMonth[] = (() => {
  const out: MarketMonth[] = [];
  const last =
    Number(MAX_DATE.slice(5, 7)) + 12 * (Number(MAX_DATE.slice(0, 4)) - 2025);
  for (let i = 0; i < last; i++) {
    const total = 9460 + i * 38 + Math.round(Math.sin(i * 0.8) * 22);
    const skkt = 0.306 - i * 0.0012 + Math.sin(i * 0.5) * 0.004;
    const kt = 0.448 + i * 0.0004;
    const byNetwork = {
      SKKT: Math.round(total * skkt),
      KT: Math.round(total * kt),
      "LG U+": Math.round(total * (1 - skkt - kt)),
    };
    const newLines = Math.round(total * 0.041 + Math.sin(i) * 14);
    out.push({
      month: month(i),
      total,
      byNetwork,
      newLines,
      mnp: Math.round(newLines * 0.63),
      net: Math.round(38 + Math.sin(i * 0.8) * 22),
      revenue: Math.round(total * 17.4),
    });
  }
  return out;
})();

export type OperatorStat = {
  name: string;
  lines: number;
  mnp: number;
  net: number;
  revenue: number;
  share: number;
  delta: number | null;
  offers: number;
};
/** Our SKKT-network MVVNO lines split by host operator. */
export function operatorStats(range: Range): OperatorStat[] {
  const cur = totals(perf("mvvno", range));
  const prev = totals(
    perf("mvvno", {
      start: dayShift(
        range.start,
        -(Date.parse(range.end) - Date.parse(range.start)) / 86400000 - 1,
      ),
      end: dayShift(range.start, -1),
    }),
  );
  const sum = SKKT_OPERATORS.reduce((s, o) => s + o.weight, 0);
  return SKKT_OPERATORS.map((o, i) => {
    const w = o.weight / sum;
    const tilt = 1 + Math.sin(i * 1.7) * 0.18;
    const lines = Math.round(cur.lines * w * tilt);
    const churn = Math.round(cur.churn * w * (2 - tilt));
    const prevLines = Math.round(
      prev.lines * w * (1 + Math.sin(i * 1.7 + 0.6) * 0.18),
    );
    return {
      name: o.name,
      lines,
      mnp: Math.round(lines * (0.55 + (i % 3) * 0.06)),
      net: lines - churn,
      revenue: Math.round(cur.revenue * w * tilt),
      share: 0,
      delta: change(lines, prevLines),
      offers: MVVNO_MARKET.filter(
        (m) => m.operator === o.name && m.network === "SKKT",
      ).length,
    };
  })
    .map((o, _, all) => ({
      ...o,
      share: (o.lines / all.reduce((s, x) => s + x.lines, 0)) * 100,
    }))
    .sort((a, b) => b.lines - a.lines);
}
