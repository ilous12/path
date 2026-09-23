"use client";
import { chartDisplayRange, chartPaddingLabel } from "@/components/market-performance/chart-period";
import { appliesToChannel, channelPerformance } from "@/components/market-performance/channel-scope";
import { hasChannelData } from "@/components/market-performance/channel-data";
import { pivotPeriod, withPivotInfluence } from "@/components/market-performance/timeline-data";
import { AnalysisMenu } from "@/components/market-performance/analysis-menu";
import {
  groupTimelineLanes,
  clusterTimelinePivots,
  type PivotPoint,
  EVENT_TIMELINE_LAYOUT,
} from "@/components/market-performance/timeline-data";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useAnalysisExclusions } from "@/components/market-performance/use-analysis-exclusions";

import * as React from "react";
import { useAlternatives } from "@/components/market-performance/alternative-store";
import { dayShift, alternativeOverlay, connectExperimentLines, experimentEndpoint } from "@/components/market-performance/alternative-model";
import {
  AlternativeManager,
  AlternativeLaneMarker,
} from "@/components/market-performance/alternative-manager";
import { useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  Rectangle,
  ReferenceLine,
  ReferenceDot,
  XAxis,
  YAxis,
} from "recharts";
import {
  AnnotationLabel,
  EventTypeLegend,
} from "@/components/market-performance/annotation";
import {
  panRange,
  daysBetween,
  MIN_DATE,
  MAX_DATE,
  zoomRange,
  bucketKey,
  buildPerformance,
  buildTurningPoints,
  eventOwnership,
  grainFor,
  groupEvents,
  type Range,
} from "@/components/market-performance/data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function periodAreaShape(props: React.ComponentProps<typeof Rectangle>) {
  const width = Math.max(6, props.width ?? 0);
  return <Rectangle {...props} x={(props.x ?? 0) - (width - (props.width ?? 0)) / 2} width={width} />;
}

const chartConfig = {
  customers: { color: "var(--chart-4)", label: "회선" },
  cancellations: { color: "var(--chart-2)", label: "해지" },
} satisfies ChartConfig;

export function ChartMixedAxes({
  range,
  channel,
  onRangeChange,
  periodControl,
}: {
  range: Range;
  channel?: string;
  onRangeChange: (range: Range) => void;
  periodControl?: React.ReactNode;
}) {
  const { events } = useEventCatalog();
  const alternativeStore = useAlternatives();
  const workspace = useSearchParams().get("workspace") ?? "air";
  const workspaceName = workspace === "air" ? "air" : workspace.toUpperCase();
  const scopeLabel = channel ? `${workspace.toUpperCase()} · ${channel}` : workspaceName;
  const hiddenIds = useAnalysisExclusions();
  const [activeSeries, setActiveSeries] = React.useState<string[]>([
    "customers",
    "cancellations",
    "events",
  ]);
  const [openExperimentKey, setOpenExperimentKey] = React.useState<string>();
  React.useEffect(() => setOpenExperimentKey(undefined), [range.start, range.end, workspace]);
  const [selectedGroup, setSelectedGroup] = React.useState<string>();
  const [hoveredExperimentKey, setHoveredExperimentKey] =
    React.useState<string>();
  React.useLayoutEffect(() => () => setSelectedGroup(undefined), []);
  const chartRegionRef = React.useRef<HTMLDivElement>(null);
  const [plotWidth, setPlotWidth] = React.useState(700);
  React.useEffect(() => {
    const region = chartRegionRef.current;
    if (!region) return;
    const measure = () =>
      setPlotWidth(Math.max(150, region.getBoundingClientRect().width - 180));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(region);
    return () => observer.disconnect();
  }, []);
  const zoomState = React.useRef({ range, onRangeChange });
  React.useEffect(() => { zoomState.current = { range, onRangeChange }; }, [range, onRangeChange]);
  React.useEffect(() => {
    const region = chartRegionRef.current;
    if (!region) return;
    let delta = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || !event.deltaY) return;
      event.preventDefault();
      event.stopPropagation();
      delta += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? region.clientHeight : 1);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const {range: current, onRangeChange: change} = zoomState.current;
        const next = zoomRange(current, delta);
        delta = 0;
        if (next.start === current.start && next.end === current.end) return;
        setSelectedGroup(undefined);
        setHoveredExperimentKey(undefined);
        setOpenExperimentKey(undefined);
        change(next);
      }, 160);
    };
    region.addEventListener("wheel", onWheel, {passive:false});
    return () => {region.removeEventListener("wheel", onWheel); if(timer) clearTimeout(timer);};
  }, []);
  const [dragging, setDragging] = React.useState(false);
  React.useEffect(() => {
    const region = chartRegionRef.current;
    if (!region) return;
    let drag: {id:number;x:number;range:Range;width:number;moved:boolean} | null = null;
    let frame = 0;
    let nextRange: Range | undefined;
    const flush = () => {
      if (!nextRange) return;
      const current=zoomState.current.range;
      if(current.start!==nextRange.start || current.end!==nextRange.end) zoomState.current.onRangeChange(nextRange);
      nextRange=undefined;
    };
    const down = (e: PointerEvent) => {
      if(e.button!==0 || e.pointerType==="touch" || (e.target as Element).closest("button,a,input,select,foreignObject")) return;
      e.preventDefault();
      drag={id:e.pointerId,x:e.clientX,range:zoomState.current.range,width:Math.max(100,region.clientWidth-120),moved:false};
      region.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if(!drag || e.pointerId!==drag.id) return;
      const distance=e.clientX-drag.x;
      if(Math.abs(distance)<4 && !drag.moved) return;
      e.preventDefault(); drag.moved=true; setDragging(true);
      setSelectedGroup(undefined);setHoveredExperimentKey(undefined);setOpenExperimentKey(undefined);
      nextRange=panRange(drag.range,-distance/drag.width*daysBetween(drag.range.start,drag.range.end));
      cancelAnimationFrame(frame);frame=requestAnimationFrame(flush);
    };
    const up = (e: PointerEvent) => {
      if(!drag || e.pointerId!==drag.id) return;
      cancelAnimationFrame(frame);flush();drag=null;setDragging(false);
      if(region.hasPointerCapture(e.pointerId)) region.releasePointerCapture(e.pointerId);
    };
    const context = (e: MouseEvent) => {if(e.ctrlKey || drag) e.preventDefault();};
    region.addEventListener("pointerdown",down);region.addEventListener("pointermove",move);region.addEventListener("pointerup",up);region.addEventListener("pointercancel",up);region.addEventListener("lostpointercapture",up);region.addEventListener("contextmenu",context);
    return () => {cancelAnimationFrame(frame);region.removeEventListener("pointerdown",down);region.removeEventListener("pointermove",move);region.removeEventListener("pointerup",up);region.removeEventListener("pointercancel",up);region.removeEventListener("lostpointercapture",up);region.removeEventListener("contextmenu",context);};
  }, []);
  const overview = React.useMemo(() => channel ? channelPerformance({start:MIN_DATE,end:MAX_DATE},channel,"day") : buildPerformance({start:MIN_DATE,end:MAX_DATE},"day"),[channel]);
  const displayRange = React.useMemo(()=>chartDisplayRange(range),[range]);
  const grain = "day" as const;
  const data = React.useMemo(() => channel ? channelPerformance({start:displayRange.start<MIN_DATE?MIN_DATE:displayRange.start,end:displayRange.end>MAX_DATE?MAX_DATE:displayRange.end}, channel, grain) : buildPerformance({start:displayRange.start<MIN_DATE?MIN_DATE:displayRange.start,end:displayRange.end>MAX_DATE?MAX_DATE:displayRange.end},grain), [displayRange,channel]);
  const knownAlternatives = alternativeStore.alternatives.filter(
    (a) =>
      !a.eventId ||
      events.some(
        (e) =>
          e.id === a.eventId &&
          e.operator.toLowerCase() === "air" &&
          !hiddenIds.includes(e.id),
      ),
  );
  const showAlternativeLane = ["air", "tds", "mvno"].includes(workspace);
  const visibleExperiments =
    showAlternativeLane
      ? knownAlternatives.filter(
          (a) => a.status === "applied" && (a.workspace ?? "air") === workspace && (!channel || appliesToChannel(a,channel)) && a.start <= displayRange.end && dayShift(a.start, Math.max(a.applyDays ?? a.days,a.days)-1) >= displayRange.start,
        )
      : [];
  const chartEnd = displayRange.end;
  const previewExperiments = activeSeries.includes("events")
    ? visibleExperiments.filter(a => hasChannelData(a.targetChannels) && bucketKey(a.start < displayRange.start ? displayRange.start : a.start, grain) === hoveredExperimentKey)
    : [];
  const scopedPreviews = channel ? previewExperiments.map(a=>({...a,targetChannels:[channel],demoCustomerForecast:undefined,demoEvaluationDate:undefined})) : previewExperiments;
  // Separate scenarios: never replace observed data or add experiment effects together.
  const timelineRows = connectExperimentLines(alternativeOverlay(
    scopedPreviews.map(a => ({...a, status: "applied" as const})),
    displayRange, grain, {extendRange: false},
  ).rows.map(row=>{const actual=data.find(actual=>actual.key===row.key);return {...row,...(actual??Object.fromEntries(["customers","cancellations","revenue","netProfit","expenses","profitMargin"].map(key=>[key,null])))};}), scopedPreviews);
  const edgePadding = 0;
  const markerPlotWidth = Math.max(1, plotWidth);
  React.useEffect(
    () => setHoveredExperimentKey(undefined),
    [range.start, range.end, workspace],
  );
  const alternativeMarkers = new Map<
    string,
    { eventId?: string; count: number }
  >();
  visibleExperiments.forEach((a) => {
    const key = bucketKey(a.start < displayRange.start ? displayRange.start : a.start, grain);
    const old = alternativeMarkers.get(key);
    alternativeMarkers.set(key, {
      eventId: a.eventId,
      count: (old?.count ?? 0) + 1,
    });
  });
  // Both count series share a fixed scale for the selected range, even when toggled off.
  const countScale = React.useMemo(() => {
    const maximum = Math.max(
      1,
      ...timelineRows.map((row) => Math.max(Number(row.customers ?? 0), Number(row.cancellations ?? 0), ...previewExperiments.flatMap(a => [Number(row[`${a.id}_customers`] ?? 0), Number(row[`${a.id}_cancellations`] ?? 0)]))),
    );
    // Headroom prevents a maximum-valued line from being clipped at the plot edge.
    const rawStep = maximum * 1.12 / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const factor = [1, 1.25, 1.5, 2, 2.5, 5, 10].find(value => value >= rawStep / magnitude) ?? 10;
    const step = Math.max(1, Math.ceil(factor * magnitude));
    return {
      maximum: step * 4,
      ticks: Array.from({ length: 5 }, (_, index) => index * step),
    };
  }, [timelineRows, previewExperiments]);
  const rawGroups = React.useMemo(
    () => groupEvents(displayRange, grain, hiddenIds, channel ? events.filter(e=>e.operator.toLowerCase()!==workspace || appliesToChannel(e,channel)) : events),
    [displayRange, grain, hiddenIds, events, channel,workspace],
  );
  const turningPoints = React.useMemo(
    () => buildTurningPoints({start:displayRange.start<MIN_DATE?MIN_DATE:displayRange.start,end:displayRange.end>MAX_DATE?MAX_DATE:displayRange.end}, hiddenIds),
    [displayRange, hiddenIds],
  );
  const groups = React.useMemo(
    () =>
      groupTimelineLanes(
        rawGroups,
        timelineRows.map((row) => String(row.key)),
        markerPlotWidth,
        turningPoints,
        EVENT_TIMELINE_LAYOUT,
        workspaceName,
      ),
    [rawGroups, timelineRows, markerPlotWidth, turningPoints, workspaceName],
  );
  const pivots = React.useMemo(() => {
    const points = new Map<string, { key: string; stages: PivotPoint[] }>(
      turningPoints.map((point) => [
        point.key,
        {
          key: point.key,
          stages: [...point.stages].map((stage) => ({
            startAt: `${stage.date}T00:00`,
            assessment: "demo" as const,
            title: stage.title,
            stage: String(stage.stage),
          })),
        },
      ]),
    );
    for (const group of rawGroups) {
      const explicit = group.events
        .filter((event) => event.types.includes("pivot"))
        .map((event) => ({
          startAt: event.startAt,
          endAt: event.endAt,
          assessment: "manual" as const,
          rationale: event.summary,
          title: event.title,
          stage: "변곡점",
        }));
      if (!explicit.length) continue;
      const existing = points.get(group.key);
      points.set(group.key, {
        key: group.key,
        stages: [...(existing?.stages ?? []), ...explicit],
      });
    }
    const influence = withPivotInfluence([...points.values()].flatMap(point => point.stages), displayRange.end);
    let offset = 0;
    const resolved = [...points.values()].map(point => {
      const stages = influence.slice(offset, offset + point.stages.length);
      offset += point.stages.length;
      return {...point, stages};
    });
    return clusterTimelinePivots(
      resolved.sort((a, b) => a.key.localeCompare(b.key)),
      timelineRows.map((row) => String(row.key)),
      markerPlotWidth,
    );
  }, [turningPoints, rawGroups, timelineRows, markerPlotWidth, displayRange.end]);
  const activePivot = pivots.find(group => selectedGroup === `pivot:${group.key}`);
  const nearPivot = (start: string, end?: string) => !!activePivot?.pivots.some(p => {
    const date = p.startAt.slice(0,10);
    return start.slice(0,10) <= date && (end ?? start).slice(0,10) >= dayShift(date,-7);
  });
  const pivotLayout = EVENT_TIMELINE_LAYOUT === "pivot";
  const showEvents = activeSeries.includes("events");
  const splitEvents = showEvents && EVENT_TIMELINE_LAYOUT !== "combined";
  const dateLabel = (key: string) =>
    grain === "day"
      ? key.slice(5).replace("-", "/")
      : grain === "month"
        ? key.replace("-", "/")
        : `${key}년`;
  return (
    <Card className="w-full gap-0 overflow-hidden rounded-xl border shadow-none">
      <div className="flex flex-col">
        <CardHeader className="flex flex-col items-stretch gap-3 p-4 xl:p-5">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-lg">{channel ? `${scopeLabel} · ` : ""}시장·실적 타임라인</CardTitle>
            <div className="ml-auto flex max-w-full flex-wrap items-center gap-4">
              <ToggleGroup
                aria-label="차트 표시 항목"
                multiple
                onValueChange={setActiveSeries}
                size="sm"
                value={activeSeries}
                variant="outline"
              >
                {Object.entries(chartConfig).map(([key, config]) => (
                  <ToggleGroupItem
                    aria-label={`${config.label} 표시`}
                    className="min-h-8 gap-1.5 text-sm cursor-pointer"
                    key={key}
                    value={key}
                  >
                    <div
                      className="h-2 w-2 rounded-[2px]"
                      style={{ backgroundColor: config.color }}
                    />
                    {config.label}
                  </ToggleGroupItem>
                ))}
                <ToggleGroupItem
                  aria-label="업계 동향 표시"
                  className="min-h-8 cursor-pointer gap-1.5 text-sm"
                  value="events"
                >
                  업계 동향
                </ToggleGroupItem>
              </ToggleGroup>
              {periodControl && <div className="ml-1 flex shrink-0 items-center">{periodControl}</div>}
              {!channel && <div className="flex shrink-0 items-center gap-1 border-l pl-3">
                  <AnalysisMenu label="타임라인 상세보기 메뉴" href={`/analysis?start=${range.start}&end=${range.end}&workspace=${encodeURIComponent(workspace)}`} />
              </div>}
            </div>
          </div>
          <CardDescription>
            관측 실적은 실선, 정책 예측은 노란색(회선)·보라색(해지) 점선입니다. 정책에 마우스를 올리면 끝점에 시작 직전 대비 증감률이 표시됩니다. Ctrl + 휠: 확대·축소 · 차트 드래그: 기간 이동.
          </CardDescription>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {range.start} ~ {range.end} ·{" "}
              {{ day: "일간", month: "월간", year: "연간" }[grain]} 집계 · 표시 {displayRange.start} ~ {displayRange.end} ({chartPaddingLabel(range)})
            </span>
            <EventTypeLegend
              split={EVENT_TIMELINE_LAYOUT !== "combined"}
              pivot={pivotLayout}
              workspace={scopeLabel}
            />
          </div>
        </CardHeader>
        <CardContent
          className="shrink-0 flex flex-col gap-4"
        >
          <div ref={chartRegionRef} className={dragging ? "cursor-grabbing select-none" : "cursor-grab select-none"} style={{touchAction:"pan-y"}}>
          <ChartContainer
            className="mars-timeline-chart w-full flex-none aspect-auto"
            config={chartConfig}
          >
            <ComposedChart
              data={timelineRows}
              margin={{
                bottom: 0,
                left: 2,
                right: 2,
                top: showEvents
                  ? splitEvents
                    ? pivotLayout
                      ? showAlternativeLane
                        ? 200
                        : 156
                      : 112
                    : 68
                  : 8,
              }}
            >
              {splitEvents && (
                <g
                  className="fill-foreground text-xs font-semibold"
                  pointerEvents="none"
                  aria-hidden="true"
                >
                  <text x={4} y={38}>
                    업계 동향
                  </text>
                  {pivotLayout && (
                    <text x={4} y={82}>
                      {channel ? `${channel} · 변곡점` : "변곡점"}
                    </text>
                  )}
                  <text x={4} y={pivotLayout ? 126 : 82}>
                    {scopeLabel}
                  </text>
                  {showAlternativeLane && pivotLayout && (
                    <text x={4} y={170}>
                      {channel ? `${channel} · 정책` : "정책"}
                    </text>
                  )}
                  {(pivotLayout
                    ? showAlternativeLane
                      ? [56, 100, 144, 188]
                      : [56, 100, 144]
                    : [56, 100]
                  ).map((y) => (
                    <line
                      key={y}
                      x1={2}
                      x2="100%"
                      y1={y}
                      y2={y}
                      stroke="var(--muted-foreground)"
                      strokeOpacity={0.35}
                    />
                  ))}
                </g>
              )}
              <ReferenceArea x1={range.start} x2={range.end} yAxisId="users" fill="var(--primary)" fillOpacity={0.025} />
              <CartesianGrid
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                vertical={false}
              />
              <XAxis
                interval="preserveStartEnd"
                padding={{ left: edgePadding, right: edgePadding }}
                axisLine={false}
                dataKey="key"
                fontSize={11}
                minTickGap={24}
                tickFormatter={dateLabel}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                fontSize={10}
                domain={[0, countScale.maximum]}
                ticks={countScale.ticks}
                allowDataOverflow
                orientation="left"
                tickFormatter={(value) =>
                  `${Number(value).toLocaleString("ko-KR")}회선`
                }
                tickLine={false}
                width={76}
                yAxisId="users"
              />
              <YAxis
                axisLine={false}
                fontSize={10}
                domain={[0, countScale.maximum]}
                ticks={countScale.ticks}
                allowDataOverflow
                orientation="right"
                tickFormatter={(value) =>
                  `${Number(value).toLocaleString("ko-KR")}건`
                }
                tickLine={false}
                width={68}
                yAxisId="cancellations"
              />

              <YAxis
                allowDataOverflow
                domain={[0, 1]}
                hide
                type="number"
                width={0}
                yAxisId="events"
              />
              {showEvents &&
                visibleExperiments
                  .filter(
                    (a) =>
                      bucketKey(a.start < displayRange.start ? displayRange.start : a.start, grain) === hoveredExperimentKey,
                  )
                  .map((a) => (
                    <ReferenceArea
                      shape={periodAreaShape}
                      key={`highlight-${a.id}`}
                      x1={bucketKey(a.start < displayRange.start ? displayRange.start : a.start, grain)}
                      x2={bucketKey(
                        dayShift(a.start, (a.applyDays ?? a.days) - 1) >
                          chartEnd
                          ? chartEnd
                          : dayShift(a.start, (a.applyDays ?? a.days) - 1),
                        grain,
                      )}
                      y1={0}
                      y2={1}
                      yAxisId="events"
                      fill="#facc15"
                      fillOpacity={0.12}
                      stroke="#facc15"
                    />
                  ))}

              {showEvents &&
                groups
                  .filter((group) => group.id === selectedGroup)
                  .map((group) => {
                    const starts = group.events.map(event => event.startAt.slice(0, 10)).sort();
                    const ends = group.events.map(event => (event.endAt ?? event.startAt).slice(0, 10)).sort();
                    const start = starts[0];
                    const end = ends.at(-1);
                    if (!start || !end) return null;
                    return (
                      <ReferenceArea
                        key={group.id}
                        shape={periodAreaShape}
                        fill="var(--primary)"
                        fillOpacity={0.08}
                        stroke="var(--primary)"
                        label={{
                          value: start === end ? start : `${start} ~ ${end}`,
                          position: "insideTop",
                          fontSize: 10,
                          fill: "var(--foreground)",
                        }}
                        x1={bucketKey(start < displayRange.start ? displayRange.start : start, grain)}
                        x2={bucketKey(end > chartEnd ? chartEnd : end, grain)}
                        y1={0}
                        y2={1}
                        yAxisId="events"
                      />
                    );
                  })}
              {showEvents && pivotLayout && pivots
                .filter(group => selectedGroup === `pivot:${group.key}`)
                .map(group => {
                  const { start, end } = pivotPeriod(group.pivots);
                  if (!start || !end) return null;
                  return <ReferenceArea key={`pivot-period:${group.key}`} shape={periodAreaShape}
                    x1={bucketKey(start < displayRange.start ? displayRange.start : start, grain)}
                    x2={bucketKey(end > chartEnd ? chartEnd : end, grain)}
                    y1={0} y2={1} yAxisId="events" fill="var(--color-blue-600)"
                    fillOpacity={0.1} stroke="var(--color-blue-600)"
                    label={{value: start === end ? start : `${start} ~ ${end}`, position: "insideTop", fontSize: 10, fill: "var(--foreground)"}} />;
                })}
              <ChartTooltip
                active={dragging || selectedGroup || hoveredExperimentKey || openExperimentKey ? false : undefined}
                content={({ active, payload, label }) => {
                  const row = payload?.[0]?.payload as Record<string, unknown> | undefined;
                  if (!active || !row) return null;
                  const metrics = [
                    ...(activeSeries.includes("customers") ? [{ key: "customers", label: "회선", unit: "회선" }] : []),
                    ...(activeSeries.includes("cancellations") ? [{ key: "cancellations", label: "해지", unit: "건" }] : []),
                    { key: "revenue", label: "매출", unit: "원" },
                    { key: "netProfit", label: "순익", unit: "원" },
                  ];
                  return <div className="pointer-events-none min-w-48 rounded-lg border bg-popover p-3 text-popover-foreground shadow-lg">
                    <p className="mb-2 text-xs font-semibold">{dateLabel(String(label))} · 실적</p>
                    <dl className="space-y-1.5 text-xs leading-5">
                      {metrics.map(metric => <div key={metric.key} className={`flex items-center justify-between gap-5 ${metric.key === "revenue" ? "mt-2 border-t pt-2" : ""}`}>
                        <dt className="text-muted-foreground">{metric.label}</dt>
                        <dd className="font-medium tabular-nums">{typeof row[metric.key] === "number" ? `${Number(row[metric.key]).toLocaleString("ko-KR")}${metric.unit}` : "—"}</dd>
                      </div>)}
                    </dl>
                    <p className="mt-2 text-[10px] text-muted-foreground">합성 실적</p>
                  </div>;
                }}
                cursor={false}
              />
              {(["customers", "cancellations"] as const).map(metric => (
                <React.Fragment key={metric}>
                  <Line name={metric} dataKey={metric}
                    dot={false} hide={!activeSeries.includes(metric)} stroke={`var(--color-${metric})`}
                    strokeWidth={metric === "customers" ? 3 : 2.5} strokeLinecap="round" strokeLinejoin="round" activeDot={{r: 4, strokeWidth: 2}} type="linear" yAxisId={metric === "customers" ? "users" : "cancellations"} isAnimationActive={false} />

                  {previewExperiments.map(a => <Line key={`${a.id}-${metric}`} name={`${a.title} · ${chartConfig[metric].label} 예측`}
                    dataKey={`${a.id}_${metric}_line`} dot={timelineRows.filter(row => typeof row[`${a.id}_${metric}_line`] === "number").length === 1 ? {r: 3} : false} hide={!activeSeries.includes(metric)}
                    stroke={metric === "customers" ? "var(--color-amber-400)" : "var(--color-violet-400)"} strokeWidth={3} strokeDasharray="6 4" strokeLinecap="round"
                    type="linear" yAxisId={metric === "customers" ? "users" : "cancellations"} isAnimationActive={false} />)}
                </React.Fragment>
              ))}
              {previewExperiments.flatMap((a, experimentIndex) => (["customers", "cancellations"] as const).map(metric => {
                if (!activeSeries.includes(metric)) return null;
                const endpoint = experimentEndpoint(scopedPreviews.find(p=>p.id===a.id) ?? a, displayRange, metric);
                if (!endpoint) return null;
                const key = bucketKey(endpoint.date, grain);
                const row = timelineRows.find(row=>row.key===key);
                const y = row?.[`${a.id}_${metric}_line`];
                if (typeof y !== "number") return null;
                const color = metric === "customers" ? "var(--color-amber-400)" : "var(--color-violet-400)";
                const rate = endpoint.growthPct === null ? "—" : `${endpoint.growthPct > 0 ? "+" : ""}${Math.round(endpoint.growthPct)}%`;
                return <ReferenceDot key={`endpoint-${a.id}-${metric}`} x={key} y={y} yAxisId={metric === "customers" ? "users" : "cancellations"} r={4} fill={color} stroke="var(--background)" strokeWidth={2}
                  label={({viewBox}) => {
                    const box = viewBox as {x?:number;y?:number};
                    if (box.x === undefined || box.y === undefined) return <g />;
                    const labelY = box.y - 10 - experimentIndex * 22;
                    return <g pointerEvents="none" aria-label={`${a.title} · ${endpoint.date} ${chartConfig[metric].label} 예측 증감률 ${rate}`}>
                      <title>{`시작 직전 ${endpoint.baseline} 대비 ${endpoint.date} 예측 ${endpoint.value} · ${rate} · 가정 기반`}</title>
                      <path d={`M${box.x+3},${box.y+3} L${box.x+10},${labelY+10}`} stroke={color} strokeWidth={1}/>
                      <rect x={box.x+8} y={labelY} width={48} height={20} rx={5} fill="var(--popover)" stroke={color}/>
                      <text x={box.x+32} y={labelY+14} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>{rate}</text>
                    </g>;
                  }} />;
              }))}
              {showEvents &&
                showAlternativeLane &&
                pivotLayout &&
                [...alternativeMarkers].map(([key, marker]) => (
                  <ReferenceLine
                    key={`alternative-${key}`}
                    x={key}
                    yAxisId="events"
                    stroke="none"
                    label={
                      <AlternativeLaneMarker
                        highlight={visibleExperiments.some(a=>bucketKey(a.start < displayRange.start ? displayRange.start : a.start,grain)===key && nearPivot(a.start,dayShift(a.start,(a.applyDays??a.days)-1)))}
                        scopeLabel={channel ? scopeLabel : undefined}
                        count={marker.count}
                        experiments={visibleExperiments.filter(a => bucketKey(a.start < displayRange.start ? displayRange.start : a.start, grain) === key)}
                        open={openExperimentKey === key}
                        onOpenChange={open => setOpenExperimentKey(current => open ? key : current === key ? undefined : current)}
                        periodLabel={visibleExperiments
                          .filter((a) => a.status === "applied" && (a.workspace ?? "air") === workspace && bucketKey(a.start < displayRange.start ? displayRange.start : a.start, grain) === key)
                          .map(
                            (a) =>
                              `${a.groupName ? `[${a.groupName}] ` : ""}${a.title}\n${a.description}\n적용 ${a.start} ~ ${dayShift(a.start, (a.applyDays ?? a.days) - 1)} · 예측 ${a.start} ~ ${dayShift(a.start, a.days - 1)}`,
                          )
                          .join("\n")}
                        onHover={(hovered) =>
                          setHoveredExperimentKey(hovered ? key : undefined)
                        }

                      />
                    }
                  />
                ))}
              {showEvents &&
                groups.map((group) => (
                  <ReferenceLine
                    key={`${range.start}-${range.end}-${group.id}`}
                    label={
                      <AnnotationLabel
                        onSelect={() => {setOpenExperimentKey(undefined);setHoveredExperimentKey(undefined);}}
                        events={group.events}
                        laneOffset={
                          group.offset +
                          (showAlternativeLane && pivotLayout ? 44 : 0)
                        }
                        laneLabel={group.lane === "own" ? scopeLabel : group.laneLabel}
                        color={
                          pivotLayout
                            ? group.lane === "own"
                              ? "var(--color-red-600)"
                              : "var(--color-gray-600)"
                            : undefined
                        }
                        highlight={group.highlight || (group.events.some(e=>nearPivot(e.startAt,e.endAt)) ? "변곡점 직전 7일 영향 검토 후보 · 인과관계 미확정" : undefined)}
                        label={
                          group.key !== group.endKey
                            ? `${group.key} ~ ${group.endKey} 묶음`
                            : grain === "day"
                              ? group.key
                              : `${group.key} 집계`
                        }
                        onOpenChange={(open) =>
                          setSelectedGroup(open ? group.id : undefined)
                        }
                        range={range}
                      />
                    }
                    stroke={
                      pivotLayout
                        ? group.lane === "own"
                          ? "var(--color-red-600)"
                          : "var(--color-gray-600)"
                        : eventOwnership(group.events, workspace).color
                    }
                    strokeDasharray="3 4"
                    strokeOpacity={0.65}
                    strokeWidth={selectedGroup === group.id ? 2 : 1}
                    x={group.key}
                    yAxisId="events"
                    zIndex={200}
                  />
                ))}
              {showEvents &&
                pivotLayout &&
                pivots.map((group) => (
                  <ReferenceLine
                    key={`pivot:${group.key}`}
                    x={group.key}
                    yAxisId="events"
                    stroke="var(--color-blue-600)"
                    strokeDasharray="3 4"
                    strokeOpacity={0.65}
                    zIndex={201}
                    label={
                      <AnnotationLabel
                        onSelect={() => {setOpenExperimentKey(undefined);setHoveredExperimentKey(undefined);}}
                        events={rawGroups.flatMap(g=>g.events).filter(e=>e.types.includes("pivot") && group.pivots.some(p=>p.startAt===e.startAt && p.title===e.title))}
                        pivots={group.pivots}
                        laneLabel={channel ? `${scopeLabel} · 변곡점` : "변곡점"}
                        laneOffset={44 + (showAlternativeLane ? 44 : 0)}
                        color="var(--color-blue-600)"
                        label={
                          group.key === group.endKey
                            ? group.key
                            : `${group.key} ~ ${group.endKey}`
                        }
                        range={range}
                        onOpenChange={(open) =>
                          setSelectedGroup(
                            open ? `pivot:${group.key}` : undefined,
                          )
                        }
                      />
                    }
                  />
                ))}
            </ComposedChart>
          </ChartContainer>
          </div>
          <fieldset aria-label="전체 기간 탐색" className="space-y-2 border-t pt-3">
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>기간 탐색</span><span>{range.start} ~ {range.end} · 양 끝: 기간 조정 / 가운데: 이동</span></div>
            <ChartContainer className="h-16 w-full aspect-auto" config={chartConfig}>
              <AreaChart data={overview} margin={{top:0,right:8,bottom:0,left:8}}>
                <Brush dataKey="key" height={48} y={4} startIndex={Math.max(0,overview.findIndex(row=>row.key===range.start))} endIndex={Math.max(0,overview.findIndex(row=>row.key===range.end))} travellerWidth={8} fill="var(--muted)" stroke="var(--primary)" ariaLabel="조회 기간 선택" tickFormatter={value=>String(value)} onChange={({startIndex,endIndex})=>{
                  if(startIndex===undefined || endIndex===undefined) return;
                  const next={start:overview[startIndex].key,end:overview[endIndex].key};
                  if(next.start!==range.start || next.end!==range.end) {setSelectedGroup(undefined);setHoveredExperimentKey(undefined);onRangeChange(next);}
                }}>
                  <AreaChart><Area dataKey="customers" type="monotone" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.15} dot={false} isAnimationActive={false}/></AreaChart>
                </Brush>
              </AreaChart>
            </ChartContainer>
          </fieldset>
        </CardContent>
      </div>
    </Card>
  );
}
