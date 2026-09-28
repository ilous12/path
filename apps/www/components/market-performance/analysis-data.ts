import { assessFocus } from "./focus-assessment";
import type { Focus } from "./analysis-preferences";
import { EVENTS, type MarketEvent } from "./data";
import { buildPerformance, daysBetween, MIN_DATE, type Range } from "./data";
import { buildEventInsights } from "./event-insights";

export function buildAnalysis(
  range: Range,
  hiddenIds: readonly string[] = [],
  sourceEvents: MarketEvent[] = EVENTS,
  focus?: Focus,
  workspace = "aiir",
) {
  const summary = buildEventInsights(range, hiddenIds, sourceEvents, workspace);
  const daily = buildPerformance(range, "day");
  const total = (rows: typeof daily) =>
    rows.reduce(
      (sum, row) => ({
        customers: sum.customers + row.customers,
        cancellations: sum.cancellations + row.cancellations,
        revenue: sum.revenue + row.revenue,
        expenses: sum.expenses + row.expenses,
        netProfit: sum.netProfit + row.netProfit,
      }),
      { customers: 0, cancellations: 0, revenue: 0, expenses: 0, netProfit: 0 },
    );
  const days = daysBetween(range.start, range.end);
  const shift = (date: string, offset: number) =>
    new Date(Date.parse(`${date}T00:00:00Z`) + offset * 86400000)
      .toISOString()
      .slice(0, 10);
  const previousRange = {
    start: shift(range.start, -days),
    end: shift(range.start, -1),
  };
  const previous =
    previousRange.start >= MIN_DATE
      ? total(buildPerformance(previousRange, "day"))
      : null;
  const current = total(daily);
  const operators = [...new Set(summary.events.map((event) => event.operator))]
    .map((name) => ({
      name,
      count: summary.events.filter((event) => event.operator === name).length,
      channels: [
        ...new Set(
          summary.events
            .filter((event) => event.operator === name)
            .map((event) => event.channel),
        ),
      ],
    }))
    .sort((a, b) => b.count - a.count);
  const response =
    workspace.toLowerCase() === "aiir" &&
    summary.events.some((event) =>
      ["aiir-0912", "moyo-0912"].includes(event.id),
    );
  const shock = summary.events.some((event) => event.id === "market-0903");
  const decision = !summary.events.length
    ? "대응 불필요"
    : shock && !response && range.end < "2026-09-12"
      ? "대응 필요"
      : "관망";
  const reason = !summary.events.length
    ? "등록된 이벤트가 없어 추가 조치의 근거가 없습니다. 실적과 데이터 누락 여부는 계속 확인하세요."
    : decision === "대응 필요"
      ? "선택 기간에 경쟁사 할인과 가입 감소가 함께 관측되며, 연결된 aiir 대응은 아직 없습니다. 동일 조건 비교와 제한적 대응 정책을 검토하세요."
      : response
        ? "aiir 대응 이후 경과를 확인하는 구간입니다. 추가 확대에 앞서 유지 효과와 혜택 비용을 검증하세요."
        : "시장 변화는 관측되지만 개별 효과가 확정되지 않았습니다. 가격·혜택 조건을 확인한 뒤 대응 여부를 판단하세요.";
  const assessment = focus ? assessFocus(range, focus) : null;
  return {
    summary,
    daily,
    current,
    previous,
    previousRange,
    days,
    operators,
    decision:
      assessment && summary.events.length ? assessment.decision : decision,
    reason: assessment && summary.events.length ? assessment.text : reason,
    response,
    shock,
  };
}
