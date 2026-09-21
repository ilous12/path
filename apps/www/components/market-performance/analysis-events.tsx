"use client";
import { getEventType } from "@/components/market-performance/data";

import { EventProvenance } from "@/components/market-performance/event-provenance";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  EVENT_TYPES,
  eventOwnership,
  type MarketEvent,
  type Range,
} from "./data";

export function AnalysisEvents({
  events,
  range,
  workspace,
}: {
  events: MarketEvent[];
  range: Range;
  workspace: string;
}) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const filtered = events.filter(
    (event) =>
      filter === "all" ||
      (filter === "own") ===
        (eventOwnership([event], workspace).label === "우리 이벤트"),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["all", "전체"],
          ["own", workspace === "air" ? "air" : workspace.toUpperCase()],
          ["competitor", "경쟁사·기타"],
        ].map(([id, label]) => (
          <Button
            size="sm"
            variant={filter === id ? "secondary" : "ghost"}
            aria-pressed={filter === id}
            key={id}
            onClick={() => {
              setFilter(id);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length}건 · 최신순
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[650px] text-left text-sm">
          <thead className="border-y bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {[
                "발생일",
                "주체 / 이벤트",
                "변경 전 → 후",
                "다음 확인 사항",
              ].map((title) => (
                <th className="p-3 font-medium" key={title}>
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice((currentPage - 1) * 10, currentPage * 10)
              .map((event) => (
                <tr
                  className="border-b last:border-0 hover:bg-accent/40"
                  key={event.id}
                >
                  <td className="p-3 align-top text-xs tabular-nums whitespace-nowrap">
                    {event.startAt.slice(0, 10)}
                    {event.startAt.slice(0, 10) < range.start && (
                      <p className="mt-1 text-muted-foreground">이월 진행</p>
                    )}
                  </td>
                  <td className="p-3 align-top">
                    <Link
                      className="font-medium hover:text-primary hover:underline"
                      href={`/analysis?events=${encodeURIComponent(event.id)}&start=${range.start}&end=${range.end}&workspace=${workspace}`}
                    >
                      {event.title}
                    </Link>
                    <EventProvenance event={event} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.types
                        .map((type) => getEventType(type).label)
                        .join(" · ")}
                    </p>
                  </td>
                  <td className="p-3 align-top text-xs leading-relaxed">
                    <p className="text-muted-foreground">{event.before}</p>
                    <p className="mt-1 font-medium">→ {event.after}</p>
                  </td>
                  <td className="p-3 align-top text-xs leading-relaxed text-muted-foreground">
                    {event.next}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="p-8 text-center text-muted-foreground">
            선택 조건에 해당하는 이벤트가 없습니다.
          </p>
        )}
      </div>
      <div className="flex items-center justify-end gap-3">
        <span className="text-xs text-muted-foreground">
          {currentPage} / {pages} 페이지
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => setPage(currentPage - 1)}
        >
          이전
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage >= pages}
          onClick={() => setPage(currentPage + 1)}
        >
          다음
        </Button>
      </div>
    </div>
  );
}
