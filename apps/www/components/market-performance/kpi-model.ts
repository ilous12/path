import { buildChannelDaily } from "./channel-data";
import { type Range } from "./data";
export function buildKpi(
  range: Range,
  openingBase: number | null,
  contributionPct: number,
) {
  const dates = new Map<
    string,
    {
      date: string;
      newLines: number;
      transfers: number;
      cancellations: number;
      revenue: number;
      netProfit: number;
    }
  >();
  for (const r of buildChannelDaily(range)) {
    const d = dates.get(r.date) ?? {
      date: r.date,
      newLines: 0,
      transfers: 0,
      cancellations: 0,
      revenue: 0,
      netProfit: 0,
    };
    d.newLines += r.newLines;
    d.transfers += r.transfers;
    d.cancellations += r.cancellations;
    d.revenue += r.revenue;
    d.netProfit += r.netProfit;
    dates.set(r.date, d);
  }
  let base = openingBase;
  let exposure = 0;
  let valid = openingBase !== null && openingBase > 0;
  const rows = [...dates.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => {
      const end =
        base === null
          ? null
          : base + r.newLines + r.transfers - r.cancellations;
      const average = base === null || end === null ? null : (base + end) / 2;
      if (
        average !== null &&
        (average <= 0 || r.cancellations > average || end! < 0)
      )
        valid = false;
      const churn =
        average !== null && average > 0 && r.cancellations <= average
          ? (r.cancellations / average) * 100
          : null;
      if (average !== null) exposure += average;
      base = end;
      return {
        ...r,
        acquisitions: r.newLines + r.transfers,
        netAdds: r.newLines + r.transfers - r.cancellations,
        churn,
      };
    });
  const total = rows.reduce(
    (a, r) => ({
      newLines: a.newLines + r.newLines,
      transfers: a.transfers + r.transfers,
      cancellations: a.cancellations + r.cancellations,
      revenue: a.revenue + r.revenue,
      netProfit: a.netProfit + r.netProfit,
    }),
    { newLines: 0, transfers: 0, cancellations: 0, revenue: 0, netProfit: 0 },
  );
  const dailyRate =
    valid && exposure > 0 ? total.cancellations / exposure : null;
  const monthlyChurn =
    dailyRate === null ? null : (1 - Math.pow(1 - dailyRate, 30)) * 100;
  const arpu = valid && exposure > 0 ? (total.revenue / exposure) * 30 : null;
  const ltv =
    arpu !== null && monthlyChurn !== null && monthlyChurn > 0
      ? (arpu * (contributionPct / 100)) / (monthlyChurn / 100)
      : null;
  return {
    rows: rows.map((r) => ({ ...r, churn: valid ? r.churn : null })),
    total,
    acquisitions: total.newLines + total.transfers,
    netAdds: total.newLines + total.transfers - total.cancellations,
    margin: total.revenue ? (total.netProfit / total.revenue) * 100 : null,
    monthlyChurn,
    arpu,
    ltv,
    closingBase: valid ? base : null,
    valid,
  };
}
