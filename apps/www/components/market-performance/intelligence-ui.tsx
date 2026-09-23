"use client";
import {
  ArrowUpRight,
  CornerDownRight,
  Ellipsis,
  FileDiff,
  Newspaper,
  Plus,
  Sparkles,
  TrendingUpDown,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MeterIndicator,
  MeterLabel,
  MeterRoot,
  MeterTrack,
} from "@/components/ui/meter";
import {
  PreviewCard,
  PreviewCardContent,
  PreviewCardTrigger,
} from "@/components/ui/preview-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { dayShift } from "./alternative-model";
import { MAX_DATE, type MarketEvent, type Range } from "./data";
import { useEventCatalog } from "./event-catalog";
import { useEventVisibility } from "./event-visibility";
import { type AnnualTargets, monthTarget } from "./home-annual-targets";
import { buildHomePerformance, type HomeBusiness } from "./home-performance";
import {
  type BriefLine,
  BUSINESSES,
  briefing,
  businessName,
  eventBusiness,
  type Hypothesis,
  type Pulse,
  pulseOf,
  SIGNAL_LABEL,
  SIGNAL_ORDER,
  type Signal,
  EVENT_KINDS,
  eventKind,
  type TurningPoint,
  turningPoints,
} from "./path-intelligence";
import { PolicyEntryButton } from "./policy-entry";

const won = (n: number) =>
  n >= 1e8
    ? `${(n / 1e8).toFixed(1)}억`
    : `${Math.round(n / 1e4).toLocaleString("ko-KR")}만`;
const signed = (v: number | null, digits = 1) =>
  v === null ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
const md = (date: string) => date.slice(5, 10);
const colorOf = (id: string) => BUSINESSES.find((b) => b.id === id)?.color;
const pivotHref = (business: string, date: string) =>
  `/analysis?${new URLSearchParams({ workspace: business, pivots: date, start: dayShift(date, -21), end: dayShift(date, 14) })}`;
const eventHref = (business: string, e: MarketEvent) => {
  const at = e.startAt.slice(0, 10);
  return `/analysis?${new URLSearchParams({ workspace: business, events: e.id, start: dayShift(at, -14), end: dayShift(at, 14) })}`;
};

const SIGNAL_TONE: Record<Signal, string> = {
  respond: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
  watch:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  hold: "border-border bg-muted text-muted-foreground",
  stable:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};
const SIGNAL_DOT: Record<Signal, string> = {
  respond: "bg-red-500",
  watch: "bg-amber-500",
  hold: "bg-muted-foreground",
  stable: "bg-emerald-500",
};
const STATUS_SIGNAL: Record<TurningPoint["status"], Signal> = {
  "대응 필요": "respond",
  "대응 완료": "stable",
  "성과 확인": "watch",
};

export function SignalBadge({
  signal,
  label,
  className,
}: {
  signal: Signal;
  label?: string;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "h-5 gap-1 px-1.5 text-[11px] shadow-none",
        SIGNAL_TONE[signal],
        className,
      )}
      variant="outline"
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          SIGNAL_DOT[signal],
          signal === "respond" && "animate-pulse",
        )}
      />
      {label ?? SIGNAL_LABEL[signal]}
    </Badge>
  );
}

const EVIDENCE_TONE: Record<BriefLine["kind"], string> = {
  사실: "border-border bg-secondary text-secondary-foreground",
  예측: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  가설: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
};
function EvidenceTag({ kind }: { kind: BriefLine["kind"] }) {
  return (
    <Badge
      className={cn(
        "mt-px h-[18px] shrink-0 px-1 text-[10px] shadow-none",
        EVIDENCE_TONE[kind],
      )}
      variant="outline"
    >
      {kind}
    </Badge>
  );
}

function Delta({
  value,
  digits = 1,
  inverse = false,
}: {
  value: number | null;
  digits?: number;
  /** Higher is worse (e.g. churn). */
  inverse?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-[11px] font-medium tabular-nums",
        value === null || value === 0
          ? "text-muted-foreground"
          : value < 0 !== inverse
            ? "text-red-600 dark:text-red-400"
            : "text-emerald-600 dark:text-emerald-400",
      )}
    >
      {signed(value, digits)}
    </span>
  );
}

/** Compact dashboard panel: one-line header, dense body, fixed rhythm. */
function Panel({
  title,
  icon: Icon,
  iconClassName,
  meta,
  action,
  className,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("min-w-0 gap-2.5 py-3", className)}>
      <div className="flex h-5 min-w-0 items-center gap-1.5 px-4">
        {Icon && (
          <Icon
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground",
              iconClassName,
            )}
          />
        )}
        <h2 className="shrink-0 text-[13px] font-semibold">{title}</h2>
        {meta && (
          <span className="min-w-0 truncate text-[11px] text-muted-foreground">
            {meta}
          </span>
        )}
        {action && (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {action}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 px-4">{children}</div>
    </Card>
  );
}

function BriefPanel({
  title = "AI 브리프",
  lines,
  pulses,
  asOf,
  sources,
  className,
}: {
  title?: string;
  lines: BriefLine[];
  pulses: Pulse[];
  asOf: string;
  sources: number;
  className?: string;
}) {
  const counts = SIGNAL_ORDER.map(
    (s) => [s, pulses.filter((p) => p.signal === s).length] as const,
  ).filter(([, n]) => n > 0);
  return (
    <Panel
      action={counts.map(([s, n]) => (
        <SignalBadge key={s} label={`${SIGNAL_LABEL[s]} ${n}`} signal={s} />
      ))}
      className={cn(
        "bg-linear-to-br from-primary/[0.08] via-card to-card ring-primary/20",
        className,
      )}
      icon={Sparkles}
      iconClassName="text-primary"
      meta={`${md(asOf)} 09:00 · 신호 ${sources}`}
      title={title}
    >
      <ol className="space-y-2">
        {lines.map((line, i) => (
          <li
            className="animate-reveal flex items-start gap-2"
            key={line.text}
            style={{ animationDelay: `${100 + i * 140}ms` }}
          >
            <EvidenceTag kind={line.kind} />
            <p className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug">
              {line.text}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

function MoreButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      aria-label={`${label} 더보기`}
      className="size-6 text-muted-foreground hover:text-foreground"
      disabled={disabled}
      onClick={onClick}
      size="icon-xs"
      title="더보기"
      type="button"
      variant="ghost"
    >
      <Ellipsis className="size-4" />
    </Button>
  );
}

type FeedItem = {
  id: string;
  date: string;
  tag: string;
  tagColor?: string;
  title: string;
  href: string;
  metric?: React.ReactNode;
};

function FeedRow({ item }: { item: FeedItem }) {
  return (
    <li>
      <Link
        className="grid w-full grid-cols-[36px_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 py-[3px] text-[12.5px] leading-[18px] transition-colors hover:bg-accent/60 focus-visible:outline-2 focus-visible:outline-ring"
        href={item.href}
        title={item.title}
      >
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {md(item.date)}
        </span>
        <span className="inline-flex h-[18px] items-center gap-1 rounded border px-1 text-[10px] font-medium text-muted-foreground">
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ background: item.tagColor }}
          />
          {item.tag}
        </span>
        <span className="truncate">{item.title}</span>
        {item.metric ?? <span />}
      </Link>
    </li>
  );
}

/** Latest-first feed: five linked rows inline, the full list in a dialog. */
function FeedPanel({
  title,
  icon,
  items,
  empty,
  limit = 5,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FeedItem[];
  empty: string;
  limit?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Panel
        action={
          <MoreButton
            disabled={!items.length}
            label={title}
            onClick={() => setOpen(true)}
          />
        }
        icon={icon}
        meta={`${items.length}건`}
        title={title}
      >
        {items.length ? (
          <ul className="-mx-1.5">
            {items.slice(0, limit).map((i) => (
              <FeedRow item={i} key={i.id} />
            ))}
          </ul>
        ) : (
          <p className="text-[12px] text-muted-foreground">{empty}</p>
        )}
      </Panel>
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent
          className="max-w-2xl gap-3"
          layout="center"
          showCloseButton
        >
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <DialogDescription className="text-xs">
              최신순 {items.length}건
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[min(62vh,560px)]">
            <ul className="pr-3">
              {items.map((i) => (
                <FeedRow item={i} key={i.id} />
              ))}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

const kindOf = (e: MarketEvent) => EVENT_KINDS[eventKind(e)];
const newsHref = (e: MarketEvent) =>
  `/events/${encodeURIComponent(e.id)}?workspace=home`;

function AddTile({ workspace }: { workspace?: string }) {
  return (
    <PolicyEntryButton
      className="h-full min-h-20 w-full flex-col gap-1 rounded-xl border-dashed px-2 text-primary hover:border-primary/50 hover:bg-primary/5"
      variant="outline"
      workspace={workspace}
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25">
        <Plus aria-hidden className="size-5" />
      </span>
      <span className="text-[13px] font-semibold">판매정책</span>
      <span className="text-[10px] font-normal text-muted-foreground">
        AI 제안 · 직접
      </span>
    </PolicyEntryButton>
  );
}

type MonthProgress = {
  label: string;
  lines: number;
  target: number | null;
  /** Share of the month elapsed, 0–100. */
  pace: number;
};

function MonthMeter({ month }: { month: MonthProgress }) {
  const rate = month.target ? (month.lines / month.target) * 100 : null;
  const ahead = rate !== null && rate >= month.pace;
  return (
    <MeterRoot
      className="space-y-1.5 px-4"
      max={100}
      min={0}
      value={Math.min(100, rate ?? 0)}
    >
      <div className="flex items-baseline gap-1.5">
        <MeterLabel className="text-[11px] font-normal text-muted-foreground">
          {month.label} 가입
        </MeterLabel>
        <span className="text-[15px] font-semibold tabular-nums">
          {month.lines.toLocaleString("ko-KR")}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          / 목표 {month.target?.toLocaleString("ko-KR") ?? "미설정"}
        </span>
        <span
          className={cn(
            "ml-auto text-[12px] font-semibold tabular-nums",
            rate === null
              ? "text-muted-foreground"
              : ahead
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400",
          )}
        >
          {rate === null ? "—" : `${rate.toFixed(0)}%`}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          진도 {month.pace.toFixed(0)}%
        </span>
      </div>
      <MeterTrack className="h-1.5 rounded-full bg-muted">
        <MeterIndicator
          className={cn(
            "rounded-full",
            ahead ? "bg-emerald-500" : "bg-amber-500",
          )}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 w-0.5 bg-foreground/60"
          style={{ left: `${month.pace}%` }}
        />
      </MeterTrack>
    </MeterRoot>
  );
}

function BusinessCard({
  pulse,
  href,
  month,
  wide = false,
}: {
  pulse: Pulse;
  /** 실적 page of the workspace; shown as “…”. */
  href?: string;
  month?: MonthProgress;
  wide?: boolean;
}) {
  const color = colorOf(pulse.business);
  const kpis: [string, string, number | null, boolean?][] = [
    ["가입", pulse.lines7.toLocaleString("ko-KR"), pulse.lineChange],
    ["해지", pulse.cancel7.toLocaleString("ko-KR"), pulse.churnChange, true],
    [
      "순증",
      `${pulse.net7 >= 0 ? "+" : ""}${pulse.net7.toLocaleString("ko-KR")}`,
      pulse.netChange,
    ],
    ["매출", won(pulse.revenue7), pulse.revenueChange],
    ["순익", won(pulse.profit7), pulse.profitChange],
  ];
  return (
    <Card className="min-w-0 gap-2 py-3" data-signal={pulse.signal}>
      <div className="flex h-6 items-center gap-2 px-4">
        <span
          aria-hidden
          className="size-2.5 rounded-full"
          style={{ background: color }}
        />
        <h3 className="text-sm font-semibold">{pulse.name}</h3>
        <SignalBadge signal={pulse.signal} />
        {pulse.signal !== "hold" && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            확신 {pulse.confidence}%
          </span>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          {href && (
            <Button
              aria-label={`${pulse.name} 실적 더보기`}
              className="size-6 text-muted-foreground hover:text-foreground"
              nativeButton={false}
              render={<Link href={href} />}
              size="icon-xs"
              title="실적 더보기"
              variant="ghost"
            >
              <Ellipsis className="size-4" />
            </Button>
          )}
          {!href && (
            <PolicyEntryButton
              className="size-6"
              size="icon-sm"
              variant="ghost"
              workspace={pulse.business}
            />
          )}
        </div>
      </div>
      {month && <MonthMeter month={month} />}
      <dl
        className="grid grid-cols-5 divide-x px-4"
        data-wide={wide || undefined}
      >
        {kpis.map(([label, value, delta, inverse]) => (
          <div className="min-w-0 px-2.5 first:pl-0" key={label}>
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="truncate text-[15px] font-semibold leading-tight tabular-nums">
              {value}
            </dd>
            <Delta inverse={inverse} value={delta} />
          </div>
        ))}
      </dl>
      <div className="flex min-w-0 items-center gap-1.5 border-t px-4 pt-2 text-[12px]">
        <Sparkles aria-hidden className="size-3 shrink-0 text-primary" />
        <span className="truncate text-muted-foreground">{pulse.reason}</span>
        {pulse.competitiveness !== null && (
          <Badge
            className="ml-auto h-5 shrink-0 px-1.5 text-[11px] shadow-none"
            variant="outline"
          >
            경쟁력 {pulse.competitiveness.toFixed(0)}
          </Badge>
        )}
      </div>
    </Card>
  );
}

function useVisibleEvents() {
  const { events: catalog } = useEventCatalog();
  const { hiddenIds } = useEventVisibility();
  return useMemo(
    () => catalog.filter((e) => !hiddenIds.includes(e.id)),
    [catalog, hiddenIds],
  );
}

export function SectionLabel({
  title,
  meta,
}: {
  title: string;
  meta?: string;
}) {
  return (
    <h2 className="flex items-baseline gap-2 px-0.5 pt-1 text-[13px] font-semibold">
      {title}
      {meta && (
        <span className="text-[11px] font-normal text-muted-foreground">
          {meta}
        </span>
      )}
    </h2>
  );
}

const ROW =
  "grid gap-3 md:grid-cols-2 2xl:h-[180px] [&>*]:min-h-44 2xl:[&>*]:min-h-0";

/** HOME 사업 현황: 브리핑 | 시장 소식 | 변곡점 | 변경 판매조건 / 실적 요약. */
export function HomeIntelligence({
  asOf,
  targets,
}: {
  asOf: string;
  targets: AnnualTargets;
}) {
  const events = useVisibleEvents();
  const end = asOf > MAX_DATE ? MAX_DATE : asOf;
  const pulses = useMemo(
    () => BUSINESSES.map((b) => pulseOf(b.id, events, end)),
    [events, end],
  );
  const months = useMemo(() => {
    const first = `${end.slice(0, 8)}01`;
    const day = Number(end.slice(8, 10));
    const length = new Date(
      Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)), 0),
    ).getUTCDate();
    return Object.fromEntries(
      BUSINESSES.map((b) => {
        const month: MonthProgress = {
          label: `${Number(end.slice(5, 7))}월`,
          lines: buildHomePerformance({ start: first, end }, b.id).reduce(
            (sum, r) => sum + r.customers,
            0,
          ),
          target: monthTarget(targets, end, b.id),
          pace: (day / length) * 100,
        };
        return [b.id, month];
      }),
    ) as Record<HomeBusiness, MonthProgress>;
  }, [end, targets]);
  const points = useMemo(
    () =>
      BUSINESSES.flatMap((b) =>
        turningPoints(b.id, events, dayShift(end, -180), end),
      ).sort((a, b) => b.date.localeCompare(a.date)),
    [events, end],
  );
  const recent = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.startAt.slice(0, 10) <= end &&
            e.startAt.slice(0, 10) >= dayShift(end, -90),
        )
        .sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [events, end],
  );
  const market = recent.filter((e) => !eventBusiness(e));
  const changes = recent.filter((e) => eventBusiness(e));
  const eventItems = (list: MarketEvent[]): FeedItem[] =>
    list.slice(0, 60).map((e) => {
      const kind = kindOf(e);
      return {
        id: e.id,
        date: e.startAt.slice(0, 10),
        tag: kind.label,
        tagColor: kind.color,
        title: e.title,
        href: newsHref(e),
      };
    });
  const pointItems: FeedItem[] = points.map((t) => ({
    id: t.id,
    date: t.date,
    tag: businessName(t.business),
    tagColor: colorOf(t.business),
    title: t.hypotheses[0]?.relation ?? "원인 미확인",
    href: pivotHref(t.business, t.date),
    metric: <Delta digits={0} value={t.pct} />,
  }));
  return (
    <div className="space-y-3">
      <SectionLabel title="시장 요약" />
      <div className={cn(ROW, "md:grid-cols-3 2xl:h-auto")}>
        <FeedPanel
          empty="최근 시장 소식 없음"
          icon={Newspaper}
          items={eventItems(market)}
          title="시장 소식"
        />
        <FeedPanel
          empty="변곡점 없음"
          icon={TrendingUpDown}
          items={pointItems}
          title="변곡점"
        />
        <FeedPanel
          empty="변경된 판매조건 없음"
          icon={FileDiff}
          items={eventItems(changes)}
          title="변경 판매조건"
        />
      </div>
      <SectionLabel
        meta="이번 달 목표 · 최근 7일 전주 대비"
        title="실적 요약"
      />
      <div className="grid gap-3 lg:grid-cols-3">
        {pulses.map((p) => (
          <BusinessCard
            href={`/?workspace=${p.business}&view=kpi`}
            key={p.business}
            month={months[p.business]}
            pulse={p}
          />
        ))}
      </div>
    </div>
  );
}

function HypothesisRow({ h, business }: { h: Hypothesis; business: string }) {
  return (
    <li className="grid grid-cols-[34px_1fr] items-start gap-2">
      <Badge
        className={cn(
          "mt-px h-[18px] w-full justify-center px-0 text-[10px] shadow-none",
          h.strength === "높음"
            ? EVIDENCE_TONE.가설
            : "border-border text-muted-foreground",
        )}
        variant="outline"
      >
        {h.strength}
      </Badge>
      <div className="min-w-0">
        <PreviewCard>
          <PreviewCardTrigger
            render={
              <Link
                className="block truncate text-[13px] font-medium leading-snug hover:underline"
                href={eventHref(business, h.event)}
              />
            }
          >
            {h.event.title}
          </PreviewCardTrigger>
          <PreviewCardContent
            align="start"
            className="w-80 space-y-2 text-xs"
            side="top"
          >
            <p className="font-semibold">{h.event.title}</p>
            <p className="text-muted-foreground">{h.event.summary}</p>
            <p className="rounded-md bg-muted px-2 py-1.5">
              {h.event.before} →{" "}
              <span className="font-medium">{h.event.after}</span>
            </p>
            {h.event.sourceUrl && (
              <a
                className="inline-flex items-center gap-1 text-primary hover:underline"
                href={h.event.sourceUrl}
                rel="noreferrer"
                target="_blank"
              >
                {h.event.sourceName ?? "출처"}
                <ArrowUpRight aria-hidden className="size-3" />
              </a>
            )}
          </PreviewCardContent>
        </PreviewCard>
        <p className="text-[11px] text-muted-foreground">
          {h.relation} · {md(h.event.startAt)}
        </p>
      </div>
    </li>
  );
}

function EventRows({
  events,
  business,
  label,
  empty,
}: {
  events: MarketEvent[];
  business: string;
  label: (e: MarketEvent) => string;
  empty: string;
}) {
  if (!events.length)
    return <p className="text-[12px] text-muted-foreground">{empty}</p>;
  return (
    <ul className="-mx-1.5 space-y-0.5">
      {events.map((e) => (
        <li key={e.id}>
          <Link
            className="grid grid-cols-[52px_1fr] items-center gap-2 rounded-md px-1.5 py-1 text-[12px] hover:bg-accent/60"
            href={eventHref(business, e)}
          >
            <span className="truncate text-muted-foreground">{label(e)}</span>
            <span className="truncate">{e.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Workspace: AI 브리프 | 변곡점 판단 | 대응·결과 | + / KPI strip. */
export function WorkspaceIntelligence({
  business,
  range,
}: {
  business: HomeBusiness;
  range: Range;
}) {
  const events = useVisibleEvents();
  const asOf = range.end > MAX_DATE ? MAX_DATE : range.end;
  const pulse = useMemo(
    () => pulseOf(business, events, asOf),
    [business, events, asOf],
  );
  const lines = useMemo(() => {
    const all = briefing([pulse], events, asOf);
    const near = pulse.rivalMoves[0];
    return [
      all[0],
      ...all.slice(2),
      ...(near
        ? [
            {
              kind: "사실" as const,
              text: `최근접 경쟁: ‘${near.title}’ (${md(near.startAt)})`,
            },
          ]
        : []),
    ];
  }, [pulse, events, asOf]);
  const points = useMemo(
    () => turningPoints(business, events, dayShift(asOf, -90), asOf),
    [business, events, asOf],
  );
  const ownMoves = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.operator.toLowerCase() === business &&
            e.startAt.slice(0, 10) <= asOf,
        )
        .sort((a, b) => b.startAt.localeCompare(a.startAt))
        .slice(0, 3),
    [events, business, asOf],
  );
  const focus =
    points.find((p) => p.date === pulse.pivot?.date) ??
    points.find((p) => p.status === "대응 필요") ??
    points[0];
  return (
    <div className="space-y-3">
      <div
        className={cn(
          ROW,
          "2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1.1fr)_104px]",
        )}
      >
        <BriefPanel
          asOf={asOf}
          lines={lines}
          pulses={[pulse]}
          sources={pulse.rivalMoves.length + points.length}
          title={`${businessName(business)} 브리프`}
        />
        <Panel
          action={
            focus && (
              <Button
                className="h-6 px-2 text-[11px]"
                nativeButton={false}
                render={<Link href={pivotHref(business, focus.date)} />}
                size="sm"
                variant="ghost"
              >
                상세 <ArrowUpRight />
              </Button>
            )
          }
          icon={TrendingUpDown}
          meta={
            focus ? (
              <span className="inline-flex items-center gap-1.5">
                {md(focus.date)} 회선 <Delta digits={0} value={focus.pct} />
                <SignalBadge
                  label={focus.status}
                  signal={STATUS_SIGNAL[focus.status]}
                />
              </span>
            ) : (
              "변곡 없음 · 경쟁 감시"
            )
          }
          title="변곡점 판단"
        >
          {focus ? (
            <ol className="space-y-2">
              {focus.hypotheses.map((h) => (
                <HypothesisRow business={business} h={h} key={h.event.id} />
              ))}
              {!focus.hypotheses.length && (
                <li className="text-[12px] text-muted-foreground">
                  연결 가능한 판매정책 변화 없음 · 판단 보류
                </li>
              )}
            </ol>
          ) : (
            <EventRows
              business={business}
              empty="경쟁 변화 없음 · 현행 유지"
              events={pulse.rivalMoves.slice(0, 3)}
              label={(e) => e.operator}
            />
          )}
        </Panel>
        <Panel icon={Workflow} meta="변곡 후 7일" title="대응·결과">
          <div className="space-y-2.5 text-[12px]">
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">
                {focus ? "우리 대응" : "최근 자사 판매정책"}
              </p>
              {focus?.response ? (
                <p className="flex items-start gap-1">
                  <CornerDownRight className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {md(focus.response.startAt)} {focus.response.title}
                  </span>
                  <Delta digits={0} value={focus.outcomePct} />
                </p>
              ) : focus ? (
                <p className="text-muted-foreground">대응 없음</p>
              ) : (
                <EventRows
                  business={business}
                  empty="최근 자사 판매정책 없음"
                  events={ownMoves}
                  label={(e) => md(e.startAt)}
                />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">유사 사례</p>
              {pulse.precedent ? (
                <p className="line-clamp-2 leading-snug">
                  {pulse.precedent.date} 회선{" "}
                  <Delta digits={0} value={pulse.precedent.pct} /> →{" "}
                  {pulse.precedent.response ?? "관망"} → 2주 후{" "}
                  <Delta digits={0} value={pulse.precedent.recoveryPct} />
                </p>
              ) : (
                <p className="text-muted-foreground">유사 사례 없음</p>
              )}
            </div>
          </div>
        </Panel>
        <AddTile workspace={business} />
      </div>
      <BusinessCard pulse={pulse} wide />
    </div>
  );
}
