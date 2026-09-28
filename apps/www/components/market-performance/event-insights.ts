import { getEventType } from "@/components/market-performance/data";
import {
  buildPerformance,
  EVENTS,
  EVENT_TYPES,
  eventOwnership,
  groupEvents,
  type EventType,
  type MarketEvent,
  type Range,
} from "./data";

const number = (value: number) => value.toLocaleString("ko-KR");
const percent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
const highlights = (events: MarketEvent[]) => {
  const priority = new Set(["market-0903", "aiir-0912", "moyo-0912"]);
  const sorted = [...events].sort(
    (a, b) =>
      Number(priority.has(b.id)) - Number(priority.has(a.id)) ||
      b.startAt.localeCompare(a.startAt),
  );
  return (
    sorted
      .slice(0, 2)
      .map(
        (event) =>
          `${event.startAt.slice(5, 10).replace("-", "/")} ${event.title}`,
      )
      .join(" · ") + (sorted.length > 2 ? ` 외 ${sorted.length - 2}건` : "")
  );
};

export function buildEventInsights(
  range: Range,
  hiddenIds: readonly string[] = [],
  sourceEvents: MarketEvent[] = EVENTS,
  workspace = "aiir",
) {
  const events = groupEvents(range, "day", hiddenIds, sourceEvents)
    .flatMap((group) => group.events)
    .sort(
      (a, b) => b.startAt.localeCompare(a.startAt) || a.id.localeCompare(b.id),
    );
  const own = events.filter(
    (event) => eventOwnership([event], workspace).label === "우리 이벤트",
  );
  const rivals = events.filter((event) => !own.includes(event));
  const carried = events.filter(
    (event) => event.startAt.slice(0, 10) < range.start,
  ).length;
  const typeCounts = (
    [...new Set(events.flatMap((event) => event.types))] as EventType[]
  )
    .map((type) => ({
      type,
      label: getEventType(type).label,
      count: events.filter((event) => event.types.includes(type)).length,
    }))
    .filter((item) => item.count > 0);
  const result = {
    title: events.length
      ? `시장·${workspace} 변화 ${events.length}건 종합 요약`
      : "선택 기간 이벤트 없음",
    status: "관찰",
    events,
    ownCount: own.length,
    competitorCount: rivals.length,
    carried,
    typeCounts,
    occurrence: events.length
      ? `${range.start}~${range.end}에 ${workspace} ${own.length}건·경쟁사·기타 ${rivals.length}건이 관측되었습니다.${carried ? ` 이 중 ${carried}건은 이전에 시작해 기간 내 지속된 이벤트입니다.` : ""} ${highlights(rivals.length ? rivals : own)}.`
      : undefined,
    impact: undefined as string | undefined,
    response: own.length
      ? `${workspace} 측 변경 ${own.length}건: ${highlights(own)}. 개별 시장 이벤트와의 대응 관계는 별도 확인이 필요합니다.`
      : undefined,
    progress: undefined as string | undefined,
  };
  if (!events.length) return result;
  const daily = buildPerformance(range, "day");
  const first = daily[0];
  const last = daily[daily.length - 1];
  result.impact = `${events.length}건의 개별 실적 영향은 미확인입니다. 원인 가설은 변곡점 판단에서 확인하세요.`;
  result.progress = `일별 가입은 ${number(first.customers)} → ${number(last.customers)}회선(${percent((last.customers / first.customers - 1) * 100)})입니다.`;
  return result;
}
