import { RequirementsSummary, ReviewSummary } from "./requirements-summary";
import type { MarketEvent } from "./data";

export function EventProvenance({ event, compact = false }: { event: MarketEvent; compact?: boolean }) {
  if (compact) return <div className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="rounded-md bg-muted px-2 py-0.5 font-medium">{event.evidenceKind === "reported" ? "실제 보도" : event.evidenceKind === "demo" ? "가상 시나리오" : "수동 등록"}</span><span>{event.sourceName || "출처 미등록"}</span>{event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-4">원문 ↗</a>}</div><details><summary className="w-fit cursor-pointer hover:text-foreground">날짜·등록 근거</summary><div className="mt-2 rounded-lg bg-muted/40 p-3"><EventProvenance event={event}/></div></details></div>;

  return (
    <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
      {event.evidenceKind && <p className="font-medium text-foreground">{event.evidenceKind === "reported" ? "실제 보도 · 발표/계획 포함" : "가상 시나리오 · 실제 사례 아님"}</p>}
      <p>
        <span className="font-medium text-foreground">출처</span> ·{" "}
        {event.sourceName ||
          (event.id.startsWith("custom-")
            ? "미기록 · 기존 수동 등록"
            : "출처 미등록")}
      </p>
      {event.reviewScenario && <ReviewSummary review={event.reviewScenario}/>}
    {event.requirements && <RequirementsSummary requirements={event.requirements}/>}
      {event.targetChannels && <p>적용 채널 · {event.targetChannels.length?event.targetChannels.join(", "):"전체 채널"}</p>}
      {event.sourceType && <p>출처 종류 · {event.sourceType}</p>}
      {event.sourceUrl && (
        <p className="break-all"><a className="underline" href={event.sourceUrl} target="_blank" rel="noreferrer">원문 보기 · {event.sourceName}</a></p>
      )}
      <p>
        <span className="font-medium text-foreground">수행 주체</span> ·{" "}
        {event.operator} · {event.channel}
      </p>
      <p className="tabular-nums">
        <span className="font-medium text-foreground">{event.dateBasis === "publication" ? "발표일" : "발생 일시"}</span> ·{" "}
        {event.dateBasis === "publication" ? event.startAt.slice(0,10) : event.startAt.replace("T", " ")}
        {event.endAt ? ` ~ ${event.endAt.replace("T", " ")}` : ""}
      </p>
      {event.effectiveDate && <p>원문상 시행·발생일 · {event.effectiveDate}</p>}
      {event.recordedBy && (
        <p>
          등록자 · {event.recordedBy}
          {event.recordedAt ? ` · ${event.recordedAt.replace("T", " ")}` : ""}
        </p>
      )}
    </div>
  );
}
