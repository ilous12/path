"use client";
import { TimelineMarkerIcon } from "./timeline-marker-icon";
import { useRouter } from "next/navigation";
import bubbleStyles from "./annotation.module.css";
import { AnalysisMenu } from "./analysis-menu";
import { useState, useRef, useEffect } from "react";
import { Plus, FlaskConical, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverPopup, PopoverArrow } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useAlternatives } from "./alternative-store";
import { MAX_DATE, MIN_DATE, type MarketEvent } from "./data";
import {
  dayShift,
  evaluateDemoExperiment,
  promptExperiment,
  projectAlternative,
  validateAlternative,
  type PolicyAlternative,
} from "./alternative-model";
const selectClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground";
const initial = () => ({
  title: "",
  type: "가격 조정",
  description: "",
  start: MAX_DATE,
  days: 14,
  applyDays: 7,
  cancellationPct: 0,
  pricePct: 0,
  demandPct: 0,
  variableCostPct: 0,
  dailyCost: 0,
  oneTimeCost: 0,
});
export function AlternativeManager({
  eventId,
  seed,
  label = "정책 관리",
  defaultStart,
  embedded = false,
  source,
}: {
  source?:PolicyAlternative;
  embedded?: boolean;
  eventId?: string;
  defaultStart?: string;
  seed?: { title: string; description: string };
  label?: string;
}) {
  const store = useAlternatives();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(source?.eventId??eventId ?? "");
  const [form, setForm] = useState(() => ({
    ...initial(),
    start: defaultStart ?? MAX_DATE,
    ...(source?{...source,title:`${source.title} · 수정안`,applyDays:source.applyDays??source.days,cancellationPct:source.cancellationPct??0}:{})
  }));
  const [prompt, setPrompt] = useState(source?.prompt??source?.description??seed?.description ?? "");
  const [notice, setNotice] = useState("");
  const [parentId, setParent] = useState<string|undefined>(source?.id);
  const candidate = {
    ...form,
    type: form.type,
    eventId: target || undefined,
  } as PolicyAlternative;
  const invalid = validateAlternative(candidate);
 function run(fn: () => void, message: string) {
    try {
      fn();
      setNotice(message);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "저장하지 못했습니다.");
    }
  }
  function begin() {
    setTarget(source?.eventId??eventId ?? "");
    setForm({
      ...initial(),
      start: defaultStart ?? MAX_DATE,
      ...(seed ? { title: seed.title, description: seed.description } : {}),
      ...(source?{...source,title:`${source.title} · 수정안`,applyDays:source.applyDays??source.days,cancellationPct:source.cancellationPct??0}:{})
    });
    setPrompt(source?.prompt??source?.description??seed?.description??"");
    setParent(source?.id);
    setNotice("");
    setOpen(true);
  }
  const content = (
    <>
      {" "}
      {embedded ? (
        <p className="text-sm text-muted-foreground">
          AIR 정책 · 브라우저 로컬 저장 · 실제 정책 변경 없음
        </p>
      ) : (
        <DialogHeader>
          <DialogTitle>AIR 정책실</DialogTitle>
          <DialogDescription>
            변경하고 싶은 내용과 기간으로 정책을 만듭니다. 브라우저 로컬 저장 ·
            실제 정책 변경 없음.
          </DialogDescription>
        </DialogHeader>
      )}
      <div className="grid gap-6">
        <form
          className="space-y-4 rounded-lg border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () =>
                store.save({
                  ...candidate,
                  id: `alt-${crypto.randomUUID()}`,
                  status:
                    (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                      "value",
                    ) === "apply"
                      ? "applied"
                      : "draft",
                  createdAt: new Date().toISOString(),
                  parentId,
                  prompt,
                  history: [
                    {
                      at: new Date().toISOString(),
                      action: parentId ? "가정 복제·수정" : "정책 등록",
                    },
                  ],
                }),
              "정책을 등록했습니다. 타임라인에서 선택해 적용 구간을 확인하세요.",
            );
          }}
        >
          <h3 className="font-semibold">
            {parentId ? "복제하여 새 버전 등록" : "새 정책 등록"}
          </h3>
          <label className="grid gap-2 text-sm font-medium">
            무엇을 바꿔볼까요?
            <Textarea
              required
              className="min-h-28"
              placeholder="예: 30GB 요금제 가격을 10% 인하하고, 가입 고객에게 데이터 5GB를 추가 제공"
              value={form.description}
              onChange={(e) => {
                setPrompt(e.target.value);
                setForm({ ...form, ...promptExperiment(e.target.value) });
              }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {["요금제 가격을 10% 인하", "가입 혜택으로 데이터 5GB 추가"].map(
              (example) => (
                <Button
                  key={example}
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setPrompt(example);
                    setForm({ ...form, ...promptExperiment(example) });
                  }}
                >
                  {example}
                </Button>
              ),
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            내용과 기간만 입력하면 등록됩니다. 가격 변화율만 명시된 문장에서
            추출하며, 혜택의 비용·수요 효과는 자동 추정하지 않습니다. 입력 내용은
            규칙 기반으로 정리합니다.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              적용 기준일
              <Input
                type="date"
                required
                min="2024-01-02"
                value={form.start}
                onChange={(e) => setForm({ ...form, start: e.target.value })}
              />
            </label>
            {(
              [
                ["applyDays", "적용 기간 (일)", 1, 90],
                ["days", "예측 기간 (일)", 1, 90],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key} className="grid gap-1 text-sm">
                {label}
                <Input
                  type="number"
                  required
                  step={key === "days" || key === "applyDays" ? 1 : "any"}
                  min={min}
                  max={max}
                  value={Number.isNaN(form[key]) ? "" : form[key]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [key]:
                        e.target.value === "" ? NaN : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
          </div>
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              세부 가정 조정 · 선택
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(
                [
                  ["pricePct", "가격 변화 (%)", -100, 100],
                  ["demandPct", "수요 변화 (%)", -100, 300],
                  ["cancellationPct", "해지 변화 (%)", -100, 300],
                  ["variableCostPct", "단위 원가 변화 (%)", -100, 300],
                  ["dailyCost", "추가 일비용 (원)", 0, 1e9],
                  ["oneTimeCost", "일회성 비용 (원)", 0, 1e10],
                ] as const
              ).map(([key, label, min, max]) => (
                <label key={key} className="grid gap-1 text-sm">
                  {label}
                  <Input
                    type="number"
                    min={min}
                    max={max}
                    step="any"
                    value={Number.isNaN(form[key]) ? "" : form[key]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [key]:
                          e.target.value === "" ? NaN : Number(e.target.value),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              미입력 효과는 0으로 가정합니다. 적용 직전 최대 7일 합성 실적 평균
              기준이며, 적용 종료 후 효과가 사라지는 단순 계산입니다.
              타임라인에서는 강조만 표시합니다.
            </p>
          </details>
          {invalid && prompt.trim() && (
            <p role="status" className="text-sm text-muted-foreground">
              {invalid}
            </p>
          )}
          <Button type="submit" disabled={Boolean(invalid)}>
            <Plus className="size-4" />
            정책 등록
          </Button>
          <Button
            type="submit"
            name="intent"
            value="apply"
            disabled={Boolean(invalid)}
            className="ml-2"
          >
            등록하고 적용
          </Button>
        </form>

      </div>
      <p role="status" className="text-sm text-primary">
        {store.error || notice}
      </p>
    </>
  );
  if (embedded)
    return (
      <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-5">
        {content}
      </div>
    );
  return (
    <>
      <Button size="sm" variant="outline" onClick={begin}>
        <FlaskConical className="size-4" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-5xl">
          {content}
        </DialogContent>
      </Dialog>
    </>
  );
}
export function AlternativeEventList({ events }: { events: MarketEvent[] }) {
  const store = useAlternatives();
  const own = events.filter((e) => e.operator.toLowerCase() === "air");
  return (
    <div className="space-y-3 border-t p-4">
      <h3 className="font-semibold text-sm">
        AIR 이벤트 하단 · 정책 시뮬레이션
      </h3>
      <p className="text-xs text-muted-foreground">
        초안 → 적용 → 점선 예측 비교. 적용은 실제 정책 실행이 아닙니다.
      </p>
      <div className="max-h-72 overflow-y-auto space-y-2">
        {own.map((e) => (
          <div key={e.id} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm">
                {e.startAt.slice(0, 10)} · {e.title}
              </p>
              <AlternativeManager eventId={e.id} label="캠페인 추가·관리" />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {store.alternatives
                .filter((a) => a.eventId === e.id)
                .map((a) => (
                  <Badge key={a.id} variant="outline">
                    {a.title} ·{" "}
                    {a.status === "applied"
                      ? "적용 중"
                      : a.status === "draft"
                        ? "초안"
                        : "적용 해제"}
                  </Badge>
                ))}
            </div>
          </div>
        ))}
      </div>
      {!own.length && (
        <p className="text-xs text-muted-foreground">
          현재 조회 범위에 AIR 이벤트가 없습니다. 이벤트 페이지에서 AIR 이벤트를
          선택해 정책을 등록하세요.
        </p>
      )}
    </div>
  );
}
export function AlternativeLaneMarker({
  viewBox,
  count,
  periodLabel,
  onHover,
  highlight = false,
  scopeLabel,
  experiments,
  open,
  onOpenChange,
}: {
  viewBox?: { x?: number };
  count: number;
  experiments: PolicyAlternative[];
  highlight?: boolean;
  scopeLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodLabel: string;
  onHover: (hovered: boolean) => void;
}) {
  const router = useRouter();
  const store = useAlternatives();
  const marker = useRef<HTMLButtonElement>(null);
  const unseenIds = experiments.filter(a => a.isNew).map(a => a.id).join(",");
  const markSeen = () => { if (unseenIds) { try { store.markSeen(unseenIds.split(",")); } catch { /* Keep the badge if persistence fails. */ } } };
  const markSeenRef = useRef(markSeen);
  markSeenRef.current = markSeen;
  useEffect(() => {
    const node = marker.current;
    if (!node || !unseenIds) return;
    let visible = false;
    const observer = new IntersectionObserver(entries => { visible = entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.5); }, {threshold: 0.5});
    observer.observe(node);
    const timer = window.setInterval(() => {
      if (visible && document.visibilityState === "visible" && !document.querySelector('[role="dialog"][data-open], [role="alertdialog"][data-open]')) markSeenRef.current();
    }, 1000);
    return () => {observer.disconnect(); window.clearInterval(timer);};
  }, [unseenIds, viewBox?.x]);
  const detailsHref = experiments.length === 1 ? `/analysis?experiment=${encodeURIComponent(experiments[0].id)}` : `/analysis?experiments=${encodeURIComponent(experiments.map(a=>a.id).join(","))}`;
  const [menuOpen, setMenuOpen] = useState(false);
  if (viewBox?.x === undefined) return null;
  return (
    <foreignObject
      x={viewBox.x - 10.5}
      y={155.5}
      width={38}
      height={40}
      style={{ overflow: "visible" }}
    >
      <Popover open={open || menuOpen} onOpenChange={next => {onOpenChange(next || menuOpen);onHover(next || menuOpen);}}><PopoverTrigger openOnHover delay={100} closeDelay={180}
        ref={marker}
        onMouseEnter={markSeen}
        onFocus={() => {markSeen(); onHover(true);}}
        onBlur={() => onHover(false)}
        onClick={() => {markSeen(); router.push(detailsHref);}}
        type="button"
        aria-label={`${scopeLabel ? scopeLabel + " · " : ""}정책 ${count} 예측 미리보기 · ${periodLabel}`}
        className={`relative flex size-[21px] items-center justify-center rounded-md bg-yellow-300 text-[10px] font-bold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${highlight ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-background shadow-[0_0_12px_#fbbf24]" : ""}`}
      >
        <TimelineMarkerIcon kind="experiment"/>
        {unseenIds && <span aria-label="새 정책" className="absolute -left-2 -top-2 flex size-3.5 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground">N</span>}
        {count>1&&<span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex min-w-4 h-4 items-center justify-center rounded-full border border-foreground bg-white px-0.5 text-[10px] font-bold text-black shadow-md shadow-black/40">{count}</span>}
      </PopoverTrigger>
      <PopoverPortal>
      <PopoverPositioner side="top" align="start" sideOffset={10} collisionAvoidance={{side:"none",align:"shift",fallbackAxisSide:"none"}} className="z-50">
      <PopoverPopup
        onWheel={event => event.stopPropagation()}
        onPointerMove={event => event.stopPropagation()}
        className={`w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-0 text-left text-popover-foreground shadow-lg ${bubbleStyles.bubble}`}>
        <PopoverArrow className="data-[side=top]:-bottom-2 data-[side=top]:rotate-180" />
        <div className="max-h-(--available-height) overflow-y-auto overscroll-contain rounded-lg">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3.5 py-2.5">
          <h3 className="text-[10px] font-semibold">{scopeLabel ? `${scopeLabel} · 정책` : "정책 정보"}</h3>
          <span className="text-[10px] tabular-nums text-muted-foreground">{count}개</span>
        </div>
        <div className="divide-y">
          {experiments.map(a => <article key={a.id} className="space-y-2.5 border-b px-3.5 py-3 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="min-w-0 break-words pt-1 text-[10px] font-semibold leading-[1.5]">{a.title}</h4>
              <div className="shrink-0"><AnalysisMenu onOpenChange={next=>{setMenuOpen(next);onOpenChange(next);onHover(next);}} label={`${a.title} 정책 상세 메뉴`} href={`/analysis?experiment=${encodeURIComponent(a.id)}&workspace=${encodeURIComponent(a.workspace ?? "air")}`} /></div>
            </div>
            <dl className="grid grid-cols-[2rem_1fr] gap-x-2 gap-y-1 rounded-md bg-muted/40 px-2.5 py-2 text-[10px] leading-[1.5] tabular-nums">
              <dt className="text-muted-foreground">적용</dt><dd>{a.start} ~ {dayShift(a.start,(a.applyDays??a.days)-1)}</dd>
              <dt className="text-muted-foreground">예측</dt><dd>{a.start} ~ {dayShift(a.start,a.days-1)}</dd>
            </dl>
            <p className="line-clamp-3 break-words text-[10px] leading-[1.5] text-muted-foreground">{a.description}</p>
            {a.demoEvaluationDate && (()=>{const e=evaluateDemoExperiment(a);return e && <p className="rounded bg-muted/40 p-2 text-[10px] leading-[1.5]">{e.date} 비교 · 예측 대비 증가분 달성률 {e.attainment?.toFixed(1) ?? "산출 불가"}%<br/>관측 {e.actual} / 예측 {e.forecast}회선 · {e.matchedOnset ? `전환일 ${e.actualOnset} 일치` : (e.attainment !== null && e.attainment >= 100 ? "예측 증가분 충족" : "예측 증가 미달")}<br/><span className="text-muted-foreground">사후 구성 시나리오 · 정책 인과효과 아님</span></p>;})()}

          </article>)}
        </div>
        <p className="border-t px-3.5 py-2 text-[10px] leading-[1.5] text-muted-foreground">전체 내용과 예측 가정은 ⋮ 메뉴의 상세보기에서 확인하세요.</p>
        </div>
      </PopoverPopup></PopoverPositioner></PopoverPortal></Popover>
    </foreignObject>
  );
}

export function RegisteredExperiments({start,end,keyword=''}:{start:string;end:string;keyword?:string}){
 const store=useAlternatives();const [notice,setNotice]=useState('');
 const rows=store.alternatives.filter(a=>a.start<=end&&dayShift(a.start,(a.applyDays??a.days)-1)>=start&&`${a.title} ${a.description} ${a.type} ${a.groupName??""}`.toLowerCase().includes(keyword.toLowerCase()));
 const groupNames=[...new Set(store.alternatives.map(a=>a.groupName).filter((name):name is string=>Boolean(name)))];
 const groups=[...new Set(rows.map(a=>a.groupName??""))];
 function run(fn:()=>void,message:string){try{fn();setNotice(message);}catch(error){setNotice(error instanceof Error?error.message:'변경하지 못했습니다.');}}
 return <>        <section id="registered-experiments" className="scroll-mt-6 space-y-4 rounded-xl border bg-card p-5 sm:p-6">
          <h2 className="font-semibold">
            등록된 정책 · {rows.length}개
          </h2>
          <p className="text-xs text-muted-foreground">
            같은 그룹명을 지정하면 정책들을 하나로 묶어 관리합니다. 그룹명은 직접 입력하거나 기존 그룹에서 선택하세요. 효과는 합산하지 않습니다.
          </p>
          <datalist id="experiment-group-names">{groupNames.map(name=><option key={name} value={name}/>)}</datalist>
          {groups.map(groupName=><details key={groupName} open className="space-y-4 rounded-xl border p-4"><summary className="cursor-pointer font-semibold">{groupName||"미분류 정책"} {rows.filter(a=>(a.groupName??"")===groupName).length > 1 && <Badge variant="secondary">{rows.filter(a=>(a.groupName??"")===groupName).length}개</Badge>}</summary><div className="grid items-start gap-4 2xl:grid-cols-2">
          {rows.filter(a=>(a.groupName??"")===groupName).map((a) => {
            const p = projectAlternative(a);
            return (
              <article key={a.id} className="min-w-0 space-y-3 rounded-lg border bg-muted/20 p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{a.type}</Badge><Badge variant="secondary">{(a.workspace??"air").toUpperCase()}</Badge>
                  <Badge
                    variant={a.status === "applied" ? "default" : "secondary"}
                  >
                    {a.status === "applied"
                      ? "적용 중"
                      : a.status === "paused"
                        ? "적용 해제"
                        : "초안"}
                  </Badge>
                </div>
                <h4 className="font-semibold">{a.title}</h4>
                <AnalysisMenu href={`/analysis?workspace=${a.workspace??"air"}&policy=${encodeURIComponent(a.id)}`} label="캠페인 구성" />
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {a.description}
                </p>
                <p className="text-xs">
                  {a.start}부터 적용 {a.applyDays ?? a.days}일 · 예측 {a.days}일
                  (~{p.at(-1)?.key}) · 가격 {a.pricePct}% · 수요 {a.demandPct}%
                </p>
                <p className="text-sm">
                  예상 매출{" "}
                  {p.reduce((s, r) => s + r.revenue, 0).toLocaleString("ko-KR")}
                  원 · 순익{" "}
                  {p
                    .reduce((s, r) => s + r.netProfit, 0)
                    .toLocaleString("ko-KR")}
                  원
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      run(
                        () =>
                          store.setStatus(
                            a.id,
                            a.status === "applied" ? "paused" : "applied",
                          ),
                        a.status === "applied"
                          ? "정책 적용 상태를 해제했습니다."
                          : "정책을 적용 상태로 변경했습니다. 타임라인은 강조만 표시합니다.",
                      )
                    }
                  >
                    {a.status === "applied" ? "적용 해제" : "적용 · 시뮬레이션"}
                  </Button>
                  
                </div>
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">관리 이력</summary>
                  {a.history.map((h, i) => (
                    <p key={i}>
                      {h.at.slice(0, 19).replace("T", " ")} UTC · {h.action}
                    </p>
                  ))}
                </details>
              </article>
            );
          })}</div></details>)}
          {!rows.length && (
            <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              등록된 정책이 없습니다. 직접 작성하거나 요건 분석로 가정을
              구성하세요.
            </p>
          )}
        </section><p role="status" className="text-sm">{store.error||notice}</p></>;
}
