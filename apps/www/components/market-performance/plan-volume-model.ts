import { groupFor, type PlanOffer } from "./plan-market-model";
export const volumeTiers = [
  "≤7GB",
  "7~20GB",
  "20~50GB",
  "50~100GB",
  "100GB 초과",
  "매일 추가",
  "무제한",
];
export function volumeTier(p: PlanOffer) {
  return p.unlimitedData
    ? 6
    : p.dailyDataGb
      ? 5
      : p.monthlyDataGb == null
        ? null
        : p.monthlyDataGb <= 7
          ? 0
          : p.monthlyDataGb <= 20
            ? 1
            : p.monthlyDataGb <= 50
              ? 2
              : p.monthlyDataGb <= 100
                ? 3
                : 4;
}
export function planVolume(offers: PlanOffer[], width: number) {
  if (!Number.isFinite(width) || width <= 0)
    throw new Error("Invalid price bin width");
  const cells = new Map<
    string,
    { price: number; tier: number; offers: PlanOffer[] }
  >();
  for (const offer of offers) {
    const tier = volumeTier(offer);
    if (offer.displayedEffectiveKrw == null || tier === null) continue;
    const price = Math.floor(offer.displayedEffectiveKrw / width) * width;
    const key = `${tier}:${price}`;
    const cell = cells.get(key) ?? { price, tier, offers: [] };
    cell.offers.push(offer);
    cells.set(key, cell);
  }
  return [...cells.values()].map((cell) => {
    const segments = new Map<
      string,
      { name: string; color: string; count: number }
    >();
    for (const offer of cell.offers) {
      const g = groupFor(offer);
      const s = segments.get(g.name) ?? {
        name: g.name,
        color: g.color,
        count: 0,
      };
      s.count++;
      segments.set(g.name, s);
    }
    return {
      ...cell,
      count: cell.offers.length,
      segments: [...segments.values()].sort((a, b) =>
        a.name === "AIIR" ? 1 : b.name === "AIIR" ? -1 : b.count - a.count,
      ),
    };
  });
}
