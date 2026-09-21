import { buildPerformance, type Range } from "./data";

export const CHANNELS = [
  { id: "APP", weight: 32, newShare: 0.3 },
  { id: "WEB", weight: 22, newShare: 0.31 },
  { id: "TOSS", weight: 15, newShare: 0.25 },
  { id: "KAKAOPAY", weight: 12, newShare: 0.26 },
  { id: "MOYO", weight: 10, newShare: 0.23 },
  { id: "제휴몰", weight: 5, newShare: 0.28 },
  { id: "기타", weight: 4, newShare: 0.39 },
] as const;
// Largest-remainder allocation preserves each daily source total exactly.
function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const values = weights.map((weight) => (total * weight) / sum);
  const result = values.map(Math.floor);
  const order = values
    .map((value, index) => ({ index, fraction: value - result[index] }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (
    let i = 0, rest = total - result.reduce((a, b) => a + b, 0);
    i < rest;
    i++
  )
    result[order[i].index]++;
  return result;
}
export function buildChannelDaily(range: Range) {
  return buildPerformance(range, "day").flatMap((day) => {
    const t = Date.parse(`${day.key}T00:00:00Z`) / 86400000;
    const weights = CHANNELS.map(
      (c, i) =>
        c.weight *
        (1 + Math.sin(t * 0.17 + i) * 0.12) *
        (c.id === "MOYO" && day.key >= "2026-09-12" ? 1.35 : 1),
    );
    const lines = allocate(day.customers, weights),
      revenue = allocate(day.revenue, weights),
      expenses = allocate(day.expenses, weights),
      cancellations = allocate(day.cancellations, weights);
    return CHANNELS.map((channel, i) => {
      const newLines = Math.round(lines[i] * channel.newShare);
      return {
        date: day.key,
        channel: channel.id,
        lines: lines[i],
        newLines,
        transfers: lines[i] - newLines,
        revenue: revenue[i],
        expenses: expenses[i],
        cancellations: cancellations[i],
        netProfit: revenue[i] - expenses[i],
      };
    });
  });
}
export function buildChannels(range: Range) {
  const daily = buildChannelDaily(range);
  return CHANNELS.map((channel) => {
    const rows = daily.filter((row) => row.channel === channel.id);
    return {
      name: channel.id,
      total: rows.reduce((s, r) => s + r.lines, 0),
      newLines: rows.reduce((s, r) => s + r.newLines, 0),
      transfers: rows.reduce((s, r) => s + r.transfers, 0),
      revenue: rows.reduce((s, r) => s + r.revenue, 0),
      daily: rows,
    };
  }).sort((a, b) => b.total - a.total);
}

/** Empty/omitted targets mean the complete workspace; unknown channels have no data. */
export function scopedPerformance(range: Range, targetChannels?: string[]) {
 if (!targetChannels?.length) return buildPerformance(range,"day");
 const selected=buildChannelDaily(range).filter(row=>targetChannels.includes(row.channel));
 const byDate=new Map<string,ReturnType<typeof buildPerformance>[number]>();
 for(const r of selected){
  const row=byDate.get(r.date)??{key:r.date,customers:0,cancellations:0,revenue:0,expenses:0,netProfit:0,profitMargin:0,days:1};
  row.customers+=r.lines;row.cancellations+=r.cancellations;row.revenue+=r.revenue;row.expenses+=r.expenses;row.netProfit+=r.netProfit;
  row.profitMargin=row.revenue?row.netProfit/row.revenue*100:0;byDate.set(r.date,row);
 }
 return [...byDate.values()];
}

export function hasChannelData(targetChannels?:string[]) {return !targetChannels?.length || targetChannels.some(c=>CHANNELS.some(known=>known.id===c));}
