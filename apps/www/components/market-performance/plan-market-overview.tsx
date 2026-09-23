"use client";
import { useState } from "react";
import { PlanVolumeSpectrum } from "./plan-volume-spectrum";
import { Button } from "@/components/ui/button";
import catalog from "./fixtures/plan-catalog.json";
import {
  changes,
  groupFor,
  isAir,
  operatorGroups,
  type PlanOffer,
} from "./plan-market-model";
const won = (v: number) => `${v.toLocaleString("ko-KR")}원`;
export function PlanMarketOverview({ showSummary = true }: { showSummary?: boolean }) {
  const observations = new Map<string, (typeof catalog.history)[number]>();
  for (const h of catalog.history) { if ((!observations.has(h.offerId) || observations.get(h.offerId)!.observedAt < h.observedAt)) observations.set(h.offerId, h); }
  const offers: PlanOffer[] = catalog.offers.flatMap(p => { const h = observations.get(p.offerId); return h ? [{...p, displayedEffectiveKrw: h.effectiveKrw, observedAt: h.observedAt}] : []; });
  const [groups, setGroups] = useState<string[]>([]);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  const shown = offers.filter(
    (p) => groups.length === 0 || groups.includes(groupFor(p).name),
  );
  const air = shown.filter(isAir);
  const prices = shown.flatMap(p => p.displayedEffectiveKrw == null ? [] : [p.displayedEffectiveKrw]);
  const counts = operatorGroups.map(g => ({...g, count: shown.filter(p => groupFor(p).name === g.name).length})).sort((a,b) => b.count-a.count);
  const dayChanges = changes.filter(h => observations.get(h.offerId)?.observedAt === h.observedAt && shown.some(p => p.offerId === h.offerId) && h.kind === "price");
  return (
    <section className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">전체 체감가 요금제 스펙트럼</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            3D 매물대 · 체감가 × 데이터 구간 × 요금제 수 ·{" "}
            {shown.length.toLocaleString("ko-KR")}개 판매 조건
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="사업자별 스펙트럼 필터">
        <Button
          size="sm"
          aria-pressed={groups.length === 0}
          variant={groups.length === 0 ? "secondary" : "ghost"}
          onClick={() => {
            setGroups([]);
          }}
          onMouseEnter={() => setHoveredGroup(null)}
        >
          전체
        </Button>
        {operatorGroups.map((g) => {
          const isHovered = hoveredGroup === g.name;
          return (
            <Button
              key={g.name}
              size="sm"
              variant={groups.includes(g.name) ? "secondary" : isHovered ? "outline" : "ghost"}
              aria-pressed={groups.includes(g.name)}
              className={isHovered ? "ring-2 ring-primary/50 transition-all" : "transition-all"}
              onClick={() => {
                setGroups((current) => current.includes(g.name) ? current.filter((name) => name !== g.name) : [...current, g.name]);
              }}
              onMouseEnter={() => setHoveredGroup(g.name)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              <span
                className="size-2 rounded-full"
                style={{ background: g.color }}
              />
              {g.name} <span className="text-muted-foreground">{offers.filter(p => groupFor(p).name === g.name).length}</span>
            </Button>
          );
        })}
      </div>
      <div className={showSummary ? "grid gap-5 md:grid-cols-[minmax(0,1fr)_240px]" : "min-w-0"}>
        {shown.length ? (
          <PlanVolumeSpectrum
            offers={shown}
            hoveredGroup={hoveredGroup}
            onHoverGroup={setHoveredGroup}
          />
        ) : (
          <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            선택한 사업자의 수집된 요금제가 없습니다.
          </div>
        )}
        {showSummary && <aside className="rounded-lg border bg-background/50 p-4">
          <h3 className="text-sm font-semibold">AI 요약</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">
            PATH 자동 집계
          </p>
          <p className="mt-3 text-xs text-muted-foreground">요금제별 최신 관측 · 선택 사업자 기준</p>
          <ul className="mt-4 space-y-4 text-sm leading-relaxed">
            <li>{shown.length ? `${shown.length.toLocaleString("ko-KR")}개 판매 조건이 관측됐습니다. ${counts[0].name}가 ${counts[0].count}개로 가장 많습니다.` : "선택 사업자의 수집 데이터가 없어 요약할 수 없습니다."}</li>
            {prices.length > 0 && <li>체감가 분포는 {won(Math.min(...prices))} ~ {won(Math.max(...prices))}입니다. 서로 다른 상품 스펙을 포함하므로 가격 순위가 경쟁력을 뜻하지 않습니다.</li>}
            {shown.length > 0 && <li>AIR {air.length}개 조건 · 이전 관측 대비 확인된 체감가 변경 {dayChanges.length}건. 최초 관측은 가격 변경으로 집계하지 않습니다.</li>}
          </ul>
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">요금제별 마지막 관측값을 사용하므로 수집 시점은 서로 다를 수 있습니다. 체감가는 청구 금액과 다를 수 있으며, 관측 이력이 부족한 경우 변경 추세를 판단하지 않습니다.</p>
        </aside>}
      </div>
      <p className="text-[11px] text-muted-foreground">
        사업자를 여러 개 선택해 비교할 수 있습니다. AIR 고정 강조색 · 타사 상위 8개 사업자는 수집 요금제 수 순서로 색상 배정
        · 나머지는 기타 사업자로 묶음. 시야는 고정되어 있으며 가격·제공량은 원자료 기준입니다.
      </p>
    </section>
  );
}
export function PlanMarketTimeline() {
  const days = [...new Set(changes.map((h) => h.day))].sort().reverse();
  const [day, setDay] = useState(days[0]);
  const daily = changes.filter((h) => h.day === day);
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">데일리 변경 현황</h2>
        <select
          aria-label="요금제 관측일"
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        >
          {days.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[true, false].map((own) => {
          const h = daily.filter((r) => isAir(r) === own);
          return (
            <div key={String(own)} className="rounded-xl border bg-card p-4">
              <h3 className="text-sm font-medium">
                {own ? "AIR · 공식 / 카카오페이" : "타사 · 모요 중개 채널 포함"}
              </h3>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-3xl tabular-nums">
                  {h.filter((r) => r.kind === "price").length}
                </strong>
                <span className="text-xs text-muted-foreground">
                  확인된 체감가 변경
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  최초 관측{" "}
                  {h
                    .filter((r) => r.kind === "first")
                    .length.toLocaleString("ko-KR")}
                  건
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">요금제 타임라인</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          실제 수집일 기준 · 최초 관측은 출시나 변경이 아닙니다. 체감가 비교가
          가능한 관측만 변경 집계에 포함합니다.
        </p>
        <ol className="mt-4 space-y-4 border-l border-border pl-5">
          {days.map((d) => {
            const h = changes.filter((r) => r.day === d);
            return (
              <li key={d} className="relative">
                <span className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-primary" />
                <button
                  type="button"
                  className="text-sm font-medium hover:underline"
                  onClick={() => setDay(d)}
                >
                  {d}
                </button>
                <p className="mt-1 text-xs text-muted-foreground">
                  AIR {h.filter(isAir).length}건 · 타사{" "}
                  {h.filter((r) => !isAir(r)).length.toLocaleString("ko-KR")}건
                  관측 · 최초{" "}
                  {h
                    .filter((r) => r.kind === "first")
                    .length.toLocaleString("ko-KR")}
                  건 / 체감가 변경 {h.filter((r) => r.kind === "price").length}
                  건
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
