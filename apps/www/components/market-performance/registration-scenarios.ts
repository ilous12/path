import type { PolicyAlternative } from "./alternative-model";
import type {
  PolicyRequirements,
  PolicyReviewSnapshot,
} from "./policy-requirements";
export const REVIEW_SCENARIOS = [
  "현행 유지",
  "단기 검증",
  "장기 검증",
] as const;
const compact = (value: string) =>
  value.replace(/\s+/g, " ").trim().slice(0, 90);
export function summarizeRequirements(r: PolicyRequirements) {
  const parts = [
    r.pricePct === null
      ? null
      : `요금 ${r.pricePct > 0 ? "+" : ""}${r.pricePct}%`,
    r.benefits,
    r.points,
    r.freeOffers,
    r.other,
  ].filter((s): s is string => Boolean(s));
  return (
    [...new Set(parts)].map(compact).join(" · ") ||
    "구체적인 변경 수치·혜택은 추가 확인이 필요합니다."
  );
}
export function registrationScenario(
  base: PolicyAlternative,
  index: number,
): PolicyAlternative {
  const requestedDays = base.applyDays ?? base.days;
  if (index === 0)
    return {
      ...base,
      pricePct: 0,
      demandPct: 0,
      cancellationPct: 0,
      variableCostPct: 0,
      dailyCost: 0,
      oneTimeCost: 0,
      requirements: {
        pricePct: 0,
        benefits: "",
        points: "",
        freeOffers: "",
        other: "현행 유지",
      },
    };
  if (index === 1)
    return { ...base, applyDays: Math.max(1, base.analysisContext?.priorities ? Math.min(7, requestedDays) : Math.ceil(requestedDays / 2)) };
  return { ...base };
}
export function reviewSnapshot(
  base: PolicyAlternative,
  index: number,
  summary: string,
): PolicyReviewSnapshot {
  const a = registrationScenario(base, index);
  return {
    choice: index,
    label: REVIEW_SCENARIOS[index],
    summary,
    start: a.start,
    applyDays: a.applyDays ?? a.days,
    days: a.days,
    pricePct: a.pricePct,
    demandPct: a.demandPct,
    cancellationPct: a.cancellationPct ?? 0,
    variableCostPct: a.variableCostPct,
    dailyCost: a.dailyCost,
    oneTimeCost: a.oneTimeCost,
    targetChannels: a.targetChannels ?? [],
  };
}
