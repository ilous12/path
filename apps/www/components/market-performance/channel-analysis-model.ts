import { scopedPerformance } from "./channel-data";
import type { Range } from "./data";
export function scopeAnalysis(range: Range, channels: string[] = []) {
  const rows = scopedPerformance(range, channels);
  const totals = rows.reduce(
    (sum, r) => ({
      customers: sum.customers + r.customers,
      revenue: sum.revenue + r.revenue,
      netProfit: sum.netProfit + r.netProfit,
      cancellations: sum.cancellations + r.cancellations,
    }),
    { customers: 0, revenue: 0, netProfit: 0, cancellations: 0 },
  );
  const mid = Math.floor(rows.length / 2);
  const before = rows.slice(0, mid);
  const after = rows.slice(mid);
  const mean = (items: typeof rows) =>
    items.reduce((s, r) => s + r.customers, 0) / Math.max(1, items.length);
  const growth =
    before.length && mean(before) > 0
      ? (mean(after) / mean(before) - 1) * 100
      : null;
  const margin = totals.revenue
    ? (totals.netProfit / totals.revenue) * 100
    : null;
  return {
    rows,
    totals,
    growth,
    margin,
    reason: !rows.length
      ? "연결된 채널 실적이 없습니다."
      : `선택 기간 가입 ${totals.customers.toLocaleString("ko-KR")}회선 · 순익률 ${margin?.toFixed(1) ?? "—"}% · 기간 전반 대비 후반 일평균 회선 ${growth === null ? "비교 불가" : `${growth > 0 ? "+" : ""}${growth.toFixed(1)}%`}`,
  };
}
export function scopeExperimentProposals(
  range: Range,
  channels: string[] = [],
) {
  const report = scopeAnalysis(range, channels);
  const scope = channels.join(", ") || "전체 채널";
  return [
    {
      title: `${scope} · 현행 유지 비교`,
      reason: `${report.reason}. 변경 없는 기준군을 확보합니다.`,
      prompt: `${scope}의 요금과 혜택은 유지하고, 동일 기간 비교군으로 가입·해지·순익 변화를 관찰해줘. 수요 변화 0%를 기준으로 검토한다.`,
      guard: "기준군과 처리군의 기간·유입 조건을 맞춰 비교",
    },
    {
      title: `${scope} · ${report.growth !== null && report.growth < 0 ? "가입 회복" : "유지율 개선"} 혜택`,
      reason: `${report.growth !== null && report.growth < 0 ? "후반 일평균 가입이 감소했습니다." : "가입 증가가 유지로 이어지는지 확인합니다."} 단기 가입 후 이탈을 점검합니다.`,
      prompt: `${scope}의 번호이동 고객에게 30일 유지 시 포인트 3,000원을 제공하는 정책을 검토해줘. 요금은 유지하고 가입·해지·지급 비용을 비교해줘.`,
      guard: "가입당 획득 비용·30일 유지율·포인트 지급액 확인",
    },
    {
      title: `${scope} · ${report.margin !== null && report.margin < 15 ? "개통 흐름 개선" : "가격 경쟁력 검증"}`,
      reason:
        report.margin !== null && report.margin < 15
          ? "순익률이 15% 미만인 분석 조건으로, 할인보다 개통 이탈 감소를 먼저 검토합니다."
          : "현재 순익과 경쟁 가격을 함께 확인한 뒤 제한된 대상으로 가격 반응을 검증합니다.",
      prompt:
        report.margin !== null && report.margin < 15
          ? `${scope}의 본인확인 절차는 유지하고 개통 안내를 간소화하는 정책을 검토해줘. 요금은 유지하고 완료율과 상담 비용을 비교해줘.`
          : `${scope}의 20GB 요금제 월 요금을 3% 인하하는 정책을 검토해줘. 최소 마진과 예산을 확인하고 가입·순익 변화를 비교해줘.`,
      guard: "순익 악화·예산 초과 시 중단 기준을 현업과 확정",
    },
  ];
}
