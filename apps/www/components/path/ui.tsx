"use client";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  RotateCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItemContent,
  SelectTriggerGroup,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Insight } from "./insights";
import { AS_OF, BIZ, type Biz, fmt } from "./model";
import { PERIODS, type Period, usePeriod } from "./state";

/* ───────────── Layout ───────────── */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-[13px] text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

export function PeriodPicker({ fallback }: { fallback?: Period }) {
  const { period, range, setPeriod } = usePeriod(fallback);
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[11px] text-muted-foreground tabular-nums lg:inline">
        {fmt.md(range.start)} – {fmt.md(range.end)} · 기준 {fmt.md(AS_OF)}
      </span>
      <ToggleGroup
        aria-label="조회 기간"
        onValueChange={(v) => v[0] && setPeriod(v[0] as Period)}
        size="sm"
        value={[period]}
        variant="outline"
      >
        {PERIODS.map((p) => (
          <ToggleGroupItem className="px-2.5 text-xs" key={p.id} value={p.id}>
            {p.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

export function Section({
  title,
  meta,
  actions,
  className,
  bodyClassName,
  children,
  id,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <Card className={cn("min-w-0 gap-0 py-0", className)} id={id}>
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {meta && (
          <span className="text-[11px] text-muted-foreground">{meta}</span>
        )}
        {actions && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {actions}
          </div>
        )}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function BizDot({ biz, className }: { biz: Biz; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 rounded-full", className)}
      style={{ background: BIZ[biz].color }}
    />
  );
}

export function Delta({
  value,
  inverse,
  digits = 1,
  className,
}: {
  value: number | null;
  inverse?: boolean;
  digits?: number;
  className?: string;
}) {
  const good = value === null || value === 0 ? null : value > 0 !== !!inverse;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        good === null
          ? "text-muted-foreground"
          : good
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-rose-600 dark:text-rose-400",
        className,
      )}
    >
      {value !== null &&
        value !== 0 &&
        (value > 0 ? (
          <ArrowUp className="size-3" />
        ) : (
          <ArrowDown className="size-3" />
        ))}
      {fmt
        .pct(value === null ? null : Math.abs(value), digits)
        .replace("+", "")}
    </span>
  );
}

/** KPI tile with optional target progress and sparkline slot. */
export function Kpi({
  label,
  value,
  unit,
  delta,
  inverse,
  target,
  rate,
  pace,
  spark,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: number | null;
  inverse?: boolean;
  target?: string;
  rate?: number | null;
  pace?: number;
  spark?: React.ReactNode;
  accent?: string;
}) {
  const ahead =
    rate !== undefined && rate !== null && pace !== undefined
      ? rate >= pace
      : undefined;
  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border bg-card p-3.5">
      {accent && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-0.5"
          style={{ background: accent }}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        {delta !== undefined && <Delta inverse={inverse} value={delta} />}
      </div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="truncate text-[22px] font-semibold leading-none tracking-tight tabular-nums">
          {value}
          {unit && (
            <span className="ml-0.5 text-xs font-normal text-muted-foreground">
              {unit}
            </span>
          )}
        </p>
        {spark && <div className="h-8 w-20 shrink-0">{spark}</div>}
      </div>
      {rate !== undefined && (
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums">
            <span>{target}</span>
            <span
              className={cn(
                "font-semibold",
                ahead === undefined
                  ? ""
                  : ahead
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400",
              )}
            >
              {fmt.rate(rate)}
            </span>
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full",
                ahead === false ? "bg-amber-500" : "bg-emerald-500",
              )}
              style={{ width: `${Math.min(100, rate ?? 0)}%` }}
            />
            {pace !== undefined && (
              <span
                aria-hidden
                className="absolute inset-y-0 w-0.5 bg-foreground/60"
                style={{ left: `${Math.min(100, pace)}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── AI Insight ───────────── */

const TONE = {
  up: {
    icon: TrendingUp,
    className: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  },
  down: {
    icon: TrendingDown,
    className: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
  },
  warn: {
    icon: TriangleAlert,
    className: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
  idea: {
    icon: Lightbulb,
    className: "text-sky-600 dark:text-sky-400 bg-sky-500/10",
  },
};

export function InsightPanel({
  items,
  scope,
  className,
  compact,
}: {
  items: Insight[];
  scope: string[];
  className?: string;
  compact?: boolean;
}) {
  const signature = useMemo(
    () => JSON.stringify([scope, items.map((i) => i.title)]),
    [scope, items],
  );
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run the reveal when scope, results, or the user asks.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, [signature, run]);
  return (
    <Card
      className={cn(
        "relative min-w-0 gap-0 overflow-hidden py-0 ring-primary/25",
        "bg-[radial-gradient(120%_80%_at_100%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_60%)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary/12 text-primary ring-1 ring-primary/25">
          <Sparkles className="size-3.5" />
        </span>
        <h2 className="text-[13px] font-semibold">AI Insight</h2>
        <Button
          aria-label="다시 분석"
          className="ml-auto size-7"
          onClick={() => setRun((v) => v + 1)}
          size="icon-sm"
          variant="ghost"
        >
          <RotateCw className={cn("size-3.5", loading && "animate-spin")} />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1 px-4 pt-3">
        {scope.map((s) => (
          <Badge
            className="h-5 border-primary/20 bg-primary/5 px-1.5 text-[10px] font-medium text-primary shadow-none"
            key={s}
            variant="outline"
          >
            {s}
          </Badge>
        ))}
      </div>
      <div className={cn("space-y-3 p-4", compact && "space-y-2.5")}>
        {loading
          ? Array.from(
              { length: Math.max(2, Math.min(items.length, 4)) },
              (_, i) => (
                <div className="flex gap-3" key={i}>
                  <Skeleton className="size-7 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ),
            )
          : items.map((it, i) => {
              const tone = TONE[it.tone];
              return (
                <article
                  className="animate-reveal flex gap-3"
                  key={it.title}
                  style={{ animationDelay: `${i * 110}ms` }}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-lg",
                      tone.className,
                    )}
                  >
                    <tone.icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="text-[13px] font-semibold leading-snug">
                      {it.title}
                    </h3>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">
                      {it.body}
                    </p>
                    {!!it.evidence?.length && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {it.evidence.map((e) =>
                          e.href ? (
                            <Link
                              className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                              href={e.href}
                              key={e.label}
                            >
                              {e.label} ↗
                            </Link>
                          ) : (
                            <span
                              className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                              key={e.label}
                            >
                              {e.label}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
        {!loading && !items.length && (
          <p className="text-[12px] text-muted-foreground">
            조건에 맞는 인사이트가 없습니다.
          </p>
        )}
      </div>
    </Card>
  );
}

/* ───────────── Form helpers ───────────── */

export function PSelect({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <Select
      items={options}
      onValueChange={(v) => onChange(String(v))}
      value={value}
    >
      <SelectTriggerGroup
        aria-label={label}
        className={cn("h-8 min-w-32 bg-background text-xs", className)}
        size="sm"
      />
      <SelectContent alignItemWithTrigger>
        {options.map((o) => (
          <SelectItemContent key={o.value} value={o.value}>
            {o.label}
          </SelectItemContent>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ───────────── Data table ───────────── */

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  sort?: (row: T) => number | string;
  align?: "right" | "center";
  className?: string;
};
export type Filter<T> = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  test: (row: T, value: string) => boolean;
};

/** Search, filter, sort and page a list; returned state feeds both the table and AI Insight. */
export function useTable<T>(
  rows: T[],
  {
    search,
    filters = [],
    pageSize = 10,
    initialSort,
  }: {
    search?: (r: T) => string;
    filters?: Filter<T>[];
    pageSize?: number;
    initialSort?: { key: string; dir: 1 | -1 };
  },
  columns: Column<T>[],
) {
  const [query, setQuery] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter(
      (r) =>
        (!q || (search?.(r) ?? "").toLowerCase().includes(q)) &&
        filters.every(
          (f) =>
            !values[f.key] ||
            values[f.key] === "all" ||
            f.test(r, values[f.key]),
        ),
    );
    const col = sort && columns.find((c) => c.key === sort.key);
    if (sort && col?.sort) {
      const get = col.sort;
      out = [...out].sort((a, b) => {
        const x = get(a);
        const y = get(b);
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      });
    }
    return out;
  }, [rows, query, values, sort, columns, filters, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  return {
    query,
    setQuery: (v: string) => {
      setQuery(v);
      setPage(0);
    },
    values,
    setValue: (k: string, v: string) => {
      setValues((s) => ({ ...s, [k]: v }));
      setPage(0);
    },
    sort,
    toggleSort: (key: string) =>
      setSort((s) =>
        s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 },
      ),
    filtered,
    pageRows: filtered.slice(current * pageSize, current * pageSize + pageSize),
    page: current,
    pages,
    setPage,
    filters,
    columns,
    hasSearch: !!search,
  };
}

export function DataTable<T>({
  table,
  rowKey,
  searchLabel = "검색",
  toolbar,
  onRow,
  dense,
}: {
  table: ReturnType<typeof useTable<T>>;
  rowKey: (row: T) => string;
  searchLabel?: string;
  toolbar?: React.ReactNode;
  onRow?: (row: T) => void;
  dense?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {table.hasSearch && (
          <div className="relative min-w-52 flex-1">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={searchLabel}
              className="h-8 pl-8 text-xs"
              onChange={(e) => table.setQuery(e.target.value)}
              placeholder={searchLabel}
              value={table.query}
            />
          </div>
        )}
        {table.filters.map((f) => (
          <PSelect
            key={f.key}
            label={f.label}
            onChange={(v) => table.setValue(f.key, v)}
            options={[{ value: "all", label: `${f.label} 전체` }, ...f.options]}
            value={table.values[f.key] ?? "all"}
          />
        ))}
        {toolbar}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-left text-[12.5px]">
          <thead className="bg-muted/40 text-[11px] text-muted-foreground">
            <tr>
              {table.columns.map((c) => (
                <th
                  className={cn(
                    "px-3 py-2 font-medium whitespace-nowrap",
                    c.align === "right" && "text-right",
                    c.align === "center" && "text-center",
                    c.className,
                  )}
                  key={c.key}
                >
                  {c.sort ? (
                    <button
                      className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground",
                        c.align === "right" && "flex-row-reverse",
                      )}
                      onClick={() => table.toggleSort(c.key)}
                      type="button"
                    >
                      {c.label}
                      {table.sort?.key === c.key ? (
                        table.sort.dir === 1 ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.pageRows.map((r) => (
              <tr
                className={cn(
                  "border-t transition-colors hover:bg-accent/40",
                  onRow && "cursor-pointer",
                )}
                key={rowKey(r)}
                onClick={onRow ? () => onRow(r) : undefined}
              >
                {table.columns.map((c) => (
                  <td
                    className={cn(
                      "px-3 tabular-nums",
                      dense ? "py-1.5" : "py-2.5",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.className,
                    )}
                    key={c.key}
                  >
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!table.filtered.length && (
          <p className="p-8 text-center text-xs text-muted-foreground">
            조건에 맞는 데이터가 없습니다.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {fmt.n(table.filtered.length)}건 · {table.page + 1} / {table.pages}
        </span>
        <div className="flex items-center gap-1">
          <Button
            aria-label="이전 페이지"
            className="size-7"
            disabled={table.page === 0}
            onClick={() => table.setPage(table.page - 1)}
            size="icon-sm"
            variant="outline"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            aria-label="다음 페이지"
            className="size-7"
            disabled={table.page >= table.pages - 1}
            onClick={() => table.setPage(table.page + 1)}
            size="icon-sm"
            variant="outline"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Tag({
  color,
  children,
  className,
}: {
  color?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[10.5px] font-medium text-muted-foreground",
        className,
      )}
    >
      {color && (
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ background: color }}
        />
      )}
      {children}
    </span>
  );
}
