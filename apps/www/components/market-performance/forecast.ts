export const FORECAST_METHODS = {
  prophet: {
    label: "Prophet",
    description: "추세와 요일·주기성을 분해해 예측합니다.",
  },
  sarimax: {
    label: "SARIMAX",
    description: "평활·감쇠 추세·주기성을 결합해 예측합니다.",
  },
  xgboost: {
    label: "XGBoost",
    description: "추세와 비선형 반응을 결합해 예측합니다.",
  },
  damped: {
    label: "감쇠 추세 지수평활",
    description:
      "Holt 감쇠 추세: 수준 α=0.3, 추세 β=0.1, 감쇠 φ=0.9로 향후 추세를 점진적으로 줄입니다.",
  },
  average: {
    label: "이동평균",
    description: "최근 7일 평균을 앞으로의 기준 수준으로 사용합니다.",
  },
  smoothing: {
    label: "지수평활",
    description:
      "최대 28일 관측값에서 최근 값에 더 큰 비중을 둡니다. 평활계수 α=0.3을 사용합니다.",
  },
  trend: {
    label: "선형 추세",
    description:
      "최대 28일 관측값에 최소제곱 직선을 맞춰 향후 30일을 연장합니다.",
  },
} as const;
export type ForecastMethod = keyof typeof FORECAST_METHODS;
export type ForecastMetric =
  | "customers"
  | "cancellations"
  | "revenue"
  | "netProfit";
type Observation = Record<ForecastMetric, number>;

export function projectSeries(
  values: number[],
  method: ForecastMethod,
  horizon = 30,
): number[] {
  if (!values.length) return Array.from({ length: horizon }, () => 0);
  // UI scenario adapters only: these are NOT fitted Prophet/SARIMAX/XGBoost models.
  // Replace these deterministic preview series with model-service results when connected.
  if (method === "prophet" || method === "sarimax" || method === "xgboost") {
    const recent = values.slice(-7);
    const mean = recent.reduce((sum, value) => sum + value, 0) / recent.length;
    const damped = projectSeries(values, "damped", horizon);
    const localTrend = projectSeries(recent, "trend", horizon);
    const smooth = projectSeries(values, "smoothing", horizon);
    return Array.from({ length: horizon }, (_, i) => {
      const seasonal = recent[i % recent.length] - mean;
      if (method === "prophet")
        return 0.75 * damped[i] + 0.25 * localTrend[i] + 0.2 * seasonal;
      if (method === "sarimax")
        return 0.6 * smooth[i] + 0.4 * damped[i] + 0.4 * seasonal;
      const scale = Math.max(1, Math.abs(mean));
      return (
        damped[i] +
        0.15 * scale * Math.tanh((localTrend[i] - damped[i]) / scale)
      );
    });
  }
  const n = values.length;
  if (method === "damped") {
    let level = values[0];
    let trend = n > 1 ? values[1] - values[0] : 0;
    for (const value of values.slice(1)) {
      const previous = level;
      level = 0.3 * value + 0.7 * (level + 0.9 * trend);
      trend = 0.1 * (level - previous) + 0.9 * 0.9 * trend;
    }
    let dampedSum = 0;
    return Array.from({ length: horizon }, (_, i) => {
      dampedSum += 0.9 ** (i + 1);
      return level + dampedSum * trend;
    });
  }
  const recent = values.slice(-7);
  const mean = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  let level = values[0];
  for (const value of values.slice(1)) level = 0.3 * value + 0.7 * level;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((sum, value) => sum + value, 0) / n;
  const denominator = values.reduce((sum, _, i) => sum + (i - xMean) ** 2, 0);
  const slope = denominator
    ? values.reduce((sum, value, i) => sum + (i - xMean) * (value - yMean), 0) /
      denominator
    : 0;
  return Array.from({ length: horizon }, (_, i) =>
    method === "average"
      ? mean
      : method === "smoothing"
        ? level
        : yMean + slope * (n + i - xMean),
  );
}

export function forecastPolicy(
  history: Observation[],
  method: ForecastMethod,
  effect: Observation,
  horizon = 30,
) {
  const metrics: ForecastMetric[] = [
    "customers",
    "cancellations",
    "revenue",
    "netProfit",
  ];
  const series = Object.fromEntries(
    metrics.map((metric) => [
      metric,
      projectSeries(
        history.map((row) => row[metric]),
        method,
        horizon,
      ),
    ]),
  ) as Record<ForecastMetric, number[]>;
  return Array.from({ length: horizon }, (_, day) => {
    const current = {} as Observation;
    const predicted = {} as Observation;
    for (const metric of metrics) {
      const raw = series[metric][day];
      current[metric] = Math.round(
        metric === "netProfit" ? raw : Math.max(0, raw),
      );
      // Apply the policy assumption gradually; signed profit can remain negative.
      const adjusted =
        current[metric] +
        (Math.abs(current[metric]) * effect[metric] * (day + 1)) / horizon;
      predicted[metric] = Math.round(
        metric === "netProfit" ? adjusted : Math.max(0, adjusted),
      );
    }
    current.cancellations = Math.min(current.cancellations, current.customers);
    predicted.cancellations = Math.min(
      predicted.cancellations,
      predicted.customers,
    );
    return { current, predicted };
  });
}
