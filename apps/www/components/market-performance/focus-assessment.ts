import { buildPerformance, daysBetween, MIN_DATE, type Range } from "./data";
import type { Focus } from "./analysis-preferences";
export function assessFocus(range: Range, focus: Focus) {
  const keys = {
    growth: "customers",
    retention: "cancellations",
    profit: "netProfit",
  } as const;
  const labels = {
    growth: "회선 성장",
    retention: "이탈 방어",
    profit: "수익성",
  };
  const end = new Date(Date.parse(range.start + "T00:00:00Z") - 86400000)
    .toISOString()
    .slice(0, 10);
  const start = new Date(
    Date.parse(range.start + "T00:00:00Z") -
      daysBetween(range.start, range.end) * 86400000,
  )
    .toISOString()
    .slice(0, 10);
  if (start < MIN_DATE)
    return {
      decision: "관망",
      text: `${labels[focus]} 기준 · 직전 동일 기간 데이터가 없어 비교할 수 없습니다.`,
    };
  const key = keys[focus];
  const sum = (r: Range) =>
    buildPerformance(r, "day").reduce((n, row) => n + row[key], 0);
  const previous = sum({ start, end }),
    current = sum(range);
  if (!previous)
    return {
      decision: "관망",
      text: `${labels[focus]} 기준 · 비교 기준값이 0이므로 증감률을 산출할 수 없습니다.`,
    };
  const delta = (current / previous - 1) * 100;
  const adverse = focus === "retention" ? delta : -delta;
  const action =
    focus === "growth"
      ? "가입 유입과 전환율"
      : focus === "retention"
        ? "해지 사유와 유지 혜택"
        : "혜택 비용과 마진";
  return {
    decision: adverse >= 10 ? "대응 필요" : "관망",
    text: `${labels[focus]} 기준 · 직전 동일 기간 대비 ${focus === "growth" ? "가입 회선" : focus === "retention" ? "해지량" : "순익"} ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%. ${action}을 우선 점검합니다. 불리한 변화가 10% 이상이면 대응을 검토합니다.`,
  };
}
