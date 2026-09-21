"use client";
import { getEventType } from "@/components/market-performance/data";

import { EventProvenance } from "@/components/market-performance/event-provenance";

import { EyeOff, Bell, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  EVENT_TYPES,
  eventOwnership,
  presetRange,
} from "@/components/market-performance/data";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useEventVisibility } from "@/components/market-performance/event-visibility";

export function Notifications() {
  const { events: catalog } = useEventCatalog();
  const events = [...catalog].sort(
    (a, b) => b.startAt.localeCompare(a.startAt) || a.id.localeCompare(b.id),
  );
  const mobile = useIsMobile();
  const params = useSearchParams();
  const workspace = params.get("workspace") ?? "air";
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [read, setRead] = useState<Set<string>>(() => new Set());
  const { hiddenIds, hideEvents, restoreEvent } = useEventVisibility();
  const archived = new Set(hiddenIds);
  const router = useRouter();
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("mars-event-notifications") ?? "{}",
      );
      const valid = (values: unknown) =>
        new Set<string>(
          Array.isArray(values)
            ? values.filter(
                (id): id is string =>
                  typeof id === "string" &&
                  events.some((event) => event.id === id),
              )
            : [],
        );
      setRead(valid(saved.read));
    } catch {
      /* Storage is optional for this demo. */
    }
    setRestored(true);
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(
        "mars-event-notifications",
        JSON.stringify({ read: [...read] }),
      );
    } catch {
      /* Keep in-memory state when storage is unavailable. */
    }
  }, [read, restored]);
  const unread = events.filter(
    (event) => !read.has(event.id) && !archived.has(event.id),
  ).length;
  const visible = events.filter((event) =>
    filter === "archived"
      ? archived.has(event.id)
      : !archived.has(event.id) && (filter !== "unread" || !read.has(event.id)),
  );
  const trigger = (
    <Button
      className="relative"
      aria-label={`이벤트 알림, 읽지 않음 ${unread}건`}
      size="icon-sm"
      variant="outline"
    >
      <Bell />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-2 -top-2 rounded-full border border-background bg-primary px-1 min-w-5 text-[9px] font-bold text-primary-foreground shadow-sm"
        >
          {unread}
        </span>
      )}
    </Button>
  );
  const body = (
    <>
      <div className="border-b px-4 py-3 space-y-2 shrink-0">
        <div className="flex items-center justify-between pr-5">
          <h2 className="text-sm font-semibold">시장·air 이벤트 알림</h2>
          <Button
            size="sm"
            variant="ghost"
            disabled={!unread}
            onClick={() => setRead(new Set(events.map((event) => event.id)))}
          >
            모두 읽음
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          전체 이벤트 {events.length}건 · 최신순
        </p>
        <div className="flex gap-1" aria-label="알림 분류">
          {[
            ["all", "전체"],
            ["unread", "읽지 않음"],
            ["archived", "숨기기"],
          ].map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={filter === value ? "secondary" : "ghost"}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}{" "}
              {value === "all"
                ? events.length - archived.size
                : value === "unread"
                  ? unread
                  : archived.size}
            </Button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length ? (
          <ol>
            {visible.map((event) => {
              const ownership = eventOwnership([event], workspace);
              return (
                <li
                  key={event.id}
                  className="flex gap-1 border-b last:border-0 hover:bg-accent/50"
                >
                  <Link
                    className="flex min-w-0 flex-1 gap-3 p-4 focus-visible:outline-2 focus-visible:outline-ring"
                    href={`/analysis?workspace=${encodeURIComponent(workspace)}&start=${presetRange("1M").start}&end=${presetRange("1M").end}`}
                    onClick={() => {
                      setRead((previous) => new Set([...previous, event.id]));
                      setOpen(false);
                    }}
                  >
                    <span
                      className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md text-sm font-bold text-white"
                      style={{ backgroundColor: ownership.color }}
                    >
                      E
                    </span>
                    <div className="min-w-0 space-y-1.5">
                      <p
                        className={`text-sm leading-snug ${read.has(event.id) ? "font-medium text-muted-foreground" : "font-semibold"}`}
                      >
                        {event.title}
                        {!read.has(event.id) && (
                          <span
                            className="ml-1 text-primary"
                            aria-label="읽지 않음"
                          >
                            ●
                          </span>
                        )}
                      </p>
                      <EventProvenance event={event} />
                      <p className="text-xs text-primary">
                        {event.types
                          .map((type) => getEventType(type).label)
                          .join(" · ")}
                      </p>
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {event.summary}
                      </p>
                    </div>
                  </Link>
                  <Button
                    className="mr-2 mt-3 shrink-0"
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${event.title} ${archived.has(event.id) ? "다시 표시" : "숨기기"}`}
                    onClick={() => {
                      if (archived.has(event.id)) restoreEvent(event.id);
                      else hideEvents([event.id]);
                      router.refresh();
                    }}
                  >
                    {archived.has(event.id) ? <RotateCcw /> : <EyeOff />}
                  </Button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {filter === "archived"
              ? "숨긴 이벤트가 없습니다."
              : filter === "unread"
                ? "읽지 않은 이벤트가 없습니다."
                : "표시할 이벤트가 없습니다."}
          </p>
        )}
      </div>
    </>
  );
  return mobile ? (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent
        side="bottom"
        className="flex h-[75dvh] max-h-[75dvh] flex-col overflow-hidden bg-background p-0"
      >
        <SheetTitle className="sr-only">이벤트 알림</SheetTitle>
        {body}
      </SheetContent>
    </Sheet>
  ) : (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent
        align="end"
        matchAnchorWidth={false}
        className="flex h-[65dvh] max-h-[680px] w-[420px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0"
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}
