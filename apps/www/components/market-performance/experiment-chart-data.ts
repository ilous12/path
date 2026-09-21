import { scopedPerformance } from "./channel-data";
import { buildPerformance, MIN_DATE, MAX_DATE } from "./data";
import {
  dayShift,
  projectAlternative,
  type PolicyAlternative,
} from "./alternative-model";
export const EXPERIMENT_CHART_METRICS = [
  { key: "customers", label: "회선", unit: "회선" },
  { key: "cancellations", label: "해지", unit: "건" },
  { key: "revenue", label: "매출", unit: "원" },
  { key: "netProfit", label: "순익", unit: "원" },
] as const;
export type ExperimentChartMetric =
  (typeof EXPERIMENT_CHART_METRICS)[number]["key"];
export function experimentChartData(
  a: PolicyAlternative,
  metric: ExperimentChartMetric,
) {
  const forecast = projectAlternative(a);
  const reference = new Map(projectAlternative({...a, demoCustomerForecast: undefined, demoEvaluationDate: undefined, pricePct: 0, demandPct: 0, cancellationPct: 0, variableCostPct: 0, dailyCost: 0, oneTimeCost: 0}).map(row => [row.key, row]));
  const forecastEnd = dayShift(a.start, a.days - 1);
  const applyEnd = dayShift(a.start, (a.applyDays ?? a.days) - 1);
  const start =
    dayShift(a.start, -7) < MIN_DATE ? MIN_DATE : dayShift(a.start, -7);
  const end = forecastEnd > applyEnd ? forecastEnd : applyEnd;
  const actualEnd = end < MAX_DATE ? end : MAX_DATE;
  const actual =
    start <= actualEnd
      ? scopedPerformance({ start, end: actualEnd }, a.targetChannels)
      : [];
  const observed = new Map(actual.map((row) => [row.key, row]));
  const projected = new Map(forecast.map((row) => [row.key, row]));
  const anchor = dayShift(a.start, -1);
  const rows = [];
  for (let date = start; date <= end; date = dayShift(date, 1)) {
    const observation = observed.get(date);
    const prediction = projected.get(date);
    rows.push({
      date,
      observed: observation?.[metric] ?? null,
      forecast:
        prediction?.[metric] ??
        (date === anchor ? (observation?.[metric] ?? null) : null),
      reference: reference.get(date)?.[metric] ?? (date === anchor ? observation?.[metric] ?? null : null),
      observation,
      prediction,
    });
  }
  const baseline = observed.get(anchor)?.[metric] ?? null;
  const last = forecast.at(-1)!;
  return {
    rows,
    start,
    end,
    forecastEnd,
    applyEnd,
    baseline,
    last: last[metric],
    growthPct:
      baseline === null || baseline === 0
        ? null
        : (last[metric] / baseline - 1) * 100,
  };
}
