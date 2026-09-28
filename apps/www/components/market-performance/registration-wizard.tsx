"use client";
import { currentSalesSchema } from "./sales-metric-store";
import { applyMetricDefaults, normalizeSalesTerms } from "./sales-metric-values";
import { PolicyPeriodEditor } from "./policy-period-editor";
import { AiirSalesTermsEditor, initialAiirTerms, aiirTermsSummary } from "./aiir-sales-terms";
import { useAnalysisPreferences } from "./use-analysis-preferences";
import { RequirementOptions } from "./requirement-options";

import { useEffect, useRef, useState } from "react";
import { RegistrationScenarioReview } from "./registration-scenario-review";
import {
  registrationScenario,
  reviewSnapshot,
  summarizeRequirements,
} from "./registration-scenarios";
import { ChannelSelector } from "./channel-selector";
import { CHANNELS } from "./channel-data";
import { useRouter, useSearchParams } from "next/navigation";
import { proposePolicy, PRIORITY_LABELS } from "./automatic-policy";
import type { Focus } from "./analysis-preferences";
import { useAnalysisExclusions } from "./use-analysis-exclusions";
import { appliesToChannel } from "./channel-scope";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  FlaskConical,
  LoaderCircle,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useEventCatalog } from "./event-catalog";
import { usePolicyGroups } from "./policy-group-store";
import { latestRevision } from "./policy-group-model";
import { useTimelineRange } from "./timeline-range";
import {
  RECOVERY_MILESTONES,
  EVENT_TYPES,
  MAX_DATE,
  MIN_DATE,
  validateRange,
  type EventType,
  type MarketEvent,
} from "./data";
import {
  ALTERNATIVE_TYPES,
  dayShift,
  validateAlternative,
  type PolicyAlternative,
} from "./alternative-model";
import {
  extractPolicyRequirements,
  EXPERIMENT_SUGGESTIONS,
  EVENT_SUGGESTIONS,
  type PolicyRequirements,
} from "./policy-requirements";
import { isValidCustomEvent } from "./event-validation";

const selectClass =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const steps = ["등록 방식", "기본 정보", "기간·근거", "프롬프트", "완료"];
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && (
        <span className="text-xs font-normal leading-5 text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}
export type RegistrationSeed = {
  type?: string;
  title: string;
  prompt: string;
  channels: string[];
  analysisContext?: PolicyAlternative["analysisContext"];
};
export function RegistrationWizard({
  workspace,
  defaultStart,
  parentPolicyId,
  initialKind = "event",
  seed,
  onClose,
  onSaved,
}: {
  workspace: string;
  defaultStart?: string;
  parentPolicyId?: string;
  initialKind?: "event" | "experiment";
  seed?: RegistrationSeed;
  onClose: () => void;
  onSaved: (start: string, end: string) => void;
}) {
  const router = useRouter();
  const [rawSalesTerms, setSalesTerms] = useState(()=>applyMetricDefaults(initialAiirTerms(),currentSalesSchema(workspace)));
  const salesTerms=normalizeSalesTerms(rawSalesTerms);

  const { preferences } = useAnalysisPreferences();
  const query = useSearchParams();
  const hiddenIds = useAnalysisExclusions();
  const [priorities, setPriorities] = useState<Focus[]>([preferences.focus, ...(["growth","retention","profit"] as Focus[]).filter(p=>p!==preferences.focus)]);
  const [choosingPriorities, setChoosingPriorities] = useState(false);
  const [generatedContext, setGeneratedContext] = useState<PolicyAlternative["analysisContext"]>();
  const [automatic, setAutomatic] = useState(false);
  const [inputMode,setInputMode]=useState<"direct"|"prompt">("direct");
  const catalog = useEventCatalog();
  const store = usePolicyGroups();
  const [destination, setDestination] = useState(parentPolicyId ?? "new");
  const [savedPolicyId, setSavedPolicyId] = useState("");
  const [timeline, setTimeline] = useTimelineRange(workspace);
  const [step, setStep] = useState(initialKind === "event" ? 1 : 0);
  const [choosingMethod, setChoosingMethod] = useState(initialKind === "experiment");
  const kind = initialKind;
  const aiirPolicy = workspace === "aiir" && kind === "experiment";
  const directPolicy = kind === "experiment" && inputMode === "direct" && !automatic;
  const [phase, setPhase] = useState<
    "edit" | "processing" | "review" | "saving" | "done"
  >("edit");
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [requirements, setRequirements] = useState<PolicyRequirements | null>(
    null,
  );
  const [targetChannels, setTargetChannels] = useState<string[]>(
    seed?.channels ?? [],
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: seed?.title ?? "",
    operator: workspace.toUpperCase(),
    customOperator: "",
    eventType: Object.keys(EVENT_TYPES)[0],
    experimentType: seed?.type ?? ALTERNATIVE_TYPES[0],
    channel: "WEB",
    start: `${defaultStart ?? timeline.end}T09:00`,
    end: "",
    applyEnd: dayShift(defaultStart ?? timeline.end, 6),
    forecastEnd: dayShift(defaultStart ?? timeline.end, 29),
    sourceType: "공식 발표",
    sourceName: "",
    sourceUrl: "",
    prompt: seed?.prompt ?? "",
    pricePct: 0,
    demandPct: 0,
    cancellationPct: 0,
    variableCostPct: 0,
    dailyCost: 0,
    oneTimeCost: 0,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const submitting = useRef(false);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      submitting.current = false;
    },
    [],
  );
  const operators = [
    ...new Set([
      "AIIR",
      "TDDS",
      "MVVNO",
      "MNO",
      "SKKT",
      "KT",
      "LG U+",
      ...catalog.events.map((e) => e.operator.toUpperCase()),
      ...store.policies.map(p => p.workspace.toUpperCase()),
    ]),
  ];
  const operator =
    form.operator === "__new" ? form.customOperator.trim() : form.operator;
  const start = form.start.slice(0, 10);
  const days = (end: string) =>
    Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  const [forecastMethod, setForecastMethod] = useState<NonNullable<PolicyAlternative["forecastMethod"]>>("average");
  const candidate = (): PolicyAlternative => ({
    salesTerms: aiirPolicy ? salesTerms : undefined,
    forecastMethod,
    id: "",
    title: form.title.trim(),
    description: directPolicy ? (aiirPolicy ? aiirTermsSummary(salesTerms) : summarizeRequirements(requirements ?? {pricePct:form.pricePct,benefits:"",points:"",freeOffers:"",other:form.experimentType})) : form.prompt.trim(),
    type: form.experimentType,
    workspace,
    operator,
    channel: aiirPolicy ? salesTerms.channel : targetChannels.join(", ") || "전체",
    targetChannels: aiirPolicy ? [salesTerms.channel] : targetChannels,
    analysisContext: automatic ? generatedContext : seed?.analysisContext,
    start: start <= MIN_DATE ? dayShift(MIN_DATE, 1) : start,
    days: kind === "event" ? 14 : days(form.forecastEnd),
    applyDays:
      kind === "event"
        ? Math.max(1, Math.min(14, form.end ? days(form.end.slice(0, 10)) : 7))
        : days(form.applyEnd),
    pricePct: aiirPolicy ? (salesTerms.monthlyPrice / salesTerms.baselinePrice - 1) * 100 * salesTerms.eligibilityPct / 100 : form.pricePct,
    demandPct: form.demandPct,
    cancellationPct: form.cancellationPct,
    variableCostPct: form.variableCostPct,
    dailyCost: form.dailyCost,
    oneTimeCost: form.oneTimeCost,
    status: "draft",
    createdAt: new Date().toISOString(),
    history: [],
    prompt: directPolicy ? undefined : form.prompt.trim(),
    requirements: requirements
      ? { ...requirements, pricePct: aiirPolicy ? (salesTerms.monthlyPrice / salesTerms.baselinePrice - 1) * 100 : form.pricePct, ...(aiirPolicy ? {points: aiirTermsSummary(salesTerms)} : {}) }
      : undefined,
  });
  function validate(current: number) {
    if (current === 1 && (!form.title.trim() || !operator))
      return "제목과 수행 주체를 입력하세요.";
    if (current === 2) {
      if (!form.start) return "시작 일시를 선택하세요.";
      const invalid = validateRange({
        start,
        end: kind === "event" ? form.end.slice(0, 10) || start : start,
      },kind === "experiment" ? dayShift(MAX_DATE,90) : MAX_DATE);
      if (invalid) return invalid;
      if (kind === "event") {
        if (form.end && form.end < form.start)
          return "종료 일시는 시작 일시 이후여야 합니다.";
        if (!form.sourceName.trim()) return "출처 이름을 입력하세요.";
        if (form.sourceUrl.trim()) {
          try {
            const url = new URL(form.sourceUrl.trim());
            if (!["https:", "http:"].includes(url.protocol))
              return "URL은 http 또는 https로 입력하세요.";
          } catch {
            return "올바른 출처 URL을 입력하세요.";
          }
        }
      } else if (
        !Number.isInteger(days(form.applyEnd)) ||
        days(form.applyEnd) < 1 ||
        days(form.applyEnd) > 90 ||
        !Number.isInteger(days(form.forecastEnd)) ||
        days(form.forecastEnd) < 1 ||
        days(form.forecastEnd) > 90
      )
        return "적용·예측 기간은 시작일부터 1~90일로 지정하세요.";
    }
    if (current === 3) {
      if (!directPolicy && !form.prompt.trim()) return "정리할 프롬프트를 입력하세요.";
      if (phase === "review")
        return validateAlternative(
          registrationScenario(candidate(), selectedScenario ?? 0),
        );
    }
    return null;
  }
  function next() {
    const invalid = validate(step);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError("");
    if (step === 0 && kind === "experiment") setChoosingMethod(true);
    else if(step===2 && directPolicy){
      setRequirements(requirements ?? {pricePct:form.pricePct,benefits:"",points:aiirPolicy?aiirTermsSummary(salesTerms):"",freeOffers:"",other:form.experimentType});
      setSelectedScenario(2);setStep(3);setPhase("review");
    } else setStep(step + 1);
  }
  function autoSuggest() {
    if (submitting.current) return;
    const invalid=validate(2);if(invalid){setError(invalid);return;}
    const requested = {start:query.get("start")||"",end:query.get("end")||""};
    const basis = seed?.analysisContext ?? (!validateRange(requested) ? requested : timeline);
    const eventIds=(query.get("events")||"").split(",").filter(Boolean);
    const selectedEvents=catalog.events.filter(e=>!hiddenIds.includes(e.id) && (!eventIds.length || eventIds.includes(e.id)) && e.startAt.slice(0,10)<=basis.end && (e.endAt||e.startAt).slice(0,10)>=basis.start && (!targetChannels.length || e.operator.toLowerCase()!==workspace || targetChannels.some(c=>appliesToChannel(e,c))));
    const selectedPivots=(query.has("pivots") ? (query.get("pivots")||"").split(",") : RECOVERY_MILESTONES.map(p=>p.date)).filter(d=>d>=basis.start && d<=basis.end);
    const suggestion = proposePolicy(basis,targetChannels,priorities,selectedEvents,selectedPivots);
    const prompt = suggestion.prompt;
    if(workspace === "aiir") setSalesTerms(current=>({...current,monthlyPrice:Math.round(current.baselinePrice*(1+suggestion.pricePct/100)),channel:targetChannels[0] || current.channel}));
    setGeneratedContext({...basis,workspace,channels:[...targetChannels],priorities:[...priorities],eventIds:selectedEvents.map(e=>e.id),pivotDates:selectedPivots,reason:suggestion.reason});
    setChoosingPriorities(false);
    const result = extractPolicyRequirements(prompt);
    setAutomatic(true);setInputMode("prompt");
    setChoosingMethod(false);
    setStep(3);
    setSelectedScenario(null);
    setError("");
    setForm(current => ({...current, title: `${workspace.toUpperCase()} · ${targetChannels.join("·") || "전체 채널"} · ${suggestion.title}`, prompt, experimentType: priorities[0] === "growth" ? "가격 조정" : "혜택 변경", pricePct: suggestion.pricePct, demandPct:suggestion.demandPct, cancellationPct:suggestion.cancellationPct, variableCostPct:suggestion.variableCostPct, dailyCost:suggestion.dailyCost}));
    submitting.current = true;
    setPhase("processing");
    setProgress(0);
    timers.current.push(
      setTimeout(() => setProgress(1), 700),
      setTimeout(() => setProgress(2), 1400),
      setTimeout(() => {setRequirements(result); setPhase("review"); submitting.current = false;}, 2100),
    );
  }
  function analyze() {
    if (submitting.current) return;
    const invalid =
      (kind === "experiment" && inputMode === "prompt" ? [2] : [1, 2]).map(validate).find(Boolean) ||
      (!form.prompt.trim() ? "정리할 프롬프트를 입력하세요." : null);
    if (invalid) {
      setError(invalid);
      return;
    }
    submitting.current = true;
    setError("");
    setPhase("processing");
    setProgress(0);
    timers.current.push(
      setTimeout(() => setProgress(1), 1000),
      setTimeout(() => setProgress(2), 2000),
      setTimeout(() => {
        const result = extractPolicyRequirements(form.prompt);
        setRequirements(result);
        setSelectedScenario(null);
        setForm(current=>({...current,title:current.title.trim()||`${workspace.toUpperCase()} · ${current.prompt.trim().slice(0,60)}`,pricePct:result.pricePct??0}));
        if(aiirPolicy && result.pricePct !== null)setSalesTerms(current=>({...current,monthlyPrice:Math.round(current.baselinePrice*(1+result.pricePct!/100))}));
        setPhase("review");
        submitting.current = false;
      }, 3000),
    );
  }
  function run() {
    if (submitting.current) return;
    if (selectedScenario === null) {
      setError("검토할 정책 후보를 선택해주세요.");
      return;
    }
    const invalid = [1, 2, 3].map(validate).find(Boolean);
    if (invalid) {
      setError(invalid);
      return;
    }
    submitting.current = true;
    setError("");
    setPhase("saving");
    timers.current.push(
      setTimeout(() => {
        try {
          const at = new Date().toISOString();
          const summary = summarizeRequirements({
            ...requirements!,
            pricePct: form.pricePct,
          });
          const scenario = reviewSnapshot(
            candidate(),
            selectedScenario,
            summary,
          );
          let finish = start;
          if (kind === "event") {
            const event: MarketEvent = {
              id: `custom-${crypto.randomUUID()}`,
              title: form.title.trim(),
              types: [form.eventType as EventType],
              operator,
              channel: targetChannels.join(", ") || "전체",
              targetChannels,
              startAt: form.start,
              ...(form.end ? { endAt: form.end } : {}),
              sourceName: form.sourceName.trim(),
              sourceUrl: form.sourceUrl.trim() || undefined,
              sourceType: form.sourceType,
              prompt: form.prompt.trim(),
              processingMode: "demo",
              requirements: { ...requirements!, pricePct: form.pricePct },
              recordedBy: "마케터 · 요건 정리",
              recordedAt: at,
              summary,
              reviewScenario: scenario,
              before: "확인 필요",
              after: form.title.trim(),
              next: "원문 및 실적 변화 확인",
            };
            if (!isValidCustomEvent(event))
              throw new Error("이벤트 일시와 필수 정보를 확인하세요.");
            catalog.addEvent(event);
            finish = form.end.slice(0, 10) || start;
          } else {
            const policyId = store.attach({
              ...registrationScenario(candidate(), selectedScenario),
              description: `${form.title.trim()} · ${scenario.label}${aiirPolicy ? "\n" + aiirTermsSummary(salesTerms) : ""}\n${summarizeRequirements(registrationScenario(candidate(), selectedScenario).requirements!)}`,
              reviewScenario: scenario,
              id: `alt-${crypto.randomUUID()}`,
              history: [
                {
                  at,
                  action: directPolicy ? "직접 입력 판매정책 완료" : "프롬프트·AI 제안 판매정책 완료",
                },
              ],
            }, destination === "new" ? undefined : destination, directPolicy ? "direct" : automatic ? "ai" : "prompt");
            setSavedPolicyId(policyId);
            const selectedEnd = dayShift(
              scenario.start,
              scenario.applyDays - 1,
            );
            finish = selectedEnd > MAX_DATE ? MAX_DATE : selectedEnd;
          }
          setTimeline((current) => ({
            start: start < current.start ? start : current.start,
            end: finish > current.end ? finish : current.end,
          }));
          onSaved(start, finish);
          setPhase("done");
          setStep(4);
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "등록하지 못했습니다. 다시 시도하세요.",
          );
          setPhase("review");
        } finally {
          submitting.current = false;
        }
      }, 1000),
    );
  }
  const headings =
    kind === "event"
      ? [
          "이벤트 등록",
          "어떤 시장 변화인가요?",
          "언제, 어디에서 확인했나요?",
          "어떻게 정리할까요?",
          "타임라인에 반영했어요",
        ]
      : [
          "판매정책 등록",
          "어떤 정책을 검증할까요?",
          "정책 기간을 지정해주세요",
          inputMode==="prompt"?"어떤 정책을 검토할까요?":"가정과 요청을 확인하세요",
          "정책이 준비됐어요",
        ];
  return (
    <>
      <header className="flex shrink-0 items-start justify-between gap-4 border-b px-6 py-5 sm:px-8">
        <div>
          <p className="mb-1 text-[9px] font-semibold tracking-[0.18em] text-primary">
            PATH · 판매정책
          </p>
          <DialogTitle className="text-xl font-semibold">
            {phase === "processing"
              ? "AI가 요건을 분석하고 있어요"
              : phase === "review"
                ? kind === "event" ? "이벤트 내용을 확인해주세요" : directPolicy ? "입력한 정책을 확인해주세요" : "이런 정책을 요청하셨나요?"
                : phase === "saving"
                  ? kind === "experiment"
                    ? "판매정책 등록 중"
                    : "이벤트 등록 중"
                  : headings[step]}
          </DialogTitle>
          <DialogDescription className="mt-1 text-xs leading-5">
            {kind === "event" ? "시장 변화와 출처를 기록합니다." : "판매정책을 구성하고 캠페인에 반영합니다."}
          </DialogDescription>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="등록 위저드 닫기"
        >
          <X className="size-4" />
        </Button>
      </header>
      <div className="grid min-h-0 flex-1 md:grid-cols-[190px_1fr]">
        <aside className="border-b bg-muted/25 p-4 md:border-r md:border-b-0 md:p-6">
          <ol className="flex justify-between gap-2 md:flex-col md:gap-5">
            {steps.map((label, i) => kind === "event" && i === 0 ? null : (
              <li
                key={label}
                className={`flex items-center gap-2 text-xs ${i === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                aria-current={i === step ? "step" : undefined}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-[9px] ${i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-primary/20 bg-primary/10 text-primary" : "border-border"}`}
                >
                  {i < step ? <Check className="size-3" /> : kind === "event" ? i : i + 1}
                </span>
                <span className="hidden sm:inline">{directPolicy && label === "프롬프트" ? "정책 검토" : label}</span>
              </li>
            ))}
          </ol>
          <div className="mt-8 hidden border-t pt-4 text-xs leading-5 text-muted-foreground md:block">
            <p className="font-medium text-foreground">
              {workspace.toUpperCase()} 워크스페이스
            </p>
            <p className="mt-2">
              {kind === "event"
                ? "출처를 남기고 변화의 맥락을 기록합니다."
                : "이벤트 연결 없이 정책 가정을 검증합니다."}
            </p>
            <p className="mt-4">제안·수정·승인 이력은 학습 데이터로 저장됩니다</p>
          </div>
        </aside>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-6 py-6 sm:px-8">
          {phase === "processing" || phase === "saving" ? (
            <div
              className="flex min-h-80 flex-col items-center justify-center text-center"
              role="status"
              aria-live="polite"
            >
              <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                <LoaderCircle className="size-7 animate-spin text-primary motion-reduce:animate-none" />
              </div>
              <h3 className="text-lg font-semibold">
                {phase === "saving"
                  ? "타임라인에 등록하고 있어요"
                  : [
                      "입력 정보를 확인하고 있어요",
                      "프롬프트와 가정을 정리하고 있어요",
                      "변경 요인을 정형화하고 있어요",
                    ][progress]}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {phase === "saving"
                  ? "약 1초 후 등록이 완료됩니다."
                  : "정책 요건을 정리하고 있습니다."}
              </p>
              <div className="mt-8 flex gap-2">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-14 rounded-full ${i <= progress ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                닫으면 등록이 취소됩니다.
              </p>
            </div>
          ) : phase === "done" ? (
            <div
              className="flex min-h-80 flex-col items-center justify-center text-center"
              role="status"
            >
              <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CheckCheck className="size-8" />
              </div>
              <h3 className="text-xl font-semibold">
                {kind === "event"
                  ? "새 이벤트를 등록했습니다"
                  : "판매정책을 캠페인 초안에 반영했습니다"}
              </h3>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                {form.title}
                <br />
                {start} · {workspace.toUpperCase()}
              </p>
              <p className="mt-5 text-xs text-muted-foreground">
                {kind === "event" ? "조회 기간을 맞췄습니다. 타임라인에서 어노테이션을 확인하세요." : "캠페인에서 전체 시뮬레이션을 검토하고 등록·실행하세요."}
              </p>
              <Button
                className="mt-6"
                onClick={() => {
                  onClose();
                  router.push(kind === "experiment" && savedPolicyId !== "inbox" ? `/analysis?workspace=${encodeURIComponent(workspace)}&policy=${encodeURIComponent(savedPolicyId)}` : `/?workspace=${encodeURIComponent(workspace)}&view=${kind === "experiment" ? "experiments-search" : "summary"}`);
                }}
              >
                {kind === "experiment" ? "캠페인에서 검토" : "타임라인에서 보기"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {step === 0 && choosingMethod && !choosingPriorities && (
                <section className="space-y-5" aria-label="판매정책 등록 방식">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">판매정책을 어떻게 시작할까요?</h3>
                    <p className="text-sm text-muted-foreground">제안된 정책을 검토하거나 직접 정책 요건을 선택하세요.</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <button type="button" onClick={() => setChoosingPriorities(true)} className="group rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring">
                      <Sparkles className="mb-5 size-6 text-primary" />
                      <h4 className="font-semibold">AI 자동 제안</h4>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">입력 단계를 건너뛰고 중점 지표에 맞춘 정책 후보와 예상 차트를 바로 검토합니다.</p>
                    </button>
                    <button type="button" onClick={() => {setChoosingMethod(false);setAutomatic(false);setInputMode("direct");if(workspace === "aiir"){setTargetChannels([salesTerms.channel]);setForm(current=>({...current,title:current.title || `AIIR · ${salesTerms.planName} · ${salesTerms.channel} 판매조건`,prompt:current.prompt || aiirTermsSummary(salesTerms)}));}setStep(1);}} className="group rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring">
                      <FlaskConical className="mb-5 size-6 text-primary" />
                      <h4 className="font-semibold">직접 입력</h4>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">정책 유형·채널·기간·정책 요건을 직접 정하고 예상 결과를 비교합니다.</p>
                    </button>
                    <button type="button" onClick={()=>{setChoosingMethod(false);setAutomatic(false);setInputMode("prompt");setStep(3);}} className="rounded-xl border bg-card p-5 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring"><Sparkles className="mb-5 size-6 text-primary"/><h4 className="font-semibold">프롬프트 입력</h4><p className="mt-2 text-xs leading-5 text-muted-foreground">정책 요청을 작성하면 AI 요건 분석 후 변경 조건과 예상 결과를 검토합니다.</p></button>
                  </div>
                </section>
              )}
              {step === 0 && choosingPriorities && (
                <section className="space-y-5">
                  <h3 className="text-xl font-semibold">어떤 지표를 우선할까요?</h3>
                  <p className="text-sm text-muted-foreground">이번 정책의 우선순위를 선택하세요. 공통 설정은 유지됩니다.</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {priorities.map((focus,index)=><Field key={index} label={`${index+1}순위`}><select className={selectClass} value={focus} onChange={e=>{const next=[...priorities];const other=next.indexOf(e.target.value as Focus);[next[index],next[other]]=[next[other],next[index]];setPriorities(next);}}>{Object.entries(PRIORITY_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>)}
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4 text-sm space-y-2">
                    <p>기준 기간: {seed?.analysisContext?.start || query.get("start") || timeline.start} ~ {seed?.analysisContext?.end || query.get("end") || timeline.end}</p>
                    <p>대상: {workspace.toUpperCase()} · {targetChannels.join(", ") || "전체 채널"}</p>
                    <p className="text-xs text-muted-foreground">선택한 이벤트·변곡점이 있으면 해당 항목을, 없으면 조회 기간의 항목을 분석합니다. 다음 단계에서 정책 적용 기간과 예측 종료일을 지정합니다.</p>
                  </div>

                </section>
              )}
              {aiirPolicy && (step === 1 || phase === "review") && <AiirSalesTermsEditor value={salesTerms} onChange={v=>{setSalesTerms(v);setTargetChannels([v.channel]);setForm(current=>({...current,title:`AIIR · ${v.planName} · ${v.channel} 판매조건`,prompt:aiirTermsSummary(v)}));setSelectedScenario(null);}} channels={targetChannels} />}
              {step === 1 && (
                <>
                  <Field label={kind === "event" ? "이벤트 유형" : "정책 유형"}>
                    <select
                      className={selectClass}
                      value={
                        kind === "event" ? form.eventType : form.experimentType
                      }
                      onChange={(e) =>
                        kind === "event"
                          ? set("eventType", e.target.value)
                          : set("experimentType", e.target.value)
                      }
                    >
                      {kind === "event"
                        ? Object.entries(EVENT_TYPES).map(([key, v]) => (
                            <option key={key} value={key}>
                              {v.label}
                            </option>
                          ))
                        : ALTERNATIVE_TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                    </select>
                  </Field>
                  <Field label="제목">
                    <Input
                      value={form.title}
                      maxLength={100}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder={
                        kind === "event"
                          ? "예: 경쟁사 데이터 추가 혜택 발표"
                          : "예: 20GB 요금제 5% 인하 정책"
                      }
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="수행 주체">
                      <select
                        className={selectClass}
                        value={form.operator}
                        onChange={(e) => set("operator", e.target.value)}
                      >
                        {operators.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                        <option value="__new">+ 새 주체 추가</option>
                      </select>
                    </Field>
                  </div>
                  {!aiirPolicy && <ChannelSelector
                    value={targetChannels}
                    onChange={setTargetChannels}
                    extra={[
                      ...catalog.events.flatMap((e) => e.targetChannels ?? []),
                      ...store.policies.flatMap(p => latestRevision(p).items.flatMap(i => i.target.channels)),
                    ]}
                  />}
                  {targetChannels.some(
                    (c) => !CHANNELS.some((known) => known.id === c),
                  ) && (
                    <p className="text-xs text-muted-foreground">
                      신규 채널은 데이터 연결 전까지 관측·예측에 포함되지
                      않습니다.
                    </p>
                  )}
                  {form.operator === "__new" && (
                    <Field label="새 수행 주체">
                      <Input
                        value={form.customOperator}
                        maxLength={40}
                        onChange={(e) => set("customOperator", e.target.value)}
                        placeholder="추가할 수행 주체명"
                      />
                    </Field>
                  )}
                </>
              )}
              {step===1 && directPolicy && !aiirPolicy && <RequirementOptions value={requirements??{pricePct:form.pricePct,benefits:"",points:"",freeOffers:"",other:""}} price={form.pricePct} onPrice={v=>set("pricePct",v)} onChange={setRequirements}/>}
              {step === 2 && (
                <>
                  {kind === "event" && <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="발생 일시"><Input type="datetime-local" value={form.start} min={`${MIN_DATE}T00:00`} max={`${MAX_DATE}T23:59`} onInput={e=>set("start",e.currentTarget.value)}/></Field>
                    <Field label="종료 일시 · 선택"><Input type="datetime-local" value={form.end} min={form.start} max={`${MAX_DATE}T23:59`} onInput={e=>set("end",e.currentTarget.value)}/></Field>
                  </div>}
                  {kind === "experiment" ? (
                    <PolicyPeriodEditor value={{start,applyEnd:form.applyEnd,forecastEnd:form.forecastEnd}} channels={aiirPolicy?[salesTerms.channel]:targetChannels} onChange={v=>{setForm(current=>({...current,start:`${v.start}T09:00`,applyEnd:v.applyEnd,forecastEnd:v.forecastEnd}));setError("");}} />
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="출처 종류">
                          <select
                            className={selectClass}
                            value={form.sourceType}
                            onChange={(e) => set("sourceType", e.target.value)}
                          >
                            {[
                              "공식 발표",
                              "뉴스",
                              "요금제 페이지",
                              "내부 자료",
                              "API·데이터",
                              "직접 관측",
                            ].map((t) => (
                              <option key={t}>{t}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="출처 이름">
                          <Input
                            value={form.sourceName}
                            maxLength={160}
                            onChange={(e) => set("sourceName", e.target.value)}
                            placeholder="예: 통신사 공식 뉴스룸"
                          />
                        </Field>
                      </div>
                      <Field
                        label="출처 URL · 선택"
                        hint="입력한 URL은 근거 링크로 저장합니다. 페이지를 자동 수집하지 않습니다."
                      >
                        <Input
                          type="url"
                          value={form.sourceUrl}
                          maxLength={500}
                          onChange={(e) => set("sourceUrl", e.target.value)}
                          placeholder="https://…"
                        />
                      </Field>
                    </>
                  )}
                </>
              )}
              {step === 3 && (
                <>
                  {kind === "experiment" && phase === "review" && <Field label="완료한 판매정책을 어디에 반영할까요?" hint="기존 등록 정책을 선택하면 새 초안 버전으로 추가됩니다. 실행 중인 버전은 유지됩니다."><select aria-label="판매정책 캠페인 선택" className="h-10 w-full rounded-lg border bg-background px-3 text-sm" value={destination} disabled={Boolean(parentPolicyId)} onChange={e=>setDestination(e.target.value)}><option value="new">새 캠페인 만들기</option><option value="inbox">미배정 판매정책 작업함</option>{store.policies.filter(p=>p.workspace===workspace).map(p=><option key={p.id} value={p.id}>{latestRevision(p).name} · v{latestRevision(p).number}</option>)}</select></Field>}
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <Sparkles className="size-4" />
                    요건을 확인한 후 등록하세요. 
                  </div>
                  {phase === "edit" && (
                    <Field
                      label={
                        kind === "event"
                          ? "어떤 변화를 기록할까요?"
                          : "어떤 정책을 검토할까요?"
                      }
                      hint="프롬프트 원문과 선택한 정보를 함께 저장합니다."
                    >
                      <Textarea
                        className="min-h-32 resize-y text-sm leading-6"
                        value={form.prompt}
                        maxLength={2000}
                        onChange={(e) => set("prompt", e.target.value)}
                        placeholder={
                          kind === "event"
                            ? "변경된 가격·혜택, 적용 대상과 확인할 영향을 구체적으로 적어주세요."
                            : "예: 요금제 가격을 5% 인하하고 가입 혜택을 추가해 회선 증가를 검토해줘."
                        }
                      />
                    </Field>
                  )}
                  {phase === "edit" && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {kind === "event"
                          ? "이벤트 템플릿을 고르고 실제 내용으로 수정하세요"
                          : "추천 시나리오 · 선택 후 자유롭게 수정하세요"}
                      </p>
                      <div className="grid gap-2">
                        {(kind === "event"
                          ? EVENT_SUGGESTIONS
                          : EXPERIMENT_SUGGESTIONS
                        ).map((item, index) => (
                          <button
                            key={item.title}
                            type="button"
                            aria-pressed={form.prompt === item.prompt}
                            onClick={() => set("prompt", item.prompt)}
                            className="flex gap-3 rounded-lg border bg-card p-3 text-left text-xs leading-5 transition-colors hover:border-primary/50 hover:bg-primary/5 aria-pressed:border-primary aria-pressed:bg-primary/5 aria-pressed:ring-1 aria-pressed:ring-primary"
                          >
                            <span className="text-primary">0{index + 1}</span>
                            <span>
                              <strong className="font-medium">
                                {item.title}
                              </strong>
                              <span className="ml-2 text-muted-foreground">
                                {item.prompt}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {phase === "review" && requirements && (
                    <div className="space-y-4">
                      <div className="rounded-xl border bg-primary/5 p-4">
                        <p className="mb-2 text-xs font-semibold text-primary">
                          {directPolicy ? "입력한 정책 · 요약" : "AI 요건 분석 · 요약"}
                        </p>
                        <p className="text-sm leading-6">
                          {aiirPolicy ? aiirTermsSummary(salesTerms) : summarizeRequirements({
                            ...requirements,
                            pricePct: form.pricePct,
                          })}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {operator} ·{" "}
                          {targetChannels.join(", ") || "전체 채널"} ·{" "}
                          {kind === "event"
                            ? "이벤트 대응 검토용 14일 시뮬레이션"
                            : `적용 ${days(form.applyEnd)}일 / 예측 ${days(form.forecastEnd)}일`}
                        </p>
                      </div>
                      {automatic && (
                        <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs text-muted-foreground">적용 기간과 요건을 확인하세요.</p>
                          {generatedContext && <div className="space-y-2 text-xs leading-5 text-muted-foreground"><p>{generatedContext.reason}</p>
                            <details><summary className="cursor-pointer">반영한 이벤트·변곡점</summary><ul className="mt-2 list-disc space-y-1 pl-4">{catalog.events.filter(e=>generatedContext.eventIds?.includes(e.id)).map(e=><li key={e.id}>{e.startAt.slice(0,10)} · {e.title}</li>)}{generatedContext.pivotDates?.map(date=><li key={date}>{date} · 변곡점</li>)}</ul></details>
                            <Button type="button" size="sm" variant="outline" onClick={()=>{setPhase("edit");setStep(0);setChoosingMethod(true);setChoosingPriorities(true);setSelectedScenario(null);}}>우선순위 다시 선택</Button>
                          </div>}

                        </div>
                      )}
                      {kind === "experiment" && <PolicyPeriodEditor value={{start,applyEnd:form.applyEnd,forecastEnd:form.forecastEnd}} channels={aiirPolicy?[salesTerms.channel]:targetChannels} onChange={v=>{setForm(current=>({...current,start:`${v.start}T09:00`,applyEnd:v.applyEnd,forecastEnd:v.forecastEnd}));setError("");}} />}
                      <RegistrationScenarioReview
                        base={candidate()}
                        onMethodChange={kind === "experiment" ? setForecastMethod : undefined}
                        selected={selectedScenario}
                        onSelect={(index) => {
                          setSelectedScenario(index);
                          setError("");
                        }}
                      />
                      {kind === "event" && (
                        <p className="text-xs text-muted-foreground">
                          선택한 정책 비교 결과는 이벤트에 검토 기록으로
                          저장됩니다. 실제 정책 적용이나 별도 정책 자동 등록은
                          하지 않습니다.
                        </p>
                      )}
                      {!aiirPolicy && <details className="rounded-xl border p-4">
                        <summary className="cursor-pointer text-sm font-medium">
                          변경 요건 상세 · 수정
                        </summary>
                        <RequirementOptions
                          value={requirements}
                          price={form.pricePct}
                          onPrice={(value) => set("pricePct", value)}
                          onChange={setRequirements}
                        />
                      </details>}
                      {!directPolicy && <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer">
                          입력 프롬프트 보기
                        </summary>
                        <p className="mt-2 whitespace-pre-wrap leading-5">
                          {form.prompt}
                        </p>
                      </details>}
                    </div>
                  )}
                  <div className="rounded-lg border p-3 text-xs leading-6 text-muted-foreground">
                    <strong className="font-medium text-foreground">
                      {form.title}
                    </strong>
                    <br />
                    {operator} · {targetChannels.join(", ") || "전체 채널"} ·{" "}
                    {start}
                    <br />
                    {kind === "event"
                      ? `${form.sourceType} · ${form.sourceName}`
                      : `적용 ~ ${phase === "review" && selectedScenario !== null ? dayShift(start, (registrationScenario(candidate(), selectedScenario).applyDays ?? days(form.applyEnd)) - 1) : form.applyEnd} · 예측 ~ ${form.forecastEnd}`}
                    <br />
                    {phase === "review"
                      ? "확인 후 등록해야 타임라인에 반영됩니다."
                      : directPolicy ? "입력한 조건과 예상 결과를 검토한 후 등록합니다." : "AI로 요건 분석 후, 변경요인을 검토하고 등록할 수 있습니다."}
                  </div>
                </>
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <footer className="flex shrink-0 items-center justify-between border-t bg-background px-6 py-4 sm:px-8">
        <span className="text-xs text-muted-foreground">
          {phase === "done" ? "등록 완료" : choosingMethod ? "판매정책 · 등록 방식 선택" : `${kind === "event" ? step : step + 1} / ${kind === "event" ? 3 : 4} 단계`}
        </span>
        <div className="flex gap-2">
          {phase === "edit" && (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  if(automatic && step===2){setStep(0);setChoosingMethod(true);setChoosingPriorities(true);}
                  else if(kind==="experiment" && inputMode==="prompt" && step===3){setStep(0);setChoosingMethod(true);}
                  else if (choosingPriorities) setChoosingPriorities(false);
                  else if (choosingMethod) onClose();
                  else if (step === 0 || (kind === "event" && step === 1)) onClose();
                  else if (step === 1 && kind === "experiment") {setStep(0);setChoosingMethod(true);}
                  else {
                    setStep(step - 1);
                    setError("");
                  }
                }}
              >
                {(kind === "event" && step === 1) || (choosingMethod && !choosingPriorities) ? (
                  "취소"
                ) : (
                  <>
                    <ArrowLeft className="size-4" />
                    이전
                  </>
                )}
              </Button>
              {choosingPriorities && <Button onClick={()=>{setChoosingPriorities(false);setChoosingMethod(false);setAutomatic(true);setInputMode("prompt");setStep(2);setError("");}}>다음<ArrowRight className="size-4"/></Button>}
              {automatic && step===2 && !choosingMethod ? <Button onClick={autoSuggest}><Sparkles className="size-4"/>AI 제안</Button> : !choosingMethod && (step < 3 ? (
                <Button onClick={next}>
                  다음
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button onClick={analyze}>
                  <Sparkles className="size-4" />
                  AI로 요건 분석
                </Button>
              ))}
            </>
          )}
          {(phase === "processing" || phase === "saving") && (
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
          )}
          {phase === "review" && (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setPhase("edit");
                  if(directPolicy)setStep(1);else if(automatic)setStep(2);
                  setError("");
                }}
              >
                아니요, 수정할게요
              </Button>
              <Button disabled={selectedScenario === null} onClick={run}>
                {kind === "experiment" ? "판매정책 완료·반영" : "선택안으로 이벤트 등록"}
              </Button>
            </>
          )}
          {phase === "done" && (
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          )}
        </div>
      </footer>
    </>
  );
}
