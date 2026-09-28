"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionLabel } from "./intelligence-ui";

export function HomeDashboardSkeleton({
  timelineOnly = false,
  workspace = "home",
}: {
  timelineOnly?: boolean;
  workspace?: "home" | "aiir" | "tdds";
}) {
  return (
    <div aria-hidden="true" className="space-y-3.5 2xl:space-y-2.5">
      {!timelineOnly && (
        <>
          {/* 1. 시장 요약 */}
          <div className="space-y-2 2xl:space-y-1.5">
            <SectionLabel meta="최근 30일 기준" title="시장 요약" />
            <div className="grid gap-2.5 md:grid-cols-3 2xl:gap-2">
              {["시장 동향", "추세 전환", "판매 정책 변경"].map((panelTitle) => (
                <Card
                  key={panelTitle}
                  className="flex flex-col rounded-xl border bg-card p-2.5 shadow-none 2xl:p-2"
                >
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="size-3.5 rounded" />
                      <span className="text-[12.5px] font-semibold text-foreground/80 2xl:text-[12px]">
                        {panelTitle}
                      </span>
                      <Skeleton className="h-3.5 w-6 rounded border" />
                    </div>
                    <Skeleton className="h-4 w-9 rounded" />
                  </div>
                  <div className="mt-1.5 space-y-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-[14px_34px_auto_minmax(0,1fr)_auto] items-center gap-1.5 py-[2px] 2xl:py-[1.5px]"
                      >
                        <Skeleton className="size-3.5 justify-self-center rounded-full" />
                        <Skeleton className="h-3 w-7 rounded" />
                        <Skeleton className="h-3.5 w-8 rounded border" />
                        <Skeleton className="h-3 flex-1 rounded" />
                        <Skeleton className="size-4 rounded" />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* 2. 실적 요약 */}
          <div className="space-y-2 2xl:space-y-1.5">
            <SectionLabel
              meta="월간·연간 목표 진척 및 주간 실적"
              title="실적 요약"
            />
            <div className={`grid gap-2.5 2xl:gap-2 ${workspace === "home" ? "lg:grid-cols-3" : ""}`}>
              {[
                { name: "AIIR", color: "#6366f1" },
                { name: "TDDS", color: "#10b981" },
                { name: "MVVNO", color: "#f59e0b" },
              ].filter(biz => workspace === "home" || biz.name.toLowerCase() === workspace).map((biz) => (
                <Card
                  key={biz.name}
                  className="min-w-0 gap-2 rounded-xl border bg-card py-2.5 shadow-none 2xl:gap-1.5 2xl:py-2"
                >
                  <div className="flex items-center justify-between px-3.5 pb-0.5 2xl:px-3">
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{ background: biz.color }}
                      />
                      <h3 className="text-[13px] font-bold tracking-tight text-foreground 2xl:text-[12.5px]">
                        {biz.name}
                      </h3>
                    </div>
                    <Skeleton className="size-5 rounded" />
                  </div>

                  <div className="mx-3.5 space-y-1.5 rounded-lg border bg-muted/30 px-3 py-1.5 2xl:mx-3 2xl:py-1.5">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-32 rounded" />
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 w-36 rounded" />
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                      <Skeleton className="h-1.5 w-full rounded-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-5 divide-x px-3.5 pt-0.5 2xl:px-3">
                    {["가입", "해지", "순증", "매출", "순익"].map((kpi) => (
                      <div className="min-w-0 px-1.5 first:pl-0" key={kpi}>
                        <p className="text-[10px] font-medium text-muted-foreground 2xl:text-[9.5px]">
                          {kpi}
                        </p>
                        <Skeleton className="mt-1 h-3.5 w-10 rounded" />
                        <Skeleton className="mt-0.5 h-2.5 w-7 rounded" />
                      </div>
                    ))}
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5 border-t px-3.5 pt-1 2xl:px-3 2xl:pt-1">
                    <Skeleton className="h-3 w-full rounded" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 3. 타임라인 */}
      <div className="space-y-2 2xl:space-y-1.5">
        <SectionLabel
          meta="시장 동향 · 판매 정책 · 추세 전환 · 캠페인"
          title="타임라인"
        />
        <section
          aria-label="타임라인 로딩"
          className="space-y-1.5 rounded-xl bg-card p-2.5 ring-1 ring-primary/10 xl:px-3.5 2xl:p-2 2xl:px-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
            <Skeleton className="h-3.5 w-40 rounded" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-md" />
            </div>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
          <div className="flex h-[270px] w-full flex-col justify-between rounded-lg border bg-muted/10 p-3 2xl:h-[275px]">
            <div className="flex justify-between border-b pb-1.5">
              <Skeleton className="h-3 w-14 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
            <div className="space-y-2.5 py-4">
              <Skeleton className="h-1 w-full rounded" />
              <Skeleton className="h-1 w-4/5 rounded" />
              <Skeleton className="h-1 w-full rounded" />
            </div>
            <div className="flex justify-between border-t pt-1.5">
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-3 w-10 rounded" />
            </div>
          </div>
          <Skeleton className="h-7 w-full rounded-md" />
        </section>
      </div>
    </div>
  );
}

export function HomeKpiSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3.5 2xl:space-y-2.5">
      {/* 1. 경영진 & 마케팅 브리프 */}
      <div className="space-y-2 2xl:space-y-1.5">
        <SectionLabel
          meta="3사 포트폴리오 거시 지표 및 AI 진단 제언"
          title="경영진 & 마케팅 핵심 브리프"
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 2xl:gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="space-y-1 p-2.5 2xl:p-2">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-5 w-24 rounded" />
              <Skeleton className="h-2.5 w-20 rounded" />
            </Card>
          ))}
        </div>
        <div className="grid gap-2.5 md:grid-cols-3 2xl:gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex flex-col justify-between p-3 2xl:p-2.5">
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="size-2 rounded-full" />
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                  <Skeleton className="h-4 w-14 rounded" />
                </div>
                <div className="space-y-1 py-1">
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-5/6 rounded" />
                </div>
              </div>
              <div className="flex items-center justify-between border-t pt-1.5">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-3 w-10 rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 2. 사업별 실적 심층 분석 매트릭스 */}
      <div className="space-y-2 2xl:space-y-1.5">
        <SectionLabel
          meta="당월·연간 목표 진척, 5대 KPI 및 건전성 지표"
          title="사업별 실적 심층 분석"
        />
        <div className="grid gap-2.5 lg:grid-cols-3 2xl:gap-2">
          {[
            { name: "AIIR", color: "#6366f1" },
            { name: "TDDS", color: "#10b981" },
            { name: "MVVNO", color: "#f59e0b" },
          ].map((biz) => (
            <Card
              key={biz.name}
              className="min-w-0 gap-2 rounded-xl border bg-card py-2.5 shadow-none 2xl:gap-1.5 2xl:py-2"
            >
              <div className="flex items-center justify-between px-3.5 pb-0.5 2xl:px-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ background: biz.color }}
                  />
                  <h3 className="text-[13px] font-bold tracking-tight text-foreground 2xl:text-[12.5px]">
                    {biz.name}
                  </h3>
                </div>
                <Skeleton className="size-5 rounded" />
              </div>

              <div className="mx-3.5 space-y-1.5 rounded-lg border bg-muted/30 px-3 py-1.5 2xl:mx-3 2xl:py-1.5">
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-32 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-36 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </div>

              <div className="grid grid-cols-5 divide-x px-3.5 pt-0.5 2xl:px-3">
                {["가입", "해지", "순증", "매출", "순익"].map((kpi) => (
                  <div className="min-w-0 px-1.5 first:pl-0" key={kpi}>
                    <p className="text-[10px] font-medium text-muted-foreground 2xl:text-[9.5px]">
                      {kpi}
                    </p>
                    <Skeleton className="mt-1 h-3.5 w-10 rounded" />
                    <Skeleton className="mt-0.5 h-2.5 w-7 rounded" />
                  </div>
                ))}
              </div>

              <div className="flex min-w-0 items-center gap-1.5 border-t px-3.5 pt-1 2xl:px-3 2xl:pt-1">
                <Skeleton className="h-3 w-full rounded" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. 차트 섹션 */}
      <div className="space-y-2 2xl:space-y-1.5">
        <SectionLabel
          meta="지표별 일별 추이 비교 및 기간 줌인 탐색"
          title="다차원 KPI 추이 비교 차트"
        />
        <section
          aria-label="KPI 차트 로딩"
          className="space-y-1.5 rounded-xl bg-card p-2.5 ring-1 ring-primary/10 xl:px-3.5 2xl:p-2 2xl:px-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-1.5">
            <div className="flex items-center gap-1">
              <Skeleton className="h-7 w-48 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-36 rounded" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-md" />
              <Skeleton className="h-7 w-14 rounded-md" />
            </div>
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
          <div className="flex h-[270px] w-full flex-col justify-between rounded-lg border bg-muted/10 p-3 2xl:h-[275px]">
            <div className="flex justify-between border-b pb-1.5">
              <Skeleton className="h-3 w-14 rounded" />
              <Skeleton className="h-3 w-14 rounded" />
            </div>
            <div className="space-y-2.5 py-4">
              <Skeleton className="h-1 w-full rounded" />
              <Skeleton className="h-1 w-4/5 rounded" />
              <Skeleton className="h-1 w-full rounded" />
            </div>
            <div className="flex justify-between border-t pt-1.5">
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-3 w-10 rounded" />
              <Skeleton className="h-3 w-10 rounded" />
            </div>
          </div>
          <Skeleton className="h-7 w-full rounded-md" />
        </section>
      </div>

      {/* 4. 테이블 섹션 */}
      <div className="space-y-2 2xl:space-y-1.5">
        <SectionLabel
          meta="선택 기간 합계/평균, 기여도 및 목표 달성률 상세 비교"
          title="3사 실적 종합 비교표"
        />
        <Card className="p-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-full rounded" />
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-8 w-full rounded" />
            <Skeleton className="h-8 w-full rounded" />
          </div>
        </Card>
      </div>
    </div>
  );
}
