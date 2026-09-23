import { RefreshingAnalysis } from "@/components/market-performance/refreshing-analysis";
import { getEventType } from "@/components/market-performance/data";
import { EventProvenance } from "@/components/market-performance/event-provenance";
import { AnalysisBackLink } from "@/components/market-performance/analysis-navigation";
import { notFound } from "next/navigation";
import {
  EVENT_TYPES,
  EVENTS,
  formatAt,
  validateRange,
} from "@/components/market-performance/data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function EventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    start?: string;
    end?: string;
    workspace?: string;
    from?: string;
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const event = EVENTS.find((item) => item.id === id);
  if (!event) notFound();
  const range = { start: query.start ?? "", end: query.end ?? "" };
  const workspace = ["home", "air", "tds", "mvno"].includes(query.workspace ?? "")
    ? query.workspace!
    : "air";
  const backPath = query.from === "analysis" ? "/analysis" : "/";
  const back = validateRange(range)
    ? `${backPath}?workspace=${workspace}`
    : `${backPath}?start=${range.start}&end=${range.end}&workspace=${workspace}`;
  return (
    <RefreshingAnalysis mode="detail" refreshKey={id}><main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
      <AnalysisBackLink
        className="inline-block text-sm text-primary hover:underline"
        href={back}
      >
        ← {query.from === "analysis" ? "상세 분석" : workspace === "home" ? "사업 현황" : "현황"}으로
        돌아가기
      </AnalysisBackLink>
      <div className="space-y-3">
        <Badge variant="outline">이벤트 상세</Badge>
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        <div className="flex flex-wrap gap-2">
          {event.types.map((type) => (
            <span
              className="rounded px-2 py-1 text-xs font-medium"
              key={type}
              style={{
                backgroundColor: getEventType(type).color,
                color: getEventType(type).foreground,
              }}
            >
              {getEventType(type).label}
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          사업자 {event.operator} · 채널 {event.channel} · {event.id}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>이벤트 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <EventProvenance event={event} />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">시작일 · 필수</dt>
              <dd className="mt-1">{formatAt(event.startAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">종료일 · 선택</dt>
              <dd className="mt-1">
                {event.endAt
                  ? formatAt(event.endAt)
                  : "없음 · 단일 시점 이벤트"}
              </dd>
            </div>
          </dl>
          <p className="leading-relaxed">{event.summary}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">변경 전</p>
              <p className="mt-2 font-medium">{event.before}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground">변경 후</p>
              <p className="mt-2 font-medium">{event.after}</p>
            </div>
          </div>
          <div>
            <h2 className="font-medium">다음 확인 사항</h2>
            <p className="mt-2 text-sm">{event.next}</p>
          </div>
        </CardContent>
      </Card>
    </main></RefreshingAnalysis>
  );
}
