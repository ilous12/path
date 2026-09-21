"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import { useEventCatalog } from "./event-catalog";
import { useEventVisibility } from "./event-visibility";
import { useAlternatives } from "./alternative-store";
import { dayShift } from "./alternative-model";
import { getEventType, type Range } from "./data";
import { Badge } from "@/components/ui/badge";

function useReview(range: Range, workspace: string) {
  const { events } = useEventCatalog();
  const { hiddenIds } = useEventVisibility();
  const { alternatives } = useAlternatives();
  const visible = events.filter(
    (e) =>
      !hiddenIds.includes(e.id) &&
      e.startAt.slice(0, 10) <= range.end &&
      (e.endAt ?? e.startAt).slice(0, 10) >= range.start,
  );
  const reported = visible
    .filter((e) => e.evidenceKind === "reported")
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  const own = visible.filter(
    (e) => e.operator.toLowerCase() === workspace.toLowerCase(),
  );
  const drafts = alternatives.filter(
    (a) =>
      (a.workspace ?? "air") === workspace &&
      a.status === "draft" &&
      a.start <= range.end &&
      dayShift(a.start, (a.applyDays ?? a.days) - 1) >= range.start,
  );
  return { visible, reported, own, drafts };
}

export function DecisionOverview({
  range,
  workspace,
}: {
  range: Range;
  workspace: string;
}) {
  const { visible, reported, own, drafts } = useReview(range, workspace);
  const items = [
    {
      label: "출처 있는 시장 변화",
      value: reported.length,
      note: "공식 발표·뉴스 · 계획 포함",
    },
    {
      label: `${workspace.toUpperCase()} 관련 이벤트`,
      value: own.length,
      note: "실제 보도·가상 시나리오·수동 등록 포함",
    },
    {
      label: "검토할 실험 초안",
      value: drafts.length,
      note: "선택 기간과 겹치는 초안",
    },
    {
      label: "관측 중인 이벤트",
      value: visible.length,
      note: "숨긴 이벤트 제외 · 선택 기간 기준",
    },
  ];
  return (
    <section aria-label="선택 기간 업무 요약" className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs">
      {items.map(({ label, value, note }) => (
        <div key={label} title={note} className="flex items-center gap-2">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-semibold tabular-nums">{value}<span className="ml-0.5 font-normal text-muted-foreground">건</span></span>
        </div>
      ))}
    </section>
  );
}

export function MarketReview({
  range,
  workspace,
}: {
  range: Range;
  workspace: string;
}) {
  const { reported } = useReview(range, workspace);
  const actionClass =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
  return (
    <section
      id="policy-review"
      aria-label="시장 변화 근거 확인"
      className="min-w-0"
    >
      <div className="min-w-0 rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 border-b p-5 sm:p-6">
          <div>
            <h2 className="text-lg font-semibold">
              먼저 살펴볼 시장 변화
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              선택 기간의 최신 보도입니다. 중요도·영향 순위는 아닙니다.
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {reported.length}건
          </Badge>
        </div>
        <div className="divide-y px-5 sm:px-6">
          {reported.slice(0, 4).map((event) => (
            <article key={event.id} className="py-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <time>{event.startAt.slice(0, 10)}</time>
                <span aria-hidden>·</span>
                <span>{event.operator.toUpperCase()}</span>
                <Badge variant="outline">
                  {getEventType(event.types[0]).label}
                </Badge>
              </div>
              <Link
                className="group flex items-start justify-between gap-3 text-sm font-medium leading-6 hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
                href={`/analysis?events=${encodeURIComponent(event.id)}&start=${event.startAt.slice(0, 10)}&end=${event.startAt.slice(0, 10)}&workspace=${encodeURIComponent(workspace)}`}
              >
                {event.title}
                <ArrowUpRight
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                />
              </Link>
              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs leading-6 text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  {event.sourceName} · 원문 확인
                </a>
              )}
            </article>
          ))}
          {!reported.length && (
            <p className="py-8 text-sm leading-6 text-muted-foreground">
              이 기간에는 출처가 확인된 보도가 없습니다. 조회 기간을 넓히거나
              이벤트를 등록하세요.
            </p>
          )}
        </div>
        <div className="border-t px-5 py-3 sm:px-6">
          <Link
            className={actionClass + " text-primary hover:bg-primary/5"}
            href={`/?view=events&workspace=${encodeURIComponent(workspace)}`}
          >
            이벤트 전체 관리
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
