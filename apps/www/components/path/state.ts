"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { dayShift } from "@/components/market-performance/alternative-model";
import type { Range } from "@/components/market-performance/data";
import { DEFAULT_CRITERIA, type PivotCriteria } from "./market";
import { AS_OF } from "./model";

/* ───────────── Period filter (shared across pages via the URL) ───────────── */

export const PERIODS = [
  { id: "mtd", label: "이번 달" },
  { id: "4w", label: "4주" },
  { id: "qtd", label: "분기" },
  { id: "ytd", label: "연간" },
  { id: "12m", label: "12개월" },
] as const;
export type Period = (typeof PERIODS)[number]["id"];

export function periodRange(p: Period, asOf = AS_OF): Range {
  const y = asOf.slice(0, 4);
  const m = Number(asOf.slice(5, 7));
  if (p === "mtd") return { start: `${asOf.slice(0, 8)}01`, end: asOf };
  if (p === "4w") return { start: dayShift(asOf, -27), end: asOf };
  if (p === "qtd")
    return {
      start: `${y}-${String(Math.floor((m - 1) / 3) * 3 + 1).padStart(2, "0")}-01`,
      end: asOf,
    };
  if (p === "ytd") return { start: `${y}-01-01`, end: asOf };
  return { start: dayShift(asOf, -364), end: asOf };
}

/** Query-string state shared by every page: period plus page-specific keys. */
export function useQueryState() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      router.replace(`${pathname}?${next}`, { scroll: false });
    },
    [params, router, pathname],
  );
  return { params, set };
}
export function usePeriod(fallback: Period = "mtd") {
  const { params, set } = useQueryState();
  const raw = params.get("period");
  const period = (PERIODS.some((p) => p.id === raw) ? raw : fallback) as Period;
  return {
    period,
    range: periodRange(period),
    setPeriod: (p: Period) => set({ period: p }),
  };
}

/* ───────────── Turning-point criteria (settings 6.3) ───────────── */

const CRITERIA_KEY = "path-v2-pivot-criteria";
let criteria: PivotCriteria = DEFAULT_CRITERIA;
let criteriaLoaded = false;
const criteriaListeners = new Set<() => void>();
export function usePivotCriteria() {
  const value = useSyncExternalStore(
    (l) => {
      if (!criteriaLoaded) {
        criteriaLoaded = true;
        try {
          const v = JSON.parse(localStorage.getItem(CRITERIA_KEY) ?? "null");
          if (v && typeof v.thresholdPct === "number")
            criteria = { ...DEFAULT_CRITERIA, ...v };
        } catch {
          /* defaults */
        }
      }
      criteriaListeners.add(l);
      return () => criteriaListeners.delete(l);
    },
    () => criteria,
    () => DEFAULT_CRITERIA,
  );
  const save = (next: PivotCriteria) => {
    criteria = next;
    try {
      localStorage.setItem(CRITERIA_KEY, JSON.stringify(next));
    } catch {
      /* session only */
    }
    for (const l of criteriaListeners) l();
  };
  return [value, save] as const;
}

/* ───────────── Tenant session ───────────── */

export const SESSION = {
  user: {
    name: "김마케터",
    email: "marketer@skkt.example",
    role: "마케팅 매니저",
  },
  tenant: {
    id: "skkt-online",
    name: "SK텔레콤",
    unit: "온라인사업본부",
    plan: "Enterprise",
  },
  tenants: [
    { id: "skkt-online", name: "SK텔레콤", unit: "온라인사업본부" },
    { id: "skkt-mvvno", name: "SK텔레콤", unit: "MVVNO사업팀" },
  ],
  workspaces: ["home", "aiir", "tdds", "mvvno"] as const,
};
