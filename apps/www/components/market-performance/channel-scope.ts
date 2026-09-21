import { scopedPerformance } from "./channel-data";
import { bucketKey, grainFor, type Range, type Grain } from "./data";
/** Explicit empty targets mean all channels; legacy labels only match named targets. */
export function appliesToChannel(
  item: { targetChannels?: string[]; channel?: string },
  channel: string,
) {
  if (item.targetChannels)
    return !item.targetChannels.length || item.targetChannels.includes(channel);
  if (!item.channel || ["전체", "전체 채널", "ALL"].includes(item.channel))
    return true;
  return item.channel
    .split(/[,·]/)
    .map((s) => s.trim().toUpperCase())
    .includes(channel.toUpperCase());
}
export function channelPerformance(
  range: Range,
  channel: string,
  grain: Grain = grainFor(range),
) {
  const map = new Map<string, ReturnType<typeof scopedPerformance>[number]>();
  for (const r of scopedPerformance(range, [channel])) {
    const key = bucketKey(r.key, grain);
    const row = map.get(key) ?? {
      key,
      customers: 0,
      cancellations: 0,
      revenue: 0,
      expenses: 0,
      netProfit: 0,
      profitMargin: 0,
      days: 0,
    };
    for (const m of [
      "customers",
      "cancellations",
      "revenue",
      "expenses",
      "netProfit",
      "days",
    ] as const)
      row[m] += r[m];
    row.profitMargin = row.revenue ? (row.netProfit / row.revenue) * 100 : 0;
    map.set(key, row);
  }
  return [...map.values()];
}
