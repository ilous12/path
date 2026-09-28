"use client";
import { useSyncExternalStore } from "react";
import { dayShift } from "@/components/market-performance/alternative-model";
import { projectSeries } from "@/components/market-performance/forecast";
import { AS_OF, type Biz, days, perf } from "./model";

export type Customers = "all" | "new" | "mnp" | "existing";
export type CampaignParams = {
  start: string;
  end: string;
  /** Monthly price change, percent (negative = discount). */
  priceDeltaPct: number;
  /** One-off points/support per new line (원). */
  points: number;
  /** Extra monthly data (GB). */
  dataGb: number;
  budget: number;
  channels: string[];
  plans: string[];
  customers: Customers;
  /** MVVNO: host operators receiving the support. */
  operators: string[];
};
export type CampaignStatus =
  | "draft"
  | "approved"
  | "scheduled"
  | "running"
  | "paused"
  | "ended";
export type Campaign = {
  id: string;
  workspace: Biz;
  name: string;
  change: string;
  goal: { lines: number; net: number };
  params: CampaignParams;
  versions: { n: number; at: string; params: CampaignParams; note: string }[];
  status: CampaignStatus;
  owner: string;
  createdAt: string;
  history: { at: string; action: string }[];
};

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "초안",
  approved: "확정",
  scheduled: "예약",
  running: "진행",
  paused: "중단",
  ended: "종료",
};
export const CUSTOMER_LABEL: Record<Customers, string> = {
  all: "전체",
  new: "신규",
  mnp: "번호이동",
  existing: "기존 고객",
};

/* ───────────────────────── Forecast ───────────────────────── */

const ARPU: Record<Biz, number> = { aiir: 9500, tdds: 52000, mvvno: 9000 };
const MARGIN: Record<Biz, number> = { aiir: 0.35, tdds: 0.31, mvvno: 0.4 };
/** Added lines are valued over this many months (LTV basis). */
export const LTV_MONTHS = 24;

export type ForecastRow = {
  key: string;
  base: number;
  plan: number;
  actual: number | null;
  inWindow: boolean;
};
export type ForecastSummary = {
  lines: number;
  churn: number;
  net: number;
  revenue: number;
  profit: number;
  cost: number;
  roi: number | null;
  liftPct: number;
  risk: "낮음" | "보통" | "높음";
  riskNotes: string[];
};

/** Deterministic response model: price, points and data lift demand with diminishing returns; budget caps spend. */
export function forecast(ws: Biz, p: CampaignParams) {
  const tail = 14;
  const span = days({ start: p.start, end: p.end });
  const horizon = span + tail;
  const historyEnd = p.start <= AS_OF ? dayShift(p.start, -1) : AS_OF;
  const history = perf(ws, {
    start: dayShift(historyEnd, -55),
    end: historyEnd,
  }).map((r) => r.lines);
  const gap = Math.max(0, days({ start: historyEnd, end: p.start }) - 2);
  const series = projectSeries(history, "smoothing", gap + horizon).slice(gap);
  const raw =
    Math.max(0, -p.priceDeltaPct) * 2.5 +
    (p.points / 1000) * 2.2 +
    p.dataGb * 1.2 +
    (p.channels.length && p.channels.length <= 2 ? 2 : 0) +
    (p.customers === "mnp" ? 3 : 0);
  let lift = 60 * (1 - Math.exp(-raw / 60));
  const unit =
    p.points +
    (Math.max(0, -p.priceDeltaPct) / 100) * ARPU[ws] * 3 +
    p.dataGb * 350;
  const baseInWindow = series
    .slice(0, span)
    .reduce((s, v) => s + Math.max(0, v), 0);
  // Every joiner in the window receives the benefit; existing-customer offers reach further.
  const reach = p.customers === "all" || p.customers === "existing" ? 1.35 : 1;
  const wanted = baseInWindow * (1 + lift / 100) * unit * reach;
  let spend = wanted;
  if (p.budget > 0 && wanted > p.budget) {
    lift *= Math.max(0.15, p.budget / wanted);
    spend = p.budget;
  }
  const rows: ForecastRow[] = series.map((v, i) => {
    const key = dayShift(p.start, i);
    const inWindow = i < span;
    const carry = inWindow ? 1 : Math.max(0, 0.3 * (1 - (i - span) / tail));
    const base = Math.max(0, Math.round(v));
    const plan = Math.round(base * (1 + (lift / 100) * carry));
    const actual =
      key <= AS_OF
        ? (perf(ws, { start: key, end: key })[0]?.lines ?? null)
        : null;
    return { key, base, plan, actual, inWindow };
  });
  const extra = rows.reduce((s, r) => s + (r.plan - r.base), 0);
  const churnSaved =
    p.customers === "existing" || p.customers === "all"
      ? Math.round(extra * 0.12)
      : 0;
  const cost = Math.round(spend);
  const revenue = Math.round(extra * ARPU[ws] * LTV_MONTHS);
  const profit = Math.round(revenue * MARGIN[ws] - cost);
  const riskNotes: string[] = [];
  if (p.priceDeltaPct <= -15)
    riskNotes.push("가격 인하 폭이 커 기존 가입자 형평성 이슈");
  if (p.customers === "all")
    riskNotes.push("전체 대상이라 기존 고객 잠식 비용 발생");
  if (profit < 0) riskNotes.push("예상 순익이 음수");
  if (p.budget > 0 && wanted > p.budget)
    riskNotes.push("예산이 목표 효과 대비 부족");
  const summary: ForecastSummary = {
    lines: extra,
    churn: -churnSaved,
    net: extra + churnSaved,
    revenue,
    profit,
    cost,
    roi: cost > 0 ? (profit / cost) * 100 : null,
    liftPct: lift,
    risk: riskNotes.length >= 2 ? "높음" : riskNotes.length ? "보통" : "낮음",
    riskNotes,
  };
  return { rows, summary };
}

/** Alternatives compared on the forecast step. */
export function alternatives(ws: Biz, p: CampaignParams) {
  const scale = (k: number, b: number): CampaignParams => ({
    ...p,
    priceDeltaPct: Math.round(p.priceDeltaPct * k),
    points: Math.round((p.points * k) / 100) * 100,
    dataGb: Math.round(p.dataGb * k),
    budget: Math.round(p.budget * b),
  });
  return [
    {
      id: "base",
      label: "미시행",
      params: {
        ...p,
        priceDeltaPct: 0,
        points: 0,
        dataGb: 0,
        budget: 0,
        channels: [],
      },
    },
    { id: "plan", label: "A · 입력안", params: p },
    { id: "lean", label: "B · 효율안", params: scale(0.6, 0.65) },
    { id: "bold", label: "C · 공격안", params: scale(1.35, 1.45) },
  ].map((a) => ({ ...a, ...forecast(ws, a.params) }));
}

/* ───────────────────────── Store ───────────────────────── */

const KEY = "path-v2-campaigns";
const blank = (
  _ws: Biz,
  over: Partial<CampaignParams> = {},
): CampaignParams => ({
  start: AS_OF,
  end: dayShift(AS_OF, 27),
  priceDeltaPct: 0,
  points: 0,
  dataGb: 0,
  budget: 0,
  channels: [],
  plans: [],
  customers: "new",
  operators: [],
  ...over,
});
const seed = (
  id: string,
  ws: Biz,
  name: string,
  change: string,
  status: CampaignStatus,
  over: Partial<CampaignParams>,
  goal: [number, number],
): Campaign => {
  const params = blank(ws, over);
  return {
    id,
    workspace: ws,
    name,
    change,
    goal: { lines: goal[0], net: goal[1] },
    params,
    versions: [
      { n: 1, at: `${params.start}T00:00:00+09:00`, params, note: "최초 등록" },
    ],
    status,
    owner: "김마케터",
    createdAt: `${dayShift(params.start, -7)}T09:00:00+09:00`,
    history: [
      { at: `${dayShift(params.start, -7)}T09:00:00+09:00`, action: "등록" },
    ],
  };
};
const SEEDS: Campaign[] = [
  seed(
    "c-aiir-1",
    "aiir",
    "번호이동 10,000P 웰컴",
    "번호이동 가입 시 1만 포인트 지급",
    "ended",
    {
      start: "2026-09-07",
      end: "2026-09-20",
      points: 10000,
      budget: 60000000,
      customers: "mnp",
      channels: ["TOSS", "KAKAOPAY"],
    },
    [1800, 1500],
  ),
  seed(
    "c-aiir-2",
    "aiir",
    "7GB 요금 5% 인하",
    "aiir 7GB 월정액 29,000 → 27,550원",
    "running",
    {
      start: "2026-09-12",
      end: "2026-10-11",
      priceDeltaPct: -5,
      budget: 45000000,
      plans: ["aiir 7GB"],
    },
    [2600, 2100],
  ),
  seed(
    "c-aiir-3",
    "aiir",
    "YT 프리미엄 라이트 6개월",
    "신규 가입 시 YouTube Premium Lite 6개월",
    "scheduled",
    {
      start: "2026-10-01",
      end: "2026-10-31",
      points: 6000,
      dataGb: 0,
      budget: 80000000,
      customers: "new",
    },
    [3000, 2500],
  ),
  seed(
    "c-aiir-4",
    "aiir",
    "청년 데이터 2배",
    "만 34세 이하 데이터 2배",
    "draft",
    { start: "2026-10-15", end: "2026-11-14", dataGb: 7, budget: 30000000 },
    [2000, 1700],
  ),
  seed(
    "c-tdds-1",
    "tdds",
    "아이폰18 사전예약 사은품",
    "사전예약 고객 사은품·케이스 증정",
    "running",
    {
      start: "2026-09-11",
      end: "2026-09-30",
      points: 30000,
      budget: 400000000,
      customers: "all",
      channels: ["T다이렉트샵 앱", "T다이렉트샵 웹"],
    },
    [9000, 7000],
  ),
  seed(
    "c-tdds-2",
    "tdds",
    "추석 가족결합 추가할인",
    "가족결합 시 월 5% 추가 할인",
    "ended",
    {
      start: "2026-09-01",
      end: "2026-09-20",
      priceDeltaPct: -5,
      budget: 150000000,
      customers: "existing",
    },
    [6000, 5200],
  ),
  seed(
    "c-tdds-3",
    "tdds",
    "5GX 프라임 기변 쿠폰",
    "기기변경 시 5만원 쿠폰",
    "draft",
    {
      start: "2026-10-05",
      end: "2026-11-04",
      points: 50000,
      budget: 300000000,
      plans: ["5GX 프라임"],
    },
    [5000, 4200],
  ),
  seed(
    "c-mvvno-1",
    "mvvno",
    "SKKT망 20GB+ 도매대가 한시 인하",
    "20GB 이상 요금제 도매대가 8% 인하",
    "running",
    {
      start: "2026-09-10",
      end: "2026-10-31",
      priceDeltaPct: -8,
      budget: 500000000,
      operators: [],
    },
    [5000, 3800],
  ),
  seed(
    "c-mvvno-2",
    "mvvno",
    "번호이동 유치 지원금 배분",
    "사업자별 번호이동 지원금 2만원",
    "scheduled",
    {
      start: "2026-10-01",
      end: "2026-10-31",
      points: 20000,
      budget: 350000000,
      customers: "mnp",
    },
    [4200, 3300],
  ),
  seed(
    "c-mvvno-3",
    "mvvno",
    "eSIM 셀프개통 수수료 면제",
    "eSIM 개통 수수료 2,750원 면제",
    "ended",
    { start: "2026-08-20", end: "2026-09-15", points: 2750, budget: 40000000 },
    [1500, 1200],
  ),
];

type Store = { v: 1; items: Campaign[] };
let state: Store = { v: 1, items: SEEDS };
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};
function load() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Store;
      if (v?.v === 1 && Array.isArray(v.items)) state = v;
    }
  } catch {
    /* keep seeds */
  }
}
function write(items: Campaign[]) {
  state = { v: 1, items };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* session only */
  }
  emit();
}
const now = () => new Date().toISOString();

export function useCampaigns() {
  const snap = useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => ({ v: 1 as const, items: SEEDS }),
  );
  return {
    items: snap.items,
    create(
      ws: Biz,
      name: string,
      change: string,
      goal: Campaign["goal"],
      params: CampaignParams,
    ) {
      const c: Campaign = {
        id: `c-${ws}-${Date.now().toString(36)}`,
        workspace: ws,
        name,
        change,
        goal,
        params,
        versions: [{ n: 1, at: now(), params, note: "최초 등록" }],
        status: "draft",
        owner: "김마케터",
        createdAt: now(),
        history: [{ at: now(), action: "등록" }],
      };
      write([c, ...state.items]);
      return c.id;
    },
    revise(id: string, params: CampaignParams, note: string) {
      write(
        state.items.map((c) =>
          c.id === id
            ? {
                ...c,
                params,
                versions: [
                  ...c.versions,
                  { n: c.versions.length + 1, at: now(), params, note },
                ],
                history: [
                  ...c.history,
                  {
                    at: now(),
                    action: `v${c.versions.length + 1} 저장 · ${note}`,
                  },
                ],
              }
            : c,
        ),
      );
    },
    setStatus(id: string, status: CampaignStatus) {
      write(
        state.items.map((c) =>
          c.id === id
            ? {
                ...c,
                status,
                history: [
                  ...c.history,
                  { at: now(), action: `상태 변경 → ${STATUS_LABEL[status]}` },
                ],
              }
            : c,
        ),
      );
    },
    reset() {
      write(SEEDS);
    },
  };
}
export const blankParams = blank;
