"use client";

import { useSearchParams } from "next/navigation";
import { DataExplorer } from "@/components/market-performance/data-explorer";
import { EventManagement } from "./event-management";
import { ManagementConsole } from "./management-console";
import { DashboardContent } from "./dashboard-content";

const titles: Record<string, string> = {
  summary: "타임라인",
  events: "이벤트",
  admin: "설정",
  data: "데이터",
};
export function DashboardViewTitle() {
  return (
    <>{titles[useSearchParams().get("view") ?? "summary"] ?? titles.summary}</>
  );
}
export function DashboardView() {
  const params = useSearchParams();
  const view = params.get("view") ?? "summary";
  if (!titles[view] || view === "summary")
    return <DashboardContent showOnboarding={false} />;
  if (view === "events") return <EventManagement />;
  if (view === "data")
    return <DataExplorer key={params.get("workspace") ?? "air"} />;
  return <ManagementConsole key={params.get("workspace") ?? "air"} />;
}
