"use client";
import { pivotCustomerChange } from "./pivot-direction";
import { TimelineMarkerIcon } from "./timeline-marker-icon";
import { Info } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  PopoverArrow,
} from "@/components/ui/popover";
import type { PivotPoint } from "./timeline-data";
import { getEventType } from "@/components/market-performance/data";

import Link from "next/link";
import { useState, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useEventVisibility } from "./event-visibility";
import { AnalysisMenu } from "./analysis-menu";
import styles from "./annotation.module.css";
import { useSearchParams } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  EVENT_TYPES,
  EVENT_OWNERSHIP,
  eventOwnership,
  type MarketEvent,
  type Range,
} from "./data";

export function AnnotationLabel({
  viewBox,
  events,
  range,
  label,
  onOpenChange,
  onSelect,
  highlight,
  laneOffset = 0,
  laneLabel = "",
  pivots,
  color,
}: {
  viewBox?: { x?: number; y?: number };
  events: MarketEvent[];
  range: Range;
  label: string;
  highlight?: string;
  laneOffset?: number;
  laneLabel?: string;
  pivots?: PivotPoint[];
  color?: string;
  onOpenChange: (open: boolean) => void;
  onSelect?: () => void;
}) {
  const query = useSearchParams();
  const workspace = query.get("workspace") ?? "air";
  const pivotDate=pivots?.map(p=>p.startAt.slice(0,10)).sort().at(-1);
  const pivotChange=pivotDate?pivotCustomerChange(pivotDate,query.get("channel")??undefined):undefined;
  const direction=pivots ? pivotChange===undefined?"회선 증감 미확인":pivotChange>0?"회선 증가":pivotChange<0?"회선 감소":"회선 변화 없음" : "";
  const ownership = eventOwnership(events, workspace);
  const markerColor = color ?? ownership.color;
  const count = pivots ? pivots.length : events.length;
  const kind = pivots ? "변곡점" : "이벤트";
  const { hideEvents } = useEventVisibility();
  const router = useRouter();
  const [hoverOpen, setHoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useLayoutEffect(
    () => () => {
      setHoverOpen(false);
      setMenuOpen(false);
    },
    [],
  );
  const analysisHref = `/analysis?start=${range.start}&end=${range.end}&workspace=${encodeURIComponent(workspace)}${pivots ? `&pivots=${encodeURIComponent(pivots.map(p=>p.startAt.slice(0,10)).join(","))}&events=${encodeURIComponent(events.map(e=>e.id).join(","))}` : `&events=${encodeURIComponent(events.map(e=>e.id).join(","))}`}`;
  if (viewBox?.x === undefined || viewBox?.y === undefined) return null;
  return (
    <g>
      <line
        x1={viewBox.x}
        x2={viewBox.x}
        y1={viewBox.y - 27 - laneOffset}
        y2={viewBox.y}
        stroke={markerColor}
        strokeDasharray="3 4"
        strokeOpacity={0.65}
        pointerEvents="none"
      />
      <foreignObject
        height={44}
        style={{ overflow: "visible" }}
        width={40}
        x={viewBox.x - 18}
        y={viewBox.y - 60 - laneOffset}
      >
        <div
          className="pl-1.5 pt-3"
          onPointerMove={(event) => event.stopPropagation()}
        >
          <Popover
            open={hoverOpen || menuOpen}
            onOpenChange={(open) => {
              setHoverOpen(open);
              onOpenChange(open || menuOpen);
            }}
          >
            <PopoverTrigger openOnHover delay={100} closeDelay={180}
              onClick={() => {onSelect?.();router.push(analysisHref);}}
              aria-label={`${laneLabel ? `${laneLabel} · ` : ""}${label} ${kind} ${count}건 ${direction} · 선택 기간 상세 분석`}
              className={`relative flex size-[21px] items-center justify-center rounded-md border-0 text-[10px] font-bold hover:brightness-110 focus-visible:outline-2 focus-visible:outline-ring ${highlight ? styles.highlightPop : ""}`}
              style={{
                background: highlight ? "var(--color-blue-600)" : markerColor,
                color: "var(--color-white)",
              }}
            >
              <TimelineMarkerIcon kind={pivots ? "pivot" : "event"} change={pivotChange}/>
              {count > 1 && <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-foreground bg-white px-0.5 text-[10px] font-bold text-black">{count}</span>}
            </PopoverTrigger>
            <PopoverPortal>
            <PopoverPositioner side="top" sideOffset={10} collisionAvoidance={{side:"none",align:"shift",fallbackAxisSide:"none"}} className="z-50">
            <PopoverPopup className={`w-[320px] max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-0 text-left text-popover-foreground shadow-lg ${styles.bubble}`} onPointerMove={event=>event.stopPropagation()}>
              <PopoverArrow className="data-[side=top]:-bottom-2 data-[side=top]:rotate-180" />
              <div className="max-h-(--available-height) overflow-y-auto overscroll-contain rounded-lg">
              <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5">
                <div className="text-[10px]">{pivots&&<p className="text-muted-foreground">{direction}{pivotChange!==undefined?` · ${pivotDate} 전일 대비 ${pivotChange>0?"+":""}${pivotChange.toLocaleString("ko-KR")}회선`:""}{count>1?" · 묶음의 최근 변곡점 기준":""}</p>}<p className="font-semibold">{laneLabel || kind} · {count}건</p><p className="text-[10px] text-muted-foreground">{label}</p></div>
                <AnalysisMenu href={analysisHref} label="이벤트 상세 메뉴"
                  onHide={pivots ? undefined : () => {onOpenChange(false);hideEvents(events.map(event=>event.id));router.refresh();}}
                  onOpenChange={open=>{setMenuOpen(open);if(!open)setHoverOpen(false);onOpenChange(open);}} />
              </div>
              <div className="space-y-2 px-3 py-2.5">
                {pivots && <p className="text-[10px] text-muted-foreground">강조 항목은 직전 7일 내 진행된 영향 검토 후보입니다. 인과관계는 미확정입니다.</p>}
                {highlight && <p className="text-[10px] text-amber-600">{highlight}</p>}
                {pivots ? pivots.slice(0,2).map(point => <div key={`${point.startAt}:${point.stage}`}>
                  <p className="line-clamp-1 text-[10px] font-semibold">{point.title}</p>
                  <p className="text-[10px] text-muted-foreground">{point.startAt.slice(0,10)}{point.endAt ? ` ~ ${point.endAt.slice(0,10)}` : ""} · {point.assessment === "ai" ? "AI 평가" : point.assessment === "demo" ? "AI 평가" : "수동 등록"}</p>
                </div>) : events.slice(0,2).map(event => <article key={event.id} className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="line-clamp-2 min-w-0 text-[10px] font-semibold leading-[1.5]">{event.title}</h4>
                    <div className="ml-auto flex max-w-[40%] shrink-0 flex-wrap justify-end gap-1">
                      {event.types.slice(0,2).map(type => <span key={type} className="whitespace-nowrap rounded px-1 py-0.5 text-[10px] font-medium" style={{backgroundColor:getEventType(type).color,color:getEventType(type).foreground}}>{getEventType(type).label}</span>)}
                    </div>
                  </div>
                  <p className="text-[10px] leading-[1.6] text-muted-foreground">{event.operator} · {event.startAt.slice(0,10)}{event.endAt ? ` ~ ${event.endAt.slice(0,10)}` : ""} · {event.evidenceKind === "reported" ? "실제 보도" : event.evidenceKind === "demo" ? "PATH 정책 이력" : "마케터 등록"}</p>
                  {events.length === 1 && <p className="line-clamp-2 text-[10px] leading-[1.6] text-muted-foreground">{event.summary}</p>}
                </article>)}
                {count > 2 && <p className="text-[10px] text-muted-foreground">외 {count-2}건 · 전체 내용은 상세보기에서 확인</p>}
              </div>
              <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[10px]">
                <span className="text-muted-foreground">근거·변경 내용 확인</span>
                <Link href={analysisHref} className="rounded font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring">상세보기 →</Link>
              </div>
              </div>
            </PopoverPopup>
            </PopoverPositioner>
            </PopoverPortal>
          </Popover>
        </div>
      </foreignObject>
    </g>
  );
}

export function EventTypeLegend({
  split = false,
  pivot: _pivot = false,
  workspace = "air",
}: {
  split?: boolean;
  pivot?: boolean;
  workspace?: string;
}) {
  const name = workspace.toUpperCase();
  const items = [
    { label: "업계 동향", description: "경쟁사·기타 사업자의 요금제 변경, 이벤트·프로모션 등 시장 변화", color: EVENT_OWNERSHIP.competitor.color, icon: "E" },
    { label: "변곡점", description: "실적 흐름의 주요 변화 지점", color: "var(--color-blue-600)", icon: "P" },
    { label: `${name} 이벤트`, description: `${name}의 정책·혜택·채널 변경`, color: EVENT_OWNERSHIP.own.color, icon: "E" },
    ...(!split ? [{ label: "혼합 이벤트", description: "우리와 외부 이벤트가 함께 포함", color: EVENT_OWNERSHIP.mixed.color, icon: "E" }] : []),
    { label: "정책", description: "정책 가정에 따른 예측 시뮬레이션", color: "var(--color-yellow-300)", icon: "experiment" },
  ];
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="이벤트 색상 안내"
        className="inline-flex items-center gap-1.5 rounded text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <Info className="size-3.5" aria-hidden="true" />
        이벤트 색상 안내
      </TooltipTrigger>
      <TooltipContent align="start" side="top" className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-0 text-popover-foreground shadow-lg">
        <div className="border-b px-3 py-2.5">
          <p className="text-xs font-semibold">타임라인 표시 안내</p>
          <p className="mt-1 text-[10px] text-muted-foreground">색상은 주체와 표시 종류를 구분합니다.</p>
        </div>
        <div className="space-y-2.5 p-3">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              <span className="flex size-[21px] shrink-0 items-center justify-center rounded-md text-[10px] font-bold" style={{backgroundColor: item.color, color: item.icon === "experiment" ? "var(--color-black)" : "var(--color-white)"}}>
                <TimelineMarkerIcon kind={item.icon === "experiment" ? "experiment" : item.icon === "P" ? "pivot" : "event"} change={1}/>
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium leading-4">{item.label}</p>
                <p className="text-[10px] leading-4 text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2 border-t bg-muted/25 px-3 py-2.5 text-[10px] leading-4 text-muted-foreground">
          <p><span className="mr-1.5 inline-flex min-w-4 justify-center rounded-full border bg-background px-1 font-semibold text-foreground">2</span>같은 시점에 묶인 건수 · 2건 이상 표시</p>
          <p><span className="mr-1.5 inline-flex size-4 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">N</span>새 정책 · 노출하거나 확인하면 해제</p>
          <p>호버: 요약·기간 표시 · 클릭: 상세 분석</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
