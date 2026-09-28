"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { dayShift } from "@/components/market-performance/alternative-model";
import type { MarketEvent, Range } from "@/components/market-performance/data";
import {
  type AnnualTargets,
  dailyTarget,
} from "@/components/market-performance/home-annual-targets";
import { Button } from "@/components/ui/button";
import { type Campaign, forecast, STATUS_LABEL } from "./campaigns";
import { isOwn, kindLabel } from "./market";
import { AS_OF, BIZ, type Biz, fmt, monthOutlook, perf } from "./model";
import { Tag } from "./ui";

/** Daily rows for TrendChart: actuals per business, summed target, and (for current month) forecast + band. */
export function trendRows(
  list: Biz[],
  range: Range,
  targets: AnnualTargets,
  withForecast: boolean,
) {
  const rows: Record<string, unknown>[] = [];
  const byBiz = Object.fromEntries(
    list.map((b) => [b, new Map(perf(b, range).map((r) => [r.key, r.lines]))]),
  );
  for (let d = range.start; d <= range.end && d <= AS_OF; d = dayShift(d, 1))
    rows.push({
      key: d,
      ...Object.fromEntries(list.map((b) => [b, byBiz[b].get(d) ?? null])),
      target: list.reduce((s, b) => s + (dailyTarget(targets, d, b) ?? 0), 0),
    });
  if (withForecast) {
    const m = monthOutlook(list, targets);
    const last = rows.at(-1);
    if (last) {
      last.forecast = m.rows.find((r) => r.key === AS_OF)?.actual ?? null;
      last.band =
        last.forecast !== null ? [last.forecast, last.forecast] : null;
    }
    for (const r of m.rows.filter((x) => x.key > AS_OF))
      rows.push({
        key: r.key,
        target: r.target,
        forecast: r.forecast,
        band: r.band,
      });
  }
  return rows;
}

export function EventList({
  events,
  ws,
  limit = 5,
}: {
  events: MarketEvent[];
  ws: Biz | "home";
  limit?: number;
}) {
  if (!events.length)
    return (
      <p className="py-3 text-[12px] text-muted-foreground">
        기간 내 변화 없음
      </p>
    );
  return (
    <ul className="-mx-1.5">
      {events.slice(0, limit).map((e) => {
        const k = kindLabel(e);
        return (
          <li key={e.id}>
            <Link
              className="grid grid-cols-[38px_auto_minmax(0,1fr)] items-center gap-2 rounded-md px-1.5 py-1 text-[12.5px] hover:bg-accent/50"
              href={`/events/${encodeURIComponent(e.id)}?workspace=${ws}`}
              title={e.title}
            >
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {fmt.md(e.startAt)}
              </span>
              <Tag
                className={
                  isOwn(e) ? "border-primary/30 text-foreground" : undefined
                }
                color={k.color}
              >
                {isOwn(e) ? `${k.label} 정책` : k.label}
              </Tag>
              <span className="truncate">{e.title}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function CampaignStrip({
  campaigns,
  ws,
}: {
  campaigns: Campaign[];
  ws: Biz;
}) {
  const mine = campaigns.filter((c) => c.workspace === ws);
  const live = mine.filter(
    (c) => c.status === "running" || c.status === "scheduled",
  );
  const sums = live.map((c) => ({ c, s: forecast(ws, c.params).summary }));
  const counts = (["running", "scheduled", "draft", "ended"] as const).map(
    (s) => [s, mine.filter((c) => c.status === s).length] as const,
  );
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {counts.map(([s, n]) => (
          <Tag
            className={
              s === "running" && n
                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : undefined
            }
            key={s}
          >
            {STATUS_LABEL[s]} {n}
          </Tag>
        ))}
      </div>
      <ul className="space-y-1.5">
        {sums.slice(0, 3).map(({ c, s }) => (
          <li className="flex items-center gap-2 text-[12.5px]" key={c.id}>
            <span
              className={
                c.status === "running"
                  ? "size-1.5 animate-pulse rounded-full bg-emerald-500"
                  : "size-1.5 rounded-full bg-sky-500"
              }
            />
            <Link
              className="min-w-0 flex-1 truncate hover:underline"
              href={`/?workspace=${ws}&view=campaigns&step=analyze&id=${c.id}`}
            >
              {c.name}
            </Link>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {fmt.md(c.params.start)}~{fmt.md(c.params.end)}
            </span>
            <span className="text-[12px] font-medium text-emerald-600 tabular-nums dark:text-emerald-400">
              +{fmt.n(s.net)}
            </span>
          </li>
        ))}
        {!sums.length && (
          <li className="text-[12px] text-muted-foreground">
            진행·예약 캠페인 없음
          </li>
        )}
      </ul>
    </div>
  );
}

export function WorkspaceLink({
  ws,
  label = "상세 보기",
}: {
  ws: Biz;
  label?: string;
}) {
  return (
    <Button
      className="h-7 gap-1 px-2 text-xs"
      nativeButton={false}
      render={<Link href={`/?workspace=${ws}`} />}
      size="sm"
      variant="ghost"
    >
      {label} <ArrowUpRight className="size-3.5" />
    </Button>
  );
}

export const ownEvents = (events: MarketEvent[]) => events.filter(isOwn);
export const marketEvents = (events: MarketEvent[]) =>
  events.filter((e) => !isOwn(e));
export const bizLabel = (b: Biz) => `${BIZ[b].name} · ${BIZ[b].full}`;
