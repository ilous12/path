"use client";
import { WorkspaceHeader } from "./workspace-header";
import { PageEntry } from "./page-entry";
import { PlanMarketOverview } from "./plan-market-overview";
import { planDay } from "./plan-market-model";
import catalog from "./fixtures/plan-catalog.json";
export function PlanOverviewPage() {
  const latest = catalog.history.reduce((date, h) => h.observedAt > date ? h.observedAt : date, "");
  return (
    <div className="space-y-6 pb-14">
      <WorkspaceHeader>
        <div>
          <h1>요금제 · 스펙트럼</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            요금제별 가장 최근 수집된 판매 조건을 기준으로 체감가 분포를 비교합니다.
          </p>
        </div>
        {latest && <span className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">최근 수집 {planDay(latest)}</span>}
      </WorkspaceHeader>
      <PageEntry><PlanMarketOverview /></PageEntry>
    </div>
  );
}
