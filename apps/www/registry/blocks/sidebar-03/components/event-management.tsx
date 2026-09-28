"use client";
import { AnalysisRangeControl } from "@/components/market-performance/analysis-range-control";
import { useHistoryViewState } from "@/components/market-performance/history-view-state";
import { WorkspaceHeader } from "@/components/market-performance/workspace-header";
import { PageEntry } from "@/components/market-performance/page-entry";
import { RecordMenu } from "@/components/market-performance/record-menu";
import { RegistrationWizard } from "@/components/market-performance/registration-wizard";
import { getEventType } from "@/components/market-performance/data";

import { EventProvenance } from "@/components/market-performance/event-provenance";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, EyeOff, RotateCcw, Search } from "lucide-react";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useEventVisibility } from "@/components/market-performance/event-visibility";
import {
  EVENT_TYPES,
  MIN_DATE,
  MAX_DATE,
  presetRange,
  validateRange,
} from "@/components/market-performance/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogBackdrop,
  DialogViewport,
  DialogPopup,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function EventManagement({
  compact = false,
  promotionsOnly = false,
  registrationKind = "event",
  defaultStart,
  channel,
  analysisRange,
}: {
  compact?: boolean;
  promotionsOnly?: boolean;
  registrationKind?: "event" | "experiment";
  defaultStart?: string;
  channel?: string;
  analysisRange?: { start: string; end: string };
}) {
  const { events } = useEventCatalog();
  const { hiddenIds, hideEvents, restoreEvent } = useEventVisibility();
  const params = useSearchParams();
  const workspace = params.get("workspace") ?? "aiir";
  const [range, setRange] = useHistoryViewState("events:range", () => { const requested = { start: params.get("start") ?? "", end: params.get("end") ?? "" }; return validateRange(requested) ? presetRange("1M") : requested; });
  const [draftRange, setDraftRange] = useHistoryViewState("events:draftRange", range);
  const [keyword, setKeyword] = useHistoryViewState("events:keyword", "");
  const [draftKeyword, setDraftKeyword] = useHistoryViewState("events:draftKeyword", "");
  const [typeFilter, setTypeFilter] = useHistoryViewState("events:typeFilter", params.get("type") ?? "all");
  const availableTypes = [
    ...new Set([
      ...Object.keys(EVENT_TYPES),
      ...events.flatMap((event) => event.types),
    ]),
  ];
  const [evidenceFilter, setEvidenceFilter] = useHistoryViewState("events:evidenceFilter", "all");
  const [filter, setFilter] = useHistoryViewState("events:filter", "visible");
  const [page, setPage] = useHistoryViewState("events:page", 0);
  const [adding, setAdding] = useState(false);
  const [initialKind, setInitialKind] = useState<"event" | "experiment">(
    "event",
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = events
    .filter(
      (event) =>
        (!promotionsOnly || event.types.includes("campaign")) &&
        (typeFilter === "all" || event.types.includes(typeFilter)) &&
        (evidenceFilter === "all" || event.evidenceKind === evidenceFilter) &&
        event.startAt.slice(0, 10) <= range.end &&
        (event.endAt ?? event.startAt).slice(0, 10) >= range.start &&
        (filter === "all" ||
          hiddenIds.includes(event.id) === (filter === "hidden")) &&
        `${event.title} ${event.operator} ${event.channel} ${event.summary} ${event.sourceName ?? ""}`
          .toLowerCase()
          .includes(keyword.toLowerCase()),
    )
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages - 1);
  const Header = compact ? "div" : WorkspaceHeader;
  return (
    <Dialog
      open={adding}
      onOpenChange={(open) => {
        if (open) setInitialKind(registrationKind);
        setAdding(open);
      }}
    >
      <div className={compact ? "" : "mx-auto w-full max-w-[1600px] space-y-6"}>
        <Header>
          <div hidden={compact}>
            <h1 className="text-2xl font-semibold tracking-tight">
              {promotionsOnly ? "프로모션/행사 검색" : "업계 동향 검색"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              시장 변화의 핵심 내용과 출처를 확인하세요.
            </p>
          </div>
          <DialogTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={
                  registrationKind === "experiment"
                    ? "캠페인 추가"
                    : "업계 동향 추가"
                }
                title={registrationKind === "experiment" ? "캠페인 추가" : "업계 동향 추가"}
              />
            }
          >
            <Plus className="size-4" />
          </DialogTrigger>
        </Header>
        <DialogPortal>
          <DialogBackdrop className="z-50 bg-black/35 backdrop-blur-md" />
          <DialogViewport className="z-50 flex items-center justify-center p-3 sm:p-6">
            <DialogPopup className="relative flex h-[min(760px,92dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl animate-fade-zoom">
              {adding && (
                <RegistrationWizard
                  seed={{
                    title: "",
                    prompt: "",
                    channels: channel ? [channel] : [],
                    analysisContext: {
                      ...(analysisRange ?? range),
                      workspace,
                      channels: channel ? [channel] : [],
                      reason: "타임라인 조회 조건",
                    },
                  }}
                  initialKind={initialKind}
                  workspace={workspace}
                  defaultStart={defaultStart ?? range.end}
                  onClose={() => setAdding(false)}
                  onSaved={(start, end) => {
                    const nextRange = {
                      start: start < range.start ? start : range.start,
                      end: end > range.end ? end : range.end,
                    };
                    setRange(nextRange);
                    setDraftRange(nextRange);
                    setKeyword("");
                    setDraftKeyword("");
                    setFilter("visible");
                    setEvidenceFilter("all");
                    setTypeFilter("all");
                    setPage(0);
                    setNotice(
                      "등록했습니다. 타임라인과 이벤트·정책 목록에 반영됩니다.",
                    );
                  }}
                />
              )}
            </DialogPopup>
          </DialogViewport>
        </DialogPortal>
        {!compact && (
          <PageEntry><Card>
            <CardHeader>
              <CardTitle>기간별 이벤트</CardTitle>
              <CardDescription>
                데이터 기준일 2026-09-21 · 최근 2년 보도 200건과 PATH 정책
                이력 100건. 보도는 발표일 기준이며 계획도 포함됩니다.
                <br />
                숨긴 이벤트는 차트와 영향 분석에서 제외됩니다. 다시 표시하면
                복원됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnalysisRangeControl range={range} onChange={r=>{setRange(r);setDraftRange(r);setError("");setPage(0);}} />
              <form
                className="flex flex-wrap items-end gap-3 rounded-xl bg-muted/30 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const invalid = validateRange(draftRange);
                  setError(invalid ?? "");
                  if (invalid) return;
                  setRange(draftRange);
                  setKeyword(draftKeyword.trim());
                  setPage(0);
                }}
              >
                <label className="min-w-48 flex-1 space-y-1 text-xs text-muted-foreground">
                  이벤트 검색
                  <Input
                    value={draftKeyword}
                    onChange={(e) => setDraftKeyword(e.target.value)}
                    placeholder="제목·출처·주체·채널 검색"
                  />
                </label>
                <Button type="submit" size="sm" variant="secondary">
                  <Search className="size-4" />
                  검색
                </Button>
              </form>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 text-xs">
                  이벤트 유형
                  <select
                    aria-label="이벤트 유형 필터"
                    className="h-9 rounded-md border bg-background px-2 text-sm"
                    value={typeFilter}
                    onChange={(e) => {
                      setTypeFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="all">모든 유형</option>
                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {getEventType(type).label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  데이터 구분
                  <select
                    className="rounded-md border bg-background px-3 py-2"
                    value={evidenceFilter}
                    onChange={(e) => {
                      setEvidenceFilter(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="all">전체</option>
                    <option value="reported">실제 보도</option>
                    <option value="demo">PATH 정책 이력</option>
                  </select>
                </label>
                <div className="ml-auto flex gap-1">
                  {[
                    ["visible", "표시 중"],
                    ["hidden", "숨기기"],
                    ["all", "전체"],
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={filter === value ? "secondary" : "ghost"}
                      aria-pressed={filter === value}
                      onClick={() => {
                        setFilter(value);
                        setPage(0);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <p role="status" className="text-sm text-primary">
                {notice}
              </p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered
                  .slice(current * 10, current * 10 + 10)
                  .map((event) => (
                    <article
                      key={event.id}
                      className="flex flex-col rounded-xl border bg-background p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-1">
                        {event.types.map((type) => (
                          <Badge key={type} variant="outline">
                            {getEventType(type).label}
                          </Badge>
                        ))}
                      </div>
                      <h2 className="line-clamp-2 text-sm font-semibold leading-relaxed">
                        {event.title}
                      </h2>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {event.operator} · {event.channel}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.startAt.slice(0, 10)}
                        {event.endAt ? ` ~ ${event.endAt.slice(0, 10)}` : ""}
                      </p>
                      <p className="my-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {event.summary}
                      </p>
                      <EventProvenance event={event} compact />
                      <div className="mt-auto flex justify-end pt-3">
                        <RecordMenu
                          label={event.title}
                          actions={[
                            {
                              label: "상세보기",
                              href: `/analysis?${new URLSearchParams({ workspace, start: range.start, end: range.end, events: event.id })}`,
                            },
                            {
                              label: hiddenIds.includes(event.id)
                                ? "다시 표시"
                                : "숨기기",
                              onClick: () =>
                                hiddenIds.includes(event.id)
                                  ? restoreEvent(event.id)
                                  : hideEvents([event.id]),
                            },
                          ]}
                        />
                      </div>
                    </article>
                  ))}
              </div>
              {!filtered.length && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  조건에 맞는 이벤트가 없습니다.
                </p>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {filtered.length}건 · {current + 1} / {pages} 페이지
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={!current}
                    onClick={() => setPage(current - 1)}
                  >
                    이전
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={current === pages - 1}
                    onClick={() => setPage(current + 1)}
                  >
                    다음
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card></PageEntry>
        )}
      </div>
    </Dialog>
  );
}
