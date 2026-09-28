import catalog from "./fixtures/plan-catalog.json";
export type PlanOffer = (typeof catalog.offers)[number];
export const isAiir = (p: { sourceId: string }) => p.sourceId.startsWith("aiir-");
export const planDay = (value: string) =>
  new Date(Date.parse(value) + 9 * 3600000).toISOString().slice(0, 10);
export function planChanges(history: typeof catalog.history) {
  const previous = new Map<string, (typeof history)[number]>();
  return [...history]
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
    .map((h) => {
      const prev = previous.get(h.offerId);
      previous.set(h.offerId, h);
      return {
        ...h,
        day: planDay(h.observedAt),
        kind: !prev
          ? "first"
          : prev.effectiveKrw != null && h.effectiveKrw != null && prev.effectiveKrw !== h.effectiveKrw
            ? "price"
            : "unchanged",
        before: prev?.effectiveKrw ?? null,
      };
    });
}
export const changes = planChanges(catalog.history);
export const lastChanged = new Map(
  changes
    .filter((h) => h.kind === "price")
    .map((h) => [h.offerId, h.observedAt]),
);
export const operatorName = (p: PlanOffer) =>
  isAiir(p) ? "AIIR" : (p.operator ?? "사업자 미확인");
const colors = [
  "var(--color-blue-500)",
  "var(--color-violet-500)",
  "var(--color-emerald-500)",
  "var(--color-orange-500)",
  "var(--color-pink-500)",
  "var(--color-cyan-500)",
  "var(--color-lime-600)",
  "var(--color-indigo-400)",
];
const count = new Map<string, number>();
for (const p of catalog.offers)
  if (!isAiir(p))
    count.set(operatorName(p), (count.get(operatorName(p)) ?? 0) + 1);
export const operatorGroups = [
  {
    name: "AIIR",
    count: catalog.offers.filter(isAiir).length,
    color: "var(--color-red-500)",
  },
  ...[...count]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([name, count], i) => ({ name, count, color: colors[i] })),
  {
    name: "기타 사업자",
    count: [...count]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(8)
      .reduce((a, b) => a + b[1], 0),
    color: "var(--muted-foreground)",
  },
];
export const groupFor = (p: PlanOffer) =>
  operatorGroups.find((g) => g.name === operatorName(p)) ??
  operatorGroups[operatorGroups.length - 1];
