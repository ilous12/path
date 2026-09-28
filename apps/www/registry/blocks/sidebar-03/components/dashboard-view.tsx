"use client";

import { DetailLoading } from "@/components/market-performance/detail-loading";
import { WorkspaceHeader } from "@/components/market-performance/workspace-header";
import { lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { DataExplorer } from "@/components/market-performance/data-explorer";
import { PlanWorkspaceSummary, CurrentSettings } from "@/components/market-performance/workspace-summaries";
import { HomeKpi } from "@/components/market-performance/home-kpi";
import { HomeDashboard } from "@/components/market-performance/home-dashboard";
import { EventOverview } from "@/components/market-performance/event-overview";
import { PolicyLedger } from "@/components/market-performance/policy-ledger";
import { EventManagement } from "./event-management";
import { ManagementConsole } from "./management-console";
import { DashboardContent } from "./dashboard-content";

const PlanCatalog = lazy(() =>
  import("@/components/market-performance/plan-catalog").then((m) => ({
    default: m.PlanCatalog,
  })),
);

const PlanOverview = lazy(() =>
  import("@/components/market-performance/plan-overview-page").then((m) => ({
    default: m.PlanOverviewPage,
  })),
);
const ExperimentCards = lazy(() =>
  import("@/components/market-performance/experiment-cards").then((m) => ({
    default: m.ExperimentCards,
  })),
);
const ExperimentSearch = lazy(() =>
  import("@/components/market-performance/experiment-search").then((m) => ({
    default: m.ExperimentSearch,
  })),
);
const KpiDashboard = lazy(() =>
  import("@/components/market-performance/kpi-dashboard").then((m) => ({
    default: m.KpiDashboard,
  })),
);
const PlanCompetitiveness = lazy(() => import("@/components/market-performance/plan-competitiveness").then(m => ({default:m.PlanCompetitiveness})));
const ChannelPages = lazy(() => import("@/components/market-performance/channel-pages").then(m => ({default: m.ChannelPages})));
const titles: Record<string, string> = {
  channels: "채널 · 스펙트럼",
  "channels-search": "채널 검색",
  "plans-competitiveness": "요금제 · 경쟁력",
  summary: "현황",
  events: "업계 동향 · 오버뷰",
  "events-search": "검색",
  experiments: "캠페인 · 오버뷰",
  "experiments-search": "캠페인 검색",
  kpi: "실적",
  "plans-summary": "요금제 · AI 요약",
  promotions: "프로모션/행사 · AI 요약",
  "promotions-search": "프로모션/행사 검색",
  "settings-current": "현재 설정",
  plans: "요금제 · 스펙트럼",
  "plans-search": "요금제 검색",
  policies: "판매정책",
  admin: "설정",
  data: "데이터",
};
export function DashboardViewTitle() {
  const query = useSearchParams();
  if (query.get("workspace") === "home" && !["data", "policies"].includes(query.get("view") ?? "")) return <>{query.get("view") === "kpi" ? "실적" : "사업 현황"}</>;
  return (
    <>{titles[query.get("view") ?? "summary"] ?? titles.summary}</>
  );
}
export function DashboardView() {
  const params = useSearchParams();
  const view = params.get("view") ?? "summary";
  if (view === "policies") return <PolicyLedger key={params.get("workspace") ?? "aiir"} />;
  if (params.get("workspace") === "home" && view !== "data") return view === "kpi" ? <HomeKpi /> : <HomeDashboard />;
  if (view === "channels" || view === "channels-search") return <Suspense fallback={<div className="space-y-6"><WorkspaceHeader><h1>{titles[view]}</h1></WorkspaceHeader><DetailLoading mode="page" /></div>}><ChannelPages search={view === "channels-search"} key={`${params.get("workspace")}:${view}`} /></Suspense>;
  if (view === "plans-competitiveness") return <Suspense fallback={<div className="space-y-6"><WorkspaceHeader><h1>요금제 · 경쟁력</h1></WorkspaceHeader><DetailLoading mode="page" /></div>}><PlanCompetitiveness /></Suspense>;
  if (view === "plans-summary") return <PlanWorkspaceSummary />;
  if (view === "settings-current") return <CurrentSettings />;
  if (view === "promotions") return <EventOverview promotionsOnly key={params.get("workspace") ?? "aiir"} />;
  if (view === "promotions-search") return <EventManagement promotionsOnly key={params.toString()} />;
  if (!titles[view] || view === "summary")
    return <DashboardContent showOnboarding={false} />;
  if (view === "plans" || view === "plans-search")
    return (
      <Suspense
        fallback={<div className="space-y-6"><WorkspaceHeader><h1>{titles[view]}</h1></WorkspaceHeader><DetailLoading mode="page" /></div>}
      >
        {view === "plans" ? <PlanOverview /> : <PlanCatalog />}
      </Suspense>
    );
  if (view === "experiments" || view === "experiments-search")
    return (
      <Suspense
        fallback={<div className="space-y-6"><WorkspaceHeader><h1>{titles[view]}</h1></WorkspaceHeader><DetailLoading mode="page" /></div>}
      >
        {view === "experiments" ? (
          <ExperimentCards />
        ) : (
          <ExperimentSearch key={params.get("workspace") ?? "aiir"} />
        )}
      </Suspense>
    );
  if (view === "kpi")
    return (
      <Suspense
        fallback={<div className="space-y-6"><WorkspaceHeader><h1>{titles[view]}</h1></WorkspaceHeader><DetailLoading mode="page" /></div>}
      >
        <KpiDashboard key={params.get("workspace") ?? "aiir"} />
      </Suspense>
    );
  if (view === "events") return <EventOverview key={params.get("workspace") ?? "aiir"} />;
  if (view === "events-search") return <EventManagement key={params.toString()} />;
  if (view === "data")
    return <DataExplorer key={params.get("workspace") ?? "aiir"} />;
  return <ManagementConsole key={params.get("workspace") ?? "aiir"} />;
}
