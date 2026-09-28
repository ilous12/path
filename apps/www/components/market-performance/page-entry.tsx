"use client";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { RefreshingAnalysis } from "./refreshing-analysis";
export function PageEntry({ children }: { children: ReactNode }) {
  const params = useSearchParams();
  return <RefreshingAnalysis mode="page" refreshKey={`${params.get("view") ?? "summary"}:${params.get("workspace") ?? "aiir"}`}>{children}</RefreshingAnalysis>;
}
