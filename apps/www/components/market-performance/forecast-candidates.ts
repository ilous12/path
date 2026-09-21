import type { MarketEvent } from "./data";

export const FORECAST_CANDIDATES = {
  damped: {
    label: "지수평활 · 수준 / 감쇠 추세",
    description:
      "최근 수준과 추세를 갱신하되, 먼 미래의 증가·감소 추세는 점차 줄입니다.",
    requirements: "최소 2일 · 14일 이상 권장",
    available: true,
  },
  trend: {
    label: "선형 추세",
    description:
      "관측 구간의 일별 기울기를 연장해 다른 모델의 비교 기준으로 사용합니다.",
    requirements: "최소 2일 · 구조 변화 구간 해석 주의",
    available: true,
  },
  prophet: {
    label: "Prophet",
    description: "변곡점 전후 추세와 주기성, 행사 효과를 함께 모델링합니다.",
    requirements: "충분한 반복 주기 · 변곡점 및 행사 날짜 · 시간 순서 검증",
    available: false,
  },
  sarimax: {
    label: "SARIMAX",
    description:
      "자기상관·계절성과 가격·프로모션 등 외부 설명 변수를 함께 분석합니다.",
    requirements: "반복 주기 데이터 · 미래 외부 변수의 확정값 또는 가정",
    available: false,
  },
  xgboost: {
    label: "XGBoost",
    description:
      "가격·혜택·채널·이벤트와 과거 실적의 비선형 관계를 학습합니다.",
    requirements:
      "시차·이동통계 특성 · 충분한 학습 사례 · 누수 없는 시계열 검증",
    available: false,
  },
} as const;
export type ForecastCandidate = keyof typeof FORECAST_CANDIDATES;

export function recommendForecasts(
  events: MarketEvent[],
  values: number[],
  alternative = 0,
) {
  const types = new Set(events.flatMap((event) => event.types));
  const pivot =
    types.has("pivot") ||
    values.some((value, i) => {
      if (i < 7) return false;
      const base = values.slice(i - 7, i).reduce((sum, n) => sum + n, 0) / 7;
      return base !== 0 && Math.abs((value - base) / base) >= 0.3;
    });
  let specialist: ForecastCandidate;
  let reason: string;
  if (alternative === 0) {
    specialist = "sarimax";
    reason =
      "현행 유지: 수준 지수평활로 최근 실적 수준을 유지합니다. 반복 주기와 외부 요인의 지속 효과는 SARIMAX로 비교합니다.";
  } else if (alternative === 1) {
    specialist = ["price", "benefit", "channel", "campaign"].some((type) =>
      types.has(type),
    )
      ? "xgboost"
      : "sarimax";
    reason =
      "선별 혜택 조정: 감쇠 추세 지수평활로 최근 반응을 반영하고 장기 외삽을 완화합니다. 가격·혜택·채널 이벤트가 있으면 XGBoost를 비교 후보로 제안합니다.";
  } else {
    specialist =
      pivot || types.has("product") || types.has("policy")
        ? "prophet"
        : "xgboost";
    reason =
      "가격·상품 구조 조정: 선형 추세를 기준 비교로 사용합니다. 변곡점·상품·정책 변화가 있으면 Prophet의 추세 전환 모델을 비교 후보로 제안합니다. 구조 조정 효과 자체를 선형 추세가 입증하는 것은 아닙니다.";
  }
  return {
    candidates: (alternative === 2
      ? ["trend", "damped", specialist]
      : ["damped", "trend", specialist]) as ForecastCandidate[],
    reason,
  };
}
