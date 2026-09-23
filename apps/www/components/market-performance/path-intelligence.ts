import { dayShift } from "./alternative-model";
import { getEventType, MAX_DATE, type MarketEvent, MIN_DATE } from "./data";
import catalog from "./fixtures/plan-catalog.json";
import {
  buildHomePerformance,
  type HomeBusiness,
  homePivotCandidates,
} from "./home-performance";
import { competitiveness, similarPlan } from "./plan-competitiveness-model";
import { isAir, planDay } from "./plan-market-model";

export const BUSINESSES: { id: HomeBusiness; name: string; color: string }[] = [
  { id: "air", name: "AIR", color: "var(--color-blue-500)" },
  { id: "tds", name: "TDS", color: "var(--color-emerald-500)" },
  { id: "mvno", name: "MVNO", color: "var(--color-violet-500)" },
];
export const businessName = (id: string) =>
  BUSINESSES.find((b) => b.id === id)?.name ?? id.toUpperCase();

/** Timeline layers shown on HOME, top to bottom. */
export type Layer = "news" | "rival" | "skt" | "own";
export const LAYER_LABEL: Record<Layer, string> = {
  news: "시장 소식",
  rival: "타사 판매정책",
  skt: "SKT 판매정책",
  own: "사업별 판매정책",
};
const SALES_WEIGHT: Record<string, number> = {
  price: 1,
  campaign: 0.85,
  benefit: 0.75,
  product: 0.6,
  channel: 0.55,
  policy: 0.5,
};
const isSales = (e: MarketEvent) => e.types.some((t) => t in SALES_WEIGHT);

/** Reported "mvno" items are MVNO market news; only our own records belong to the MVNO business. */
const isMvnoNews = (e: MarketEvent) =>
  e.operator.toLowerCase() === "mvno" && e.evidenceKind === "reported";
export function eventBusiness(e: MarketEvent): HomeBusiness | null {
  const id = e.operator.toLowerCase();
  if (isMvnoNews(e)) return null;
  return id === "air" || id === "tds" || id === "mvno" ? id : null;
}
export function eventLayer(e: MarketEvent): Layer {
  if (eventBusiness(e)) return "own";
  if (isMvnoNews(e) || !isSales(e)) return "news";
  return e.operator === "SKT" ? "skt" : "rival";
}
/** Detailed source of an event, used for tags and colors. */
export type EventKind = "mnoNews" | "mvnoNews" | "rival" | "skt" | HomeBusiness;
export const EVENT_KINDS: Record<EventKind, { label: string; color: string }> = {
  mnoNews: { label: "MNO", color: "var(--color-gray-500)" },
  mvnoNews: { label: "MVNO", color: "var(--color-slate-400)" },
  rival: { label: "타사", color: "var(--color-orange-600)" },
  skt: { label: "SKT", color: "var(--color-rose-700)" },
  air: { label: "AIR", color: "var(--color-blue-500)" },
  tds: { label: "TDS", color: "var(--color-emerald-600)" },
  mvno: { label: "MVNO", color: "var(--color-violet-500)" },
};
export function eventKind(e: MarketEvent): EventKind {
  const own = eventBusiness(e);
  if (own) return own;
  if (isMvnoNews(e) || e.marketSegment === "MVNO")
    return isSales(e) && !isMvnoNews(e) ? "rival" : "mvnoNews";
  if (!isSales(e)) return "mnoNews";
  return e.operator === "SKT" ? "skt" : "rival";
}

/** HOME timeline lanes, top to bottom. */
export type TimelineLane = "market" | "online" | "pivot" | "campaign";
export const TIMELINE_LANES: {
  id: TimelineLane;
  label: string;
  color: string;
}[] = [
  { id: "market", label: "시장 소식", color: "var(--color-gray-500)" },
  { id: "online", label: "온라인정책", color: "var(--color-red-600)" },
  { id: "pivot", label: "변곡점", color: "var(--color-blue-600)" },
  { id: "campaign", label: "캠페인", color: "var(--color-yellow-300)" },
];
/** 시장 소식 = MNO·MVNO news and competitor/SKT terms; 온라인정책 = AIR·TDS·MVNO terms. */
export function timelineLane(e: MarketEvent): "market" | "online" {
  return eventBusiness(e) ? "online" : "market";
}
const weight = (e: MarketEvent) =>
  Math.max(0.3, ...e.types.map((t) => SALES_WEIGHT[t] ?? 0.3));
const days = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export type Signal = "respond" | "watch" | "hold" | "stable";
export const SIGNAL_LABEL: Record<Signal, string> = {
  respond: "대응 필요",
  watch: "관망",
  hold: "판단 보류",
  stable: "안정",
};
export const SIGNAL_ORDER: Signal[] = ["respond", "watch", "hold", "stable"];

export type Hypothesis = {
  event: MarketEvent;
  score: number;
  strength: "높음" | "중간" | "낮음";
  relation: string;
};
export type Pulse = {
  business: HomeBusiness;
  name: string;
  signal: Signal;
  confidence: number;
  reason: string;
  reviewAt?: string;
  lines7: number;
  cancel7: number;
  profit7: number;
  netChange: number | null;
  revenueChange: number | null;
  profitChange: number | null;
  lineChange: number | null;
  churnChange: number | null;
  net7: number;
  revenue7: number;
  rivalMoves: MarketEvent[];
  pivot?: { date: string; pct: number; actual: number; baseline: number };
  hypotheses: Hypothesis[];
  precedent?: Precedent;
  competitiveness: number | null;
  /** Daily new lines over the last 28 days. */
  spark: number[];
};
export type Precedent = {
  date: string;
  pct: number;
  recoveryPct: number;
  response: string | null;
  days: number;
};

const sum = (rows: { customers: number }[]) =>
  rows.reduce((s, r) => s + r.customers, 0);
const pct = (a: number, b: number) => (b ? (a / b - 1) * 100 : null);
/** Change against |base| so negative bases keep the direction readable. */
const rel = (a: number, b: number) =>
  b ? ((a - b) / Math.abs(b)) * 100 : null;

export function relationOf(e: MarketEvent, business: HomeBusiness) {
  const layer = eventLayer(e);
  const type = getEventType(
    e.types.find((t) => t in SALES_WEIGHT) ?? e.types[0],
  ).label;
  if (layer === "own")
    return eventBusiness(e) === business
      ? `자사 ${type}`
      : `${businessName(eventBusiness(e)!)} ${type}`;
  if (layer === "skt") return `SKT ${type}`;
  if (layer === "rival") return `${e.operator} ${type}`;
  return "시장 소식";
}

/** Rank events around a turning point by type weight and proximity. */
export function hypothesesFor(
  business: HomeBusiness,
  date: string,
  events: MarketEvent[],
): Hypothesis[] {
  return events
    .filter((e) => {
      const at = e.startAt.slice(0, 10);
      const gap = days(at, date);
      if (gap < -1 || gap > 12) return false;
      const layer = eventLayer(e);
      return (
        layer === "rival" ||
        layer === "skt" ||
        (layer === "own" && eventBusiness(e) === business)
      );
    })
    .map((e) => {
      const gap = Math.max(0, days(e.startAt.slice(0, 10), date));
      const own = eventBusiness(e) === business ? 0.9 : 1;
      return {
        event: e,
        score: weight(e) * own * (1 - gap / 16),
        relation: relationOf(e, business),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || b.event.startAt.localeCompare(a.event.startAt),
    )
    .slice(0, 3)
    .map((h) => ({
      ...h,
      strength: h.score >= 0.7 ? "높음" : h.score >= 0.45 ? "중간" : "낮음",
    }));
}

/** Most recent earlier turning point in the same direction, with its 2-week outcome. */
export function precedentFor(
  business: HomeBusiness,
  date: string,
  direction: number,
  events: MarketEvent[],
): Precedent | undefined {
  const rows = buildHomePerformance(
    { start: MIN_DATE, end: MAX_DATE },
    business,
  );
  const index = new Map(rows.map((r, i) => [r.key, i]));
  const past = homePivotCandidates(business)
    .filter(
      (p) =>
        p.date <= dayShift(date, -21) &&
        Math.sign(p.pct) === Math.sign(direction),
    )
    .at(-1);
  if (!past) return undefined;
  const i = index.get(past.date);
  if (i === undefined) return undefined;
  const after = rows.slice(i + 7, i + 21);
  if (!after.length) return undefined;
  const recovery = pct(sum(after) / after.length, past.baseline) ?? 0;
  const response = events.find(
    (e) =>
      eventBusiness(e) === business &&
      Math.abs(days(e.startAt.slice(0, 10), past.date)) <= 7,
  );
  return {
    date: past.date,
    pct: past.pct,
    recoveryPct: recovery,
    response: response?.title ?? null,
    days: 14,
  };
}

let competitivenessCache: number | null | undefined;
/** Average AIR score against similar plans observed on the same day (50 = parity). */
export function airCompetitiveness() {
  if (competitivenessCache !== undefined) return competitivenessCache;
  const airs = catalog.offers.filter((p) => p.sourceId === "air-official");
  const scores = airs.flatMap((a) =>
    catalog.offers
      .filter(
        (p) =>
          !isAir(p) &&
          similarPlan(a, p) &&
          planDay(p.observedAt) === planDay(a.observedAt),
      )
      .map((p) => competitiveness(a, p, "bill").score)
      .filter((s): s is number => s !== null),
  );
  competitivenessCache = scores.length
    ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
    : null;
  return competitivenessCache;
}

export function pulseOf(
  business: HomeBusiness,
  events: MarketEvent[],
  asOf = MAX_DATE,
): Pulse {
  const end = asOf > MAX_DATE ? MAX_DATE : asOf;
  const rows = buildHomePerformance(
    { start: dayShift(end, -27), end },
    business,
  );
  const last = rows.slice(-7);
  const prev = rows.slice(-14, -7);
  const lineChange = prev.length === 7 ? pct(sum(last), sum(prev)) : null;
  const churn = (r: typeof rows) => r.reduce((s, x) => s + x.cancellations, 0);
  const churnChange = prev.length === 7 ? pct(churn(last), churn(prev)) : null;
  const net = (r: typeof rows) =>
    r.reduce((s, x) => s + x.customers - x.cancellations, 0);
  const total = (r: typeof rows, key: "revenue" | "netProfit") =>
    r.reduce((s, x) => s + x[key], 0);
  const rivalMoves = events
    .filter(
      (e) =>
        (eventLayer(e) === "rival" || eventLayer(e) === "skt") &&
        e.startAt.slice(0, 10) <= end &&
        e.startAt.slice(0, 10) >= dayShift(end, -13),
    )
    .sort(
      (a, b) => weight(b) - weight(a) || b.startAt.localeCompare(a.startAt),
    );
  const candidate = homePivotCandidates(business)
    .filter((p) => p.date <= end && p.date >= dayShift(end, -20))
    .at(-1);
  const pivot = candidate && {
    date: candidate.date,
    pct: candidate.pct,
    actual: candidate.actual,
    baseline: candidate.baseline,
  };
  const hypotheses = pivot ? hypothesesFor(business, pivot.date, events) : [];
  const precedent = pivot
    ? precedentFor(business, pivot.date, pivot.pct, events)
    : undefined;
  const change = lineChange ?? 0;
  let signal: Signal = "stable";
  let reason = "회선·경쟁 변화 없음";
  if (lineChange === null) {
    signal = "hold";
    reason = "2주 실적 미집계";
  } else if (
    (pivot && pivot.pct < 0) ||
    (change <= -8 && rivalMoves.length > 0)
  ) {
    signal = "respond";
    reason =
      pivot && pivot.pct < 0
        ? `${pivot.date.slice(5)} 회선 ${pivot.pct.toFixed(0)}%${hypotheses[0] ? ` · ${hypotheses[0].relation}` : ""}`
        : `회선 ${change.toFixed(1)}% · 경쟁 ${rivalMoves.length}건`;
  } else if (
    change <= -3 ||
    rivalMoves.length >= 3 ||
    (pivot && pivot.pct > 0)
  ) {
    signal = "watch";
    reason =
      pivot && pivot.pct > 0
        ? `${pivot.date.slice(5)} 회선 +${pivot.pct.toFixed(0)}% 반등 · 지속 확인`
        : change <= -3
          ? `회선 ${change.toFixed(1)}% 하락 추세`
          : `경쟁 정책 ${rivalMoves.length}건(2주)`;
  }
  const confidence =
    signal === "hold"
      ? 0
      : Math.round(
          Math.min(
            94,
            58 +
              Math.min(22, Math.abs(change) * 1.5) +
              Math.min(3, rivalMoves.length) * 3 +
              (pivot ? 6 : 0) +
              (hypotheses[0]?.strength === "높음" ? 5 : 0),
          ),
        );
  return {
    business,
    name: businessName(business),
    signal,
    confidence,
    reason,
    reviewAt: signal === "watch" ? dayShift(end, 7) : undefined,
    lines7: sum(last),
    cancel7: churn(last),
    profit7: last.reduce((s, r) => s + r.netProfit, 0),
    netChange: prev.length === 7 ? rel(net(last), net(prev)) : null,
    revenueChange:
      prev.length === 7
        ? pct(total(last, "revenue"), total(prev, "revenue"))
        : null,
    profitChange:
      prev.length === 7
        ? rel(total(last, "netProfit"), total(prev, "netProfit"))
        : null,
    lineChange,
    churnChange,
    net7: last.reduce((s, r) => s + r.customers - r.cancellations, 0),
    revenue7: last.reduce((s, r) => s + r.revenue, 0),
    rivalMoves,
    pivot,
    hypotheses,
    precedent,
    competitiveness: business === "air" ? airCompetitiveness() : null,
    spark: rows.map((r) => r.customers),
  };
}

export type TurningPoint = {
  id: string;
  business: HomeBusiness;
  date: string;
  pct: number;
  hypotheses: Hypothesis[];
  response: MarketEvent | null;
  outcomePct: number | null;
  status: "대응 필요" | "대응 완료" | "성과 확인";
};
/** Turning points with the linked causes, our response and what happened next. */
export function turningPoints(
  business: HomeBusiness,
  events: MarketEvent[],
  since: string,
  asOf = MAX_DATE,
): TurningPoint[] {
  const end = asOf > MAX_DATE ? MAX_DATE : asOf;
  const rows = buildHomePerformance(
    { start: MIN_DATE, end: MAX_DATE },
    business,
  );
  const index = new Map(rows.map((r, i) => [r.key, i]));
  return homePivotCandidates(business)
    .filter((p) => p.date >= since && p.date <= end)
    .map((p) => {
      const response =
        events
          .filter(
            (e) =>
              eventBusiness(e) === business &&
              isSales(e) &&
              days(p.date, e.startAt.slice(0, 10)) >= 0 &&
              days(p.date, e.startAt.slice(0, 10)) <= 10,
          )
          .sort((a, b) => a.startAt.localeCompare(b.startAt))[0] ?? null;
      const i = index.get(p.date) ?? -1;
      const after = i >= 0 ? rows.slice(i + 1, i + 8) : [];
      const outcomePct =
        after.length === 7 ? pct(sum(after) / 7, p.baseline) : null;
      const status: TurningPoint["status"] =
        p.pct > 0 ? "성과 확인" : response ? "대응 완료" : "대응 필요";
      return {
        id: `${business}-${p.date}`,
        business,
        date: p.date,
        pct: p.pct,
        hypotheses: hypothesesFor(business, p.date, events),
        response,
        outcomePct,
        status,
      };
    })
    .reverse();
}

export type BriefLine = {
  kind: "사실" | "예측" | "가설";
  text: string;
  href?: string;
};
const signed = (v: number | null, digits = 1) =>
  v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;

/** Morning briefing: what changed, how we are doing, what to look at first. */
export function briefing(
  pulses: Pulse[],
  events: MarketEvent[],
  asOf = MAX_DATE,
): BriefLine[] {
  const end = asOf > MAX_DATE ? MAX_DATE : asOf;
  const week = events.filter(
    (e) =>
      e.startAt.slice(0, 10) <= end &&
      e.startAt.slice(0, 10) >= dayShift(end, -6),
  );
  const rival = week.filter((e) => eventLayer(e) === "rival");
  const skt = week.filter((e) => eventLayer(e) === "skt");
  const news = week.filter((e) => eventLayer(e) === "news");
  const top = [...rival, ...skt].sort(
    (a, b) => weight(b) - weight(a) || b.startAt.localeCompare(a.startAt),
  )[0];
  const lines: BriefLine[] = [
    {
      kind: "사실",
      text: `7일 시장: 타사 ${rival.length} · SKT ${skt.length} · 소식 ${news.length}건${top ? ` — 최대 변화 ‘${top.title}’` : ""}`,
    },
    {
      kind: "사실",
      text: `회선 WoW: ${pulses.map((p) => `${p.name} ${signed(p.lineChange, 0)}`).join(" · ")}`,
    },
  ];
  const urgent = pulses.find((p) => p.signal === "respond");
  const watch = pulses.find((p) => p.signal === "watch");
  if (urgent)
    lines.push({
      kind: urgent.hypotheses.length ? "가설" : "예측",
      text: `${urgent.name} 대응 필요 — ${urgent.reason}${urgent.precedent ? ` · 유사 사례 2주 후 ${signed(urgent.precedent.recoveryPct, 0)}` : ""} → 판매조건 검토`,
    });
  else if (watch)
    lines.push({
      kind: "예측",
      text: `${watch.name} 관망 — ${watch.reason} · ${watch.reviewAt?.slice(5)} 재점검`,
    });
  else
    lines.push({
      kind: "예측",
      text: "전 사업 안정 — 현행 판매조건 유지",
    });
  return lines;
}
