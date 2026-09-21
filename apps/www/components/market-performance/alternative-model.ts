import { projectSeries, type ForecastMethod } from "./forecast";
import { scopedPerformance } from "./channel-data";
import type { PolicyRequirements, PolicyReviewSnapshot } from "./policy-requirements";
import {
  buildPerformance,
  bucketKey,
  MIN_DATE,
  MAX_DATE,
  type Grain,
  type Range,
} from "./data";
export const ALTERNATIVE_TYPES = [
  "가격 조정",
  "혜택 변경",
  "채널·마케팅 배분",
  "운영 개선",
  "신규·비정형",
];
export type PolicyAlternative = {
  forecastMethod?: ForecastMethod;
  isNew?: boolean;
  requirements?: PolicyRequirements;
  reviewScenario?: PolicyReviewSnapshot;
  id: string;
  /** Explicit, retrospective demo curve; never an evaluated ML forecast. */
  demoCustomerForecast?: number[];
  demoEvaluationDate?: string;
  eventId?: string;
  groupName?: string;
  workspace?: string;
  operator?: string;
  channel?: string;
  targetChannels?: string[];
  analysisContext?: {start:string;end:string;workspace:string;channels:string[];reason:string;priorities?: import("./analysis-preferences").Focus[];eventIds?: string[];pivotDates?: string[]};
  title: string;
  type: string;
  description: string;
  start: string;
  days: number;
  applyDays?: number;
  cancellationPct?: number;
  pricePct: number;
  demandPct: number;
  variableCostPct: number;
  dailyCost: number;
  oneTimeCost: number;
  status: "draft" | "applied" | "paused";
  createdAt: string;
  parentId?: string;
  prompt?: string;
  history: { at: string; action: string }[];
};
export function dayShift(date: string, days: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function validateAlternative(
  a: Partial<PolicyAlternative>,
): string | null {
  if (a.forecastMethod !== undefined && !["average", "smoothing", "damped", "trend", "prophet", "sarimax", "xgboost"].includes(a.forecastMethod)) return "예측 알고리즘을 확인하세요.";
  if (a.targetChannels !== undefined && (!Array.isArray(a.targetChannels) || a.targetChannels.some(c=>typeof c!=="string" || !c.trim() || c.length>40))) return "적용 채널을 확인하세요.";
  if (a.groupName !== undefined && (typeof a.groupName !== "string" || a.groupName.length > 80)) return "그룹명은 80자 이내로 입력하세요.";
  if (!a.title?.trim() || !a.description?.trim() || !a.type?.trim())
    return "제목·유형·설명을 입력하세요.";
  if (
    !a.start ||
    !/^\d{4}-\d{2}-\d{2}$/.test(a.start) ||
    !Number.isFinite(Date.parse(a.start)) ||
    new Date(a.start).toISOString().slice(0, 10) !== a.start ||
    a.start <= MIN_DATE ||
    a.start > dayShift(MAX_DATE, 90)
  )
    return "적용일은 기준 데이터 시작일 이후부터 마지막 관측일 + 90일 이내여야 합니다.";
  const limits: [keyof PolicyAlternative, number, number][] = [
    ["days", 1, 90],
    ["pricePct", -100, 100],
    ["demandPct", -100, 300],
    ["variableCostPct", -100, 300],
    ["dailyCost", 0, 1e9],
    ["oneTimeCost", 0, 1e10],
  ];
  for (const [k, min, max] of limits) {
    const n = a[k];
    if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max)
      return "기간·가격·수요·비용 가정이 허용 범위를 벗어났습니다.";
  }
  if (!Number.isInteger(a.days)) return "예측 기간은 정수 일수여야 합니다.";
  if (
    a.applyDays !== undefined &&
    (!Number.isInteger(a.applyDays) || a.applyDays < 1 || a.applyDays > 90)
  )
    return "적용 기간은 1~90일입니다.";
  if (
    a.cancellationPct !== undefined &&
    (!Number.isFinite(a.cancellationPct) ||
      a.cancellationPct < -100 ||
      a.cancellationPct > 300)
  )
    return "해지 변화율은 -100~300%입니다.";
  if (a.demoCustomerForecast !== undefined && (!Array.isArray(a.demoCustomerForecast) || a.demoCustomerForecast.length !== a.days || a.demoCustomerForecast.some(n => !Number.isInteger(n) || n < 0))) return "시나리오 회선 예측값을 확인하세요.";
  if (a.demoEvaluationDate !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(a.demoEvaluationDate) || !Number.isFinite(Date.parse(a.demoEvaluationDate)) || new Date(a.demoEvaluationDate).toISOString().slice(0,10) !== a.demoEvaluationDate || a.demoEvaluationDate < a.start || a.demoEvaluationDate > dayShift(a.start,a.days!-1))) return "시나리오 평가일이 예측 기간을 벗어났습니다.";
  return null;
}
export function projectAlternative(a: PolicyAlternative) {
  const error = validateAlternative(a);
  if (error) throw new Error(error);
  const end = a.start > MAX_DATE ? MAX_DATE : dayShift(a.start, -1);
  const start = dayShift(end, a.forecastMethod ? -27 : -6) < MIN_DATE ? MIN_DATE : dayShift(end, a.forecastMethod ? -27 : -6);
  const history = scopedPerformance({ start, end }, a.targetChannels);
  const historyDays = Math.max(1, history.length);
  const baseRevenue =
    history.reduce((s, r) => s + r.revenue, 0) / historyDays;
  const baseCosts =
    history.reduce((s, r) => s + r.expenses, 0) / historyDays;
  const baseCustomers = Math.round(
    history.reduce((s, r) => s + r.customers, 0) / historyDays,
  );
  const baseCancellations = Math.round(
    history.reduce((s, r) => s + r.cancellations, 0) / historyDays,
  );
  const predict = (values: number[]) => a.forecastMethod ? projectSeries(values, a.forecastMethod, a.days).map(v => Math.max(0, v)) : null;
  const customerBaseline = predict(history.map(r => r.customers));
  const cancellationBaseline = predict(history.map(r => r.cancellations));
  const revenueBaseline = predict(history.map(r => r.revenue));
  const costBaseline = predict(history.map(r => r.expenses));
  return Array.from({ length: a.days }, (_, i) => {
    const dailyCustomers = customerBaseline?.[i] ?? baseCustomers;
    const dailyCancellations = cancellationBaseline?.[i] ?? baseCancellations;
    const dailyRevenue = revenueBaseline?.[i] ?? baseRevenue;
    const dailyCosts = costBaseline?.[i] ?? baseCosts;
    const applying = i < (a.applyDays ?? a.days);
    const customers = a.demoCustomerForecast?.[i] ?? Math.round(dailyCustomers * (applying ? 1 + a.demandPct / 100 : 1));
    const demand = a.demoCustomerForecast ? (dailyCustomers > 0 ? customers / dailyCustomers : 1) : (applying ? 1 + a.demandPct / 100 : 1);
    const cancellations = Math.min(
      customers,
      Math.round(
        dailyCancellations * (applying ? 1 + (a.cancellationPct ?? 0) / 100 : 1),
      ),
    );
    const revenue = Math.round(
      dailyRevenue * (applying ? 1 + a.pricePct / 100 : 1) * demand,
    );
    const expenses = Math.round(
      dailyCosts * demand * (applying ? 1 + a.variableCostPct / 100 : 1) +
        (applying ? a.dailyCost : 0) +
        (i === 0 ? a.oneTimeCost : 0),
    );
    return {
      key: dayShift(a.start, i),
      revenue,
      customers,
      cancellations,
      customersDelta: customers - dailyCustomers,
      cancellationsDelta: cancellations - dailyCancellations,
      revenueDelta: revenue - Math.round(dailyRevenue),
      netProfitDelta:
        revenue - expenses - (Math.round(dailyRevenue) - Math.round(dailyCosts)),
      netProfit: revenue - expenses,
      baseRevenue: Math.round(dailyRevenue),
      baseProfit: Math.round(dailyRevenue) - Math.round(dailyCosts),
    };
  });
}
/** Endpoint growth uses the last visible forecast day, not the full forecast end. */
export function experimentEndpoint(a: PolicyAlternative, range: Range, metric: "customers" | "cancellations") {
  const rows = projectAlternative(a).filter(row => row.key >= range.start && row.key <= range.end);
  const last = rows.at(-1);
  if (!last) return null;
  const baselineDate = dayShift(a.start, -1) > MAX_DATE ? MAX_DATE : dayShift(a.start, -1);
  const baseline = scopedPerformance({start: baselineDate, end: baselineDate}, a.targetChannels)[0]?.[metric] ?? 0;
  return {date: last.key, value: last[metric], baseline, growthPct: baseline === 0 ? null : (last[metric] / baseline - 1) * 100};
}

/** Descriptive actual-vs-forecast growth attainment, not causal effect. */
export function evaluateDemoExperiment(a: PolicyAlternative) {
  if (!a.demoCustomerForecast || !a.demoEvaluationDate || a.demoEvaluationDate > MAX_DATE) return null;
  const date = a.demoEvaluationDate;
  const baselineDate = dayShift(a.start,-1);
  const baseline = buildPerformance({start:baselineDate,end:baselineDate},"day")[0].customers;
  const observed = buildPerformance({start:a.start,end:date},"day");
  const projected = projectAlternative(a).filter(row=>row.key<=date);
  const actual = observed.at(-1)!.customers;
  const forecast = projected.at(-1)!.customers;
  const actualGrowth = actual-baseline;
  const forecastGrowth = forecast-baseline;
  const attainment = forecastGrowth > 0 ? actualGrowth/forecastGrowth*100 : null;
  // First >20% daily rise identifies the recovery onset for this demo only.
  const onset = (values: {key:string;customers:number}[]) => values.find((row,i)=>row.customers > (i ? values[i-1].customers : baseline)*1.2)?.key;
  const actualOnset = onset(observed);
  const forecastOnset = onset(projected);
  return {date,baseline,actual,forecast,actualGrowth,forecastGrowth,attainment,
    actualGrowthPct:baseline ? actualGrowth/baseline*100 : 0,
    forecastGrowthPct:baseline ? forecastGrowth/baseline*100 : 0,
    actualOnset,forecastOnset,matchedOnset:Boolean(actualOnset && actualOnset===forecastOnset)};
}

export function alternativeOverlay(
  alternatives: PolicyAlternative[],
  range: Range,
  grain: Grain,
  options: { extendRange?: boolean } = {},
) {
  const active = alternatives.filter(
    (a) =>
      a.status === "applied" &&
      !validateAlternative(a) &&
      (a.start <= dayShift(range.end, 1) || range.end === MAX_DATE) &&
      dayShift(a.start, a.days - 1) >= range.start,
  );
  const projections = active.map((a) => ({
    alternative: a,
    rows: projectAlternative(a),
  }));
  const end = options.extendRange === false ? range.end : projections.reduce(
    (end, p) => (p.rows.at(-1)!.key > end ? p.rows.at(-1)!.key : end),
    range.end,
  );
  const records = new Map<
    string,
    Record<string, string | number | number[] | null>
  >(buildPerformance(range, grain).map((row) => [row.key, { ...row }]));
  for (
    let date = dayShift(range.end, 1);
    date <= end;
    date = dayShift(date, 1)
  ) {
    const key = bucketKey(date, grain);
    if (!records.has(key)) records.set(key, { key });
  }
  for (const { alternative: a, rows } of projections)
    for (const row of rows) {
      if (row.key < range.start || row.key > end) continue;
      const key = bucketKey(row.key, grain);
      const target = records.get(key) ?? { key };
      for (const metric of [
        "revenue",
        "netProfit",
        "customers",
        "cancellations",
        "revenueDelta",
        "netProfitDelta",
        "customersDelta",
        "cancellationsDelta",
      ] as const) {
        const k = `${a.id}_${metric}`;
        target[k] = Number(target[k] ?? 0) + row[metric];
      }
      records.set(key, target);
    }
  for (const row of records.values())
    for (const a of active)
      for (const metric of ["customers", "cancellations"] as const) {
        const value = row[`${a.id}_${metric}`];
        if (typeof value === "number")
          row[`${a.id}_${metric}Contribution`] = [
            value - Number(row[`${a.id}_${metric}Delta`] ?? 0),
            value,
          ];
      }
  return {
    active,
    end,
    rows: [...records.values()].sort((a, b) =>
      String(a.key).localeCompare(String(b.key)),
    ),
  };
}

/** Add a visual bridge from the last visible observation without changing forecasts. */
export function connectExperimentLines(
  rows: Record<string, string | number | number[] | null>[],
  experiments: PolicyAlternative[],
) {
  const connected = rows.map(row => ({...row}));
  for (const experiment of experiments) {
    for (const metric of ["customers", "cancellations"] as const) {
      const sourceKey = `${experiment.id}_${metric}`;
      const lineKey = `${sourceKey}_line`;
      const first = connected.findIndex(row => typeof row[sourceKey] === "number");
      for (const row of connected) row[lineKey] = row[sourceKey] ?? null;
      if (first > 0) {
        const previous = connected[first - 1];
        if (typeof previous[metric] === "number") previous[lineKey] = previous[metric];
      }
    }
  }
  return connected;
}

// Keep the original two bar slots; forecasts replace their values after the boundary.
export function experimentChartRows(
  rows: Record<string, string | number | number[] | null>[],
  experiment: PolicyAlternative | undefined,
  grain: Grain,
) {
  if (!experiment) return rows;
  const boundary = bucketKey(experiment.start, grain);
  const first = rows.findIndex((r) => String(r.key) >= boundary);
  return rows.map((source, index) => {
    const row = { ...source };
    const projected = String(row.key) >= boundary && String(row.key) <= bucketKey(dayShift(experiment.start, experiment.days - 1), grain);
    row.experimentSegment = projected ? 1 : 0;
    for (const metric of [
      "customers",
      "cancellations",
      "revenue",
      "netProfit",
    ] as const) {
      const forecast = source[`${experiment.id}_${metric}`] ?? null;
      row[metric] = projected ? forecast : (source[metric] ?? null);
      {
        row[`observed_${metric}`] = projected ? null : (source[metric] ?? null);
        row[`projected_${metric}`] = projected
          ? forecast
          : index === first - 1
            ? (source[metric] ?? null)
            : null;
      }
    }
    return row;
  });
}

export function promptExperiment(prompt: string) {
  const text = prompt.trim();
  const price = /요금|가격|인하|인상/.test(text);
  const percent =
    text.match(
      /(?:요금|가격)[^%\n]{0,20}?(\d+(?:\.\d+)?)\s*%\s*(인하|인상|할인)/,
    ) ?? text.match(/(\d+(?:\.\d+)?)\s*%\s*(인하|인상|할인)/);
  return {
    title: text.slice(0, 60),
    description: text,
    type: price
      ? "가격 조정"
      : /혜택|데이터|쿠폰|포인트/.test(text)
        ? "혜택 변경"
        : "신규·비정형",
    pricePct:
      price && percent
        ? Number(percent[1]) * (percent[2] === "인상" ? 1 : -1)
        : 0,
  };
}
