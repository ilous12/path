"use client";
import { RegisteredExperiments } from "@/components/market-performance/alternative-manager";
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
  defaultStart,
  channel,
  analysisRange,
}: {
  compact?: boolean;
  defaultStart?: string;
  channel?: string;
  analysisRange?: {start:string;end:string};
}) {
  const { events } = useEventCatalog();
  const { hiddenIds, hideEvents, restoreEvent } = useEventVisibility();
  const workspace = useSearchParams().get("workspace") ?? "air";
  const [range, setRange] = useState(presetRange("1M"));
  const [draftRange, setDraftRange] = useState(range);
  const [keyword, setKeyword] = useState("");
  const [draftKeyword, setDraftKeyword] = useState("");
  const [evidenceFilter, setEvidenceFilter] = useState("all");
  const [filter, setFilter] = useState("visible");
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [initialKind, setInitialKind] = useState<"event" | "experiment">("event");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const filtered = events
    .filter(
      (event) =>
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
  return (
    <Dialog
      open={adding}
      onOpenChange={(open) => {
        if (open) setInitialKind("event");
        setAdding(open);
      }}
    >
      <div className={compact ? "" : "mx-auto w-full max-w-[1600px] space-y-6"}>
        <div className="flex items-center justify-between gap-4">
          <div hidden={compact}>
            <p className="mb-2 text-xs font-semibold tracking-widest text-primary">MARKET EVIDENCE</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">이벤트·실험 관리</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              시장 변화의 근거를 기록하고, 검증할 정책 실험을 관리하세요.
            </p>
          </div>
          <DialogTrigger
            render={
              <Button
                size="icon-sm"
                variant={compact ? "ghost" : "default"}
                aria-label="이벤트·실험 추가"
                title="이벤트·실험 추가"
              />
            }
          >
            <Plus className="size-4" />
          </DialogTrigger>
        </div>
        <DialogPortal>
          <DialogBackdrop className="z-50 bg-black/35 backdrop-blur-md" />
          <DialogViewport className="z-50 flex items-center justify-center p-3 sm:p-6">
            <DialogPopup className="relative flex h-[min(760px,92dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background text-foreground shadow-2xl animate-fade-zoom">
              {adding && <RegistrationWizard seed={{title:"",prompt:"",channels:channel?[channel]:[],analysisContext:{...(analysisRange ?? range),workspace,channels:channel?[channel]:[],reason:"타임라인 조회 조건"}}} initialKind={initialKind} workspace={workspace} defaultStart={defaultStart ?? range.end} onClose={()=>setAdding(false)} onSaved={(start,end)=>{
                const nextRange={start:start<range.start?start:range.start,end:end>range.end?end:range.end};
                setRange(nextRange);setDraftRange(nextRange);setKeyword("");setDraftKeyword("");setFilter("visible");setEvidenceFilter("all");setPage(0);
                setNotice("등록했습니다. 타임라인과 이벤트·실험 목록에 반영됩니다.");
              }} />}
            </DialogPopup>
          </DialogViewport>
        </DialogPortal>
        {!compact && (
          <Card>
            <CardHeader>
              <CardTitle>기간별 이벤트</CardTitle>
              <CardDescription>
                데이터 기준일 2026-09-21 · 최근 2년 실제 보도 200건 + 가상 시나리오 100건. 실제 보도는 발표일 기준이며 계획도 포함됩니다. 실적 차트는 합성값입니다.<br/>
                숨긴 이벤트는 차트와 영향 분석에서 제외됩니다. 다시 표시하면
                복원됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <label className="space-y-1 text-xs text-muted-foreground">
                  시작일
                  <Input
                    type="date"
                    required
                    min={MIN_DATE}
                    max={MAX_DATE}
                    value={draftRange.start}
                    onChange={(e) =>
                      setDraftRange({ ...draftRange, start: e.target.value })
                    }
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  종료일
                  <Input
                    type="date"
                    required
                    min={MIN_DATE}
                    max={MAX_DATE}
                    value={draftRange.end}
                    onChange={(e) =>
                      setDraftRange({ ...draftRange, end: e.target.value })
                    }
                  />
                </label>
                <label className="min-w-48 flex-1 space-y-1 text-xs text-muted-foreground">
                  이벤트 검색
                  <Input
                    value={draftKeyword}
                    onChange={(e) => setDraftKeyword(e.target.value)}
                    placeholder="제목·출처·주체·채널 검색"
                  />
                </label>
                <Button type="submit">
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
                {["1W", "1M", "1Y", "2Y"].map((preset) => (
                  <Button
                    key={preset}
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const r = presetRange(preset);
                      setRange(r);
                      setDraftRange(r);
                      setError("");
                      setPage(0);
                    }}
                  >
                    {{ "1W": "1주", "1M": "1개월", "1Y": "1년", "2Y": "최근 2년" }[preset]}
                  </Button>
                ))}
                <label className="flex items-center gap-2 text-sm">데이터 구분<select className="rounded-md border bg-background px-3 py-2" value={evidenceFilter} onChange={e=>{setEvidenceFilter(e.target.value);setPage(0);}}><option value="all">전체</option><option value="reported">실제 보도</option><option value="demo">가상 시나리오</option></select></label>
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
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-3">기간</th>
                      <th>주체·채널</th>
                      <th>이벤트</th>
                      <th className="text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered
                      .slice(current * 10, current * 10 + 10)
                      .map((event) => (
                        <tr key={event.id} className="border-b last:border-0">
                          <td className="py-4 pr-4 whitespace-nowrap tabular-nums">
                            {event.startAt.slice(0, 10)}
                            {event.endAt && (
                              <p className="text-xs text-muted-foreground">
                                ~ {event.endAt.slice(0, 10)}
                              </p>
                            )}
                          </td>
                          <td className="pr-4">
                            <p className="font-medium">{event.operator}</p>
                            <p className="text-xs text-muted-foreground">
                              {event.channel}
                            </p>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm font-semibold leading-6">{event.title}</p>
                            <EventProvenance event={event} compact />
                            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                              {event.summary}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {event.types.map((type) => (
                                <Badge key={type} variant="outline">
                                  {getEventType(type).label}
                                </Badge>
                              ))}
                              {hiddenIds.includes(event.id) && (
                                <Badge variant="secondary">숨김</Badge>
                              )}
                            </div>
                          </td>
                          <td className="text-right">
                            {event.operator.toLowerCase() === "air" && (
                              <Button size="sm" variant="outline" onClick={()=>{setInitialKind("experiment");setAdding(true);}}>실험</Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              aria-label={`${event.title} ${hiddenIds.includes(event.id) ? "다시 표시" : "숨기기"}`}
                              onClick={() => {
                                if (hiddenIds.includes(event.id)) {
                                  restoreEvent(event.id);
                                  setNotice("이벤트를 다시 표시했습니다.");
                                } else {
                                  hideEvents([event.id]);
                                  setNotice(
                                    "이벤트를 숨기고 영향 분석에서 제외했습니다.",
                                  );
                                }
                              }}
                            >
                              {hiddenIds.includes(event.id) ? (
                                <RotateCcw className="size-4" />
                              ) : (
                                <EyeOff className="size-4" />
                              )}
                              {hiddenIds.includes(event.id)
                                ? "다시 표시"
                                : "숨기기"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    검색 조건에 해당하는 이벤트가 없습니다.
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {filtered.length}건 · {current + 1} / {pages} 페이지
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!current}
                    onClick={() => setPage(current - 1)}
                  >
                    이전
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={current === pages - 1}
                    onClick={() => setPage(current + 1)}
                  >
                    다음
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {!compact&&<RegisteredExperiments start={range.start} end={range.end} keyword={keyword}/>}
      </div>
    </Dialog>
  );
}
