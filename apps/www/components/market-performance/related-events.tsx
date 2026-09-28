"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Sparkles, TrendingUp, Users, ShieldAlert, GitCommit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EVENTS, type MarketEvent, getEventType, formatAt } from "./data";

export type RelationCategory = "경쟁사 대응" | "동일 채널 영향" | "자사 연계 정책" | "유사 정책 전개" | "추세 전환 유발 요인" | "시장 환경 변화";
export type ImpactLevel = "높음" | "보통" | "관찰";

export type RelatedEventItem = {
  event: MarketEvent;
  relationCategory: RelationCategory;
  impactLevel: ImpactLevel;
  diffDays: number;
  relationReason: string;
};

export function findRelatedEvents({
  currentEvent,
  anchorDate,
  limit = 6,
}: {
  currentEvent?: MarketEvent;
  anchorDate?: string;
  limit?: number;
}): RelatedEventItem[] {
  const baseDate = currentEvent ? currentEvent.startAt.slice(0, 10) : anchorDate ?? "";
  if (!baseDate) return [];

  const baseTime = new Date(baseDate).getTime();

  return EVENTS.filter((e) => !currentEvent || e.id !== currentEvent.id)
    .map((e) => {
      const eDate = e.startAt.slice(0, 10);
      const diffDays = Math.round((new Date(eDate).getTime() - baseTime) / 86400000);
      const absDiff = Math.abs(diffDays);

      let relationCategory: RelationCategory = "시장 환경 변화";
      let impactLevel: ImpactLevel = "관찰";
      let relationReason = "";

      if (currentEvent) {
        const isCompetitor = e.operator !== currentEvent.operator;
        const sameChannel = e.channel === currentEvent.channel && e.channel !== "전체";
        const hasCommonTypes = e.types.some((t) => currentEvent.types.includes(t));

        if (isCompetitor && (hasCommonTypes || absDiff <= 14)) {
          relationCategory = "경쟁사 대응";
          impactLevel = absDiff <= 7 ? "높음" : absDiff <= 21 ? "보통" : "관찰";
          relationReason = `${e.operator}에서 유사 상품군(${e.types.map((t) => getEventType(t).label).join(", ")})에 대한 맞대응 정책을 ${absDiff === 0 ? "동일 시점" : `${absDiff}일 ${diffDays > 0 ? "후" : "전"}`}에 전개하여 가입자 유출입에 직접적인 영향을 주었습니다.`;
        } else if (sameChannel) {
          relationCategory = "동일 채널 영향";
          impactLevel = absDiff <= 14 ? "높음" : "보통";
          relationReason = `동일 유통 채널(${e.channel})에서 집행되어 채널 내 노출 순위 및 고객 가입 전환율에 상호 간섭 영향을 미쳤습니다.`;
        } else if (!isCompetitor) {
          relationCategory = "자사 연계 정책";
          impactLevel = absDiff <= 14 ? "보통" : "관찰";
          relationReason = `자사(${e.operator})의 연계 정책으로, 동일 기간 진행된 타 혜택 및 요금 조건과의 결합 시너지 효과가 관측되었습니다.`;
        } else if (hasCommonTypes) {
          relationCategory = "유사 정책 전개";
          impactLevel = absDiff <= 14 ? "보통" : "관찰";
          relationReason = `업계 유사 정책(${e.types.map((t) => getEventType(t).label).join(", ")})의 연속적 변경으로 시장 전반의 가격 민감도에 영향을 미쳤습니다.`;
        } else {
          relationCategory = "시장 환경 변화";
          impactLevel = "관찰";
          relationReason = `동일 기간 발생한 통신 시장의 전반적인 환경 변화 및 프로모션 흐름과 연계된 이벤트입니다.`;
        }
      } else {
        // Based on anchorDate (e.g. turning point)
        relationCategory = "추세 전환 유발 요인";
        impactLevel = absDiff <= 7 ? "높음" : absDiff <= 21 ? "보통" : "관찰";
        relationReason = `추세 전환 변곡점(${baseDate}) ${absDiff === 0 ? "당일" : `${absDiff}일 ${diffDays > 0 ? "후" : "전"}`}에 발생한 ${e.operator}의 이벤트로, 실적 반등 및 급변의 유력한 원인 가설로 평가됩니다.`;
      }

      return {
        event: e,
        relationCategory,
        impactLevel,
        diffDays,
        relationReason,
      };
    })
    .filter((item) => Math.abs(item.diffDays) <= 45)
    .sort((a, b) => {
      const impactScore = { 높음: 3, 보통: 2, 관찰: 1 };
      if (impactScore[b.impactLevel] !== impactScore[a.impactLevel]) {
        return impactScore[b.impactLevel] - impactScore[a.impactLevel];
      }
      return Math.abs(a.diffDays) - Math.abs(b.diffDays);
    })
    .slice(0, limit);
}

const IMPACT_STYLES: Record<ImpactLevel, string> = {
  높음: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-400 font-semibold",
  보통: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium",
  관찰: "border-border bg-muted/50 text-muted-foreground",
};

const CATEGORY_ICONS: Record<RelationCategory, React.ComponentType<{ className?: string }>> = {
  "경쟁사 대응": Users,
  "동일 채널 영향": GitCommit,
  "자사 연계 정책": Sparkles,
  "유사 정책 전개": TrendingUp,
  "추세 전환 유발 요인": ShieldAlert,
  "시장 환경 변화": TrendingUp,
};

export function RelatedEventsSection({
  currentEvent,
  anchorDate,
  workspace = "home",
}: {
  currentEvent?: MarketEvent;
  anchorDate?: string;
  workspace?: string;
}) {
  const related = useMemo(
    () => findRelatedEvents({ currentEvent, anchorDate, limit: 6 }),
    [currentEvent, anchorDate],
  );

  if (!related.length) return null;

  return (
    <section className="space-y-4 pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            연관 정보 · 관계별 영향 이벤트
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            선택된 이벤트와 시기·채널·경쟁 구도에서 직접적인 상호작용 및 영향도가 분석된 연관 시장 동향입니다.
          </p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          총 {related.length}건 연관 탐색됨
        </span>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2">
        {related.map(({ event, relationCategory, impactLevel, diffDays, relationReason }) => {
          const Icon = CATEGORY_ICONS[relationCategory] ?? Sparkles;
          const targetHref = `/events/${encodeURIComponent(event.id)}?workspace=${encodeURIComponent(workspace)}`;

          return (
            <Card
              key={event.id}
              className="flex flex-col justify-between border transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="gap-1 text-[11px] py-0.5">
                      <Icon className="size-3 text-primary" />
                      {relationCategory}
                    </Badge>
                    <Badge variant="outline" className={IMPACT_STYLES[impactLevel]}>
                      영향도: {impactLevel}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {formatAt(event.startAt)} ({diffDays === 0 ? "동일일" : `${Math.abs(diffDays)}일 ${diffDays > 0 ? "후" : "전"}`})
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {event.operator}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      채널: {event.channel}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-semibold leading-snug">
                    <Link href={targetHref} className="hover:underline hover:text-primary transition-colors">
                      {event.title}
                    </Link>
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-1 space-y-3">
                <p className="rounded-md bg-muted/40 p-2 text-[11.5px] leading-relaxed text-muted-foreground">
                  💡 {relationReason}
                </p>

                {(event.before || event.after) && (
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">내용 요약: </span>
                    {event.before && <span className="line-through">{event.before}</span>}
                    {event.before && event.after && <span className="mx-1 font-bold">→</span>}
                    {event.after && <span className="font-medium text-foreground">{event.after}</span>}
                  </div>
                )}

                <div className="flex items-center justify-end border-t pt-2.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary hover:text-primary gap-1 px-2"
                    render={<Link href={targetHref} />}
                  >
                    이벤트 상세보기
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
