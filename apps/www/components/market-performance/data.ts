import { normalizePresentation } from "./presentation-copy";
import type { PolicyRequirements, PolicyReviewSnapshot } from "./policy-requirements";
import reportedEvents from "./fixtures/telecom-news.json";
import nuggetScenarioEvents from "./fixtures/nugget-response-events.json";
import demoEvents from "./fixtures/telecom-demo.json";

export const EVENT_TYPES: Record<
  string,
  { label: string; color: string; foreground: string; description: string }
> = {
  "ai:보안사고": { label: "보안사고", color: "var(--color-red-600)", foreground: "var(--color-white)", description: "보도된 침해·정보유출 사고" },
  "ai:보안대응": { label: "보안 대응", color: "var(--color-orange-700)", foreground: "var(--color-white)", description: "보안 조치·고객 보호 발표" },
  pivot: {
    label: "변곡점",
    color: "var(--color-blue-600)",
    foreground: "var(--color-white)",
    description: "실적 흐름의 급감·반등·회복·성장 전환",
  },
  price: {
    label: "가격 변경",
    color: "var(--color-red-600)",
    foreground: "var(--color-white)",
    description: "월 납부액 인상·인하",
  },
  benefit: {
    label: "혜택 변경",
    color: "var(--color-blue-600)",
    foreground: "var(--color-white)",
    description: "포인트·데이터·부가 혜택 변경",
  },
  product: {
    label: "상품 출시·종료",
    color: "var(--color-green-700)",
    foreground: "var(--color-white)",
    description: "신규 상품 출시·종료·구성 개편",
  },
  campaign: {
    label: "프로모션",
    color: "var(--color-purple-600)",
    foreground: "var(--color-white)",
    description: "기간 한정 캠페인·기획전",
  },
  channel: {
    label: "채널·노출",
    color: "var(--color-cyan-700)",
    foreground: "var(--color-white)",
    description: "채널별 노출·유입 조건 변경",
  },
  policy: {
    label: "정책·조건",
    color: "var(--color-orange-700)",
    foreground: "var(--color-white)",
    description: "가입·유지·지급 조건 변경",
  },
} as const;
export type EventType = string;
export function getEventType(id: string) {
  return (
    EVENT_TYPES[id] ?? {
      label: id.replace(/^ai:/, ""),
      description: "AI가 감지한 신규 이벤트 유형",
      color: "var(--color-slate-600)",
      foreground: "var(--color-white)",
    }
  );
}
export function eventTypes(events: MarketEvent[]): EventType[] {
  const found = new Set(events.flatMap((event) => event.types));
  return (Object.keys(EVENT_TYPES) as EventType[]).filter((type) =>
    found.has(type),
  );
}
export function annotationBackground(types: EventType[]) {
  const unique = [...new Set(types)];
  if (!unique.length) return EVENT_TYPES.policy.color;
  return unique
    .slice(1)
    .reduce(
      (mixed, type, index) =>
        `color-mix(in srgb, ${mixed} ${((index + 1) / (index + 2)) * 100}%, ${getEventType(type).color})`,
      getEventType(unique[0]).color as string,
    );
}
export function annotationForeground(_types: EventType[]) {
  return "var(--color-white)";
}

export const MIN_DATE = "2024-01-01";
export const MAX_DATE = "2026-09-21";
export const EVENT_WINDOW_START = "2024-09-21";
const DAY = 86_400_000;
export type Grain = "day" | "month" | "year";
export type Range = { start: string; end: string };
export type MarketEvent = {
  requirements?: PolicyRequirements;
  reviewScenario?: PolicyReviewSnapshot;
  sourceType?: string;
  prompt?: string;
  processingMode?: "demo";
  evidenceKind?: "reported" | "demo";
  dateBasis?: "publication" | "synthetic";
  publishedAt?: string;
  effectiveDate?: string;
  sourceTitle?: string;
  marketSegment?: string;
  sourceName?: string;
  sourceUrl?: string;
  recordedBy?: string;
  recordedAt?: string;
  id: string;
  types: EventType[];
  title: string;
  startAt: string;
  endAt?: string;
  operator: string;
  channel: string;
  targetChannels?: string[];
  summary: string;
  before: string;
  after: string;
  next: string;
};
// Static snapshot: real publication dates are preserved; only demo events are randomized.
export const EVENTS: MarketEvent[] = normalizePresentation([...reportedEvents, ...demoEvents, ...nuggetScenarioEvents] as MarketEvent[]);

const timestamp = (date: string) => Date.parse(`${date}T00:00:00Z`);
export const daysBetween = (start: string, end: string) =>
  Math.round((timestamp(end) - timestamp(start)) / DAY) + 1;
/** Resize the selected interval around its midpoint, clamped to available dates. */
export function zoomRange(range: Range, delta: number, maxDate = MAX_DATE): Range {
  if (!Number.isFinite(delta) || delta === 0) return range;
  const total = daysBetween(MIN_DATE, maxDate);
  const current = daysBetween(range.start, range.end);
  const scaled = current * Math.exp(Math.max(-1, Math.min(1, delta * 0.002)));
  const size = Math.max(
    1,
    Math.min(total, delta > 0 ? Math.ceil(scaled) : Math.floor(scaled)),
  );
  const first = daysBetween(MIN_DATE, range.start) - 1;
  const start = Math.max(
    0,
    Math.min(total - size, Math.round(first + (current - size) / 2)),
  );
  const date = (index: number) =>
    new Date(timestamp(MIN_DATE) + index * DAY).toISOString().slice(0, 10);
  return { start: date(start), end: date(start + size - 1) };
}
/** Pan a window without changing its duration or crossing available data bounds. */
export function panRange(range: Range, offsetDays: number, maxDate = MAX_DATE): Range {
  if (!Number.isFinite(offsetDays)) return range;
  const offset = Math.max(daysBetween(range.start, MIN_DATE) - 1, Math.min(daysBetween(range.end, maxDate) - 1, Math.round(offsetDays)));
  const shift = (date: string) => new Date(timestamp(date) + offset * DAY).toISOString().slice(0,10);
  return {start:shift(range.start),end:shift(range.end)};
}
export function presetRange(preset: string): Range {
  if (preset === "2Y") return { start: EVENT_WINDOW_START, end: MAX_DATE };
  const offset = preset === "1W" ? 6 : preset === "1M" ? 29 : 364;
  return {
    start: new Date(timestamp(MAX_DATE) - offset * DAY)
      .toISOString()
      .slice(0, 10),
    end: MAX_DATE,
  };
}
export function validateRange(range: Range, maxDate = MAX_DATE): string | undefined {
  if (
    ![range.start, range.end].every(
      (d) =>
        /^\d{4}-\d{2}-\d{2}$/.test(d) &&
        Number.isFinite(timestamp(d)) &&
        new Date(timestamp(d)).toISOString().slice(0, 10) === d,
    )
  )
    return "시작일과 종료일을 올바른 날짜로 입력하세요.";
  if (range.start > range.end) return "종료일은 시작일 이후여야 합니다.";
  if (range.start < MIN_DATE || range.end > maxDate)
    return `조회 가능 기간은 ${MIN_DATE}~${maxDate}입니다.`;
}
export function grainFor(range: Range): Grain {
  const days = daysBetween(range.start, range.end);
  return days <= 62 ? "day" : days <= 730 ? "month" : "year";
}
export const bucketKey = (date: string, grain: Grain) =>
  date.slice(0, grain === "day" ? 10 : grain === "month" ? 7 : 4);
export function buildPerformance(range: Range, grain: Grain = grainFor(range)) {
  const buckets = new Map<
    string,
    {
      key: string;
      revenue: number;
      expenses: number;
      customers: number;
      cancellations: number;
      netProfit: number;
      profitMargin: number;
      days: number;
    }
  >();
  for (let t = Math.max(timestamp(range.start), timestamp(MIN_DATE)); t <= Math.min(timestamp(range.end), timestamp(MAX_DATE)); t += DAY) {
    const i = Math.round((t - timestamp(MIN_DATE)) / DAY);
    const key = bucketKey(new Date(t).toISOString(), grain);
    const date = new Date(t).toISOString().slice(0, 10);
    let customers = Math.round(160 + i * 0.09 + Math.sin(i * 0.37) * 38);
    let cancellations = Math.round(32 + i * 0.025 + Math.sin(i * 0.29) * 12);
    let revenue = Math.round(950000 + i * 1100 + Math.sin(i * 0.22) * 170000);
    let expenseRatio = 0.7 + Math.cos(i * 0.14) * 0.035;
    // Deterministic fictional event impact, visible within the default 1M window.
    // Daily values are computed before aggregation so navigator and all grains agree.
    if (date >= "2026-08-19") {
      const day = daysBetween("2026-08-19", date) - 1;
      customers = Math.round(260 + Math.sin(day * 0.7) * 12);
      cancellations = Math.round(48 + Math.sin(day * 0.5) * 5);
      revenue = Math.round(2100000 + Math.sin(day * 0.6) * 70000);
      expenseRatio = 0.7;
      if (date >= "2026-09-03" && date < "2026-09-12") {
        const shockDay = daysBetween("2026-09-03", date) - 1;
        customers = Math.round(90 + Math.sin(shockDay * 0.8) * 9);
        cancellations = Math.round(68 + Math.sin(shockDay * 0.6) * 6);
        revenue = Math.round(1200000 + Math.sin(shockDay * 0.7) * 50000);
        expenseRatio = 0.88;
      } else if (date >= "2026-09-12") {
        const recoveryDay = Math.min(daysBetween("2026-09-12", date) - 1, 5);
        customers = [180, 245, 295, 335, 370, 400][recoveryDay];
        cancellations = [62, 55, 45, 36, 30, 25][recoveryDay];
        revenue = [1550000, 1900000, 2180000, 2420000, 2680000, 2900000][
          recoveryDay
        ];
        // Recovery incentives initially constrain profit despite rising sales.
        expenseRatio = [0.86, 0.83, 0.8, 0.77, 0.74, 0.72][recoveryDay];
      }
    }
    // Keep mock cancellations below the same day's line count in every range.
    cancellations = Math.min(cancellations, Math.max(0, customers - 1));
    const expenses = Math.round(revenue * expenseRatio);
    const row = buckets.get(key) ?? {
      key,
      revenue: 0,
      expenses: 0,
      customers: 0,
      cancellations: 0,
      netProfit: 0,
      profitMargin: 0,
      days: 0,
    };
    row.revenue += revenue;
    row.expenses += expenses;
    row.customers += customers;
    row.cancellations += cancellations;
    row.netProfit = row.revenue - row.expenses;
    row.days++;
    row.profitMargin = ((row.revenue - row.expenses) / row.revenue) * 100;
    buckets.set(key, row);
  }
  return [...buckets.values()];
}
export function groupEvents(
  range: Range,
  grain: Grain,
  hiddenIds: readonly string[] = [],
  sourceEvents: MarketEvent[] = EVENTS,
) {
  const groups = new Map<string, MarketEvent[]>();
  for (const event of sourceEvents) {
    if (hiddenIds.includes(event.id)) continue;
    // Missing 종료일 represents a point event, not an infinitely running policy.
    const start = event.startAt.slice(0, 10),
      end = (event.endAt ?? event.startAt).slice(0, 10);
    if (start > range.end || end < range.start) continue;
    const key = bucketKey(start < range.start ? range.start : start, grain);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, events]) => ({ key, events }));
}
export const formatAt = (at: string) => `${at.replace("T", " ")} (한국 시간)`;

export const RECOVERY_MILESTONES = [
  {
    date: "2026-09-03",
    title: "경쟁사 할인",
    stage: "급감",
    description: "경쟁사 할인 직후 가입 감소",
    reference: "2026-09-02",
  },
  {
    date: "2026-09-12",
    title: "AIR 대응",
    stage: "반등",
    description: "가입·유지 혜택과 채널 노출 강화",
    reference: "2026-09-11",
  },
  {
    date: "2026-09-14",
    title: "이전 수준 회복",
    stage: "회복",
    description: "할인 전 가입 수준을 다시 상회",
    reference: "2026-09-02",
  },
  {
    date: "2026-09-17",
    title: "회선 성장",
    stage: "성장",
    description: "대응 이후 가입 확대 지속",
    reference: "2026-09-02",
  },
] as const;

export function buildRecoveryInsights(range: Range) {
  const daily = buildPerformance(range, "day");
  const first = daily[0];
  const last = daily[daily.length - 1];
  const phase =
    range.end < "2026-09-03"
      ? "이벤트 이전"
      : range.end < "2026-09-12"
        ? "가입 급감"
        : range.end < "2026-09-14"
          ? "반등 진행"
          : range.end < "2026-09-17"
            ? "이전 수준 회복"
            : "성장 전환";
  const summary =
    phase === "이벤트 이전"
      ? "선택 기간에는 경쟁사 할인과 air 대응이 아직 발생하지 않았습니다."
      : phase === "가입 급감"
        ? "경쟁사 할인 이후 가입이 감소하고 해지가 늘어난 구간입니다. 혜택과 채널 대응 검토가 필요합니다."
        : phase === "반등 진행"
          ? "air 대응 이후 가입이 반등 중입니다. 회복 지속 여부와 혜택 비용을 함께 관찰하세요."
          : phase === "이전 수준 회복"
            ? "가입이 경쟁사 할인 이전 수준을 회복했습니다. 단기 반등의 지속 여부를 확인하세요."
            : "air 대응 이후 가입이 할인 이전 수준을 넘어섰습니다. 혜택 유지 비용과 순익을 함께 점검하세요.";
  const milestones = RECOVERY_MILESTONES.filter(
    (item) => item.date >= range.start && item.date <= range.end,
  ).map((item) => {
    const current = buildPerformance(
      { start: item.date, end: item.date },
      "day",
    )[0].customers;
    const previous = buildPerformance(
      { start: item.reference, end: item.reference },
      "day",
    )[0].customers;
    return {
      ...item,
      current,
      previous,
      change: (current / previous - 1) * 100,
      referenceOutside: item.reference < range.start,
    };
  });
  return {
    phase,
    summary,
    milestones,
    first: first.customers,
    last: last.customers,
    change: (last.customers / first.customers - 1) * 100,
  };
}

export const EVENT_OWNERSHIP = {
  own: {
    label: "우리 이벤트",
    color: "var(--color-red-600)",
    description: "air 정책·혜택 및 air 채널 이벤트",
  },
  competitor: {
    label: "경쟁사 이벤트",
    color: "var(--color-gray-600)",
    description: "경쟁사 이벤트만 포함",
  },
  mixed: {
    label: "우리 + 경쟁사",
    color: "var(--color-red-600)",
    description: "같은 구간에 우리와 경쟁사 이벤트가 함께 포함",
  },
} as const;
export function eventOwnership(events: MarketEvent[], workspace = "air") {
  const own = events.some(
    (event) => event.operator.toLowerCase() === workspace.toLowerCase(),
  );
  const competitor = events.some(
    (event) => event.operator.toLowerCase() !== workspace.toLowerCase(),
  );
  return EVENT_OWNERSHIP[
    own && competitor ? "mixed" : own ? "own" : "competitor"
  ];
}

/** Group only selected turning-point dates; do not expose future/out-of-range stages. */
export function buildTurningPoints(
  range: Range,
  hiddenIds: readonly string[] = [],
) {
  const grain = grainFor(range);
  const rows = buildPerformance(range, grain);
  const grouped = new Map<string, (typeof RECOVERY_MILESTONES)[number][]>();
  for (const item of RECOVERY_MILESTONES) {
    if (
      item.date === "2026-09-03"
        ? hiddenIds.includes("market-0903")
        : hiddenIds.includes("air-0912") && hiddenIds.includes("moyo-0912")
    )
      continue;
    if (item.date < range.start || item.date > range.end) continue;
    const key = bucketKey(item.date, grain);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }
  return [...grouped].map(([key, stages]) => ({
    key,
    customers: rows.find((row) => row.key === key)!.customers,
    stages,
    color:
      stages.length > 1
        ? "var(--color-gray-600)"
        : stages[0].stage === "급감"
          ? "var(--color-red-600)"
          : "var(--color-blue-600)",
    label:
      stages.map((stage) => `${stage.date} ${stage.title}`).join(" · ") +
      (grain === "day" ? "" : " · 집계 구간"),
  }));
}
