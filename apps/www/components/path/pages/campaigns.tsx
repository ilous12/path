"use client";
import {
  ArrowRight,
  Check,
  CirclePause,
  CirclePlay,
  CircleStop,
  Flag,
  Plus,
  Save,
  Sparkles,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type * as React from "react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dayShift } from "@/components/market-performance/alternative-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  alternatives,
  blankParams,
  type Campaign,
  type CampaignParams,
  type CampaignStatus,
  CUSTOMER_LABEL,
  type Customers,
  type ForecastSummary,
  forecast,
  LTV_MONTHS,
  STATUS_LABEL,
  useCampaigns,
} from "../campaigns";
import { ChartTip } from "../charts";
import { CAMPAIGN_STEPS, type CampaignStep } from "../ia";
import { campaignInsights, performanceInsights } from "../insights";
import {
  CHANNEL_SETS,
  offersFor,
  operatorStats,
  SKKT_OPERATORS,
} from "../market";
import { AS_OF, BIZ, type Biz, days, fmt } from "../model";
import { useQueryState } from "../state";
import { InsightPanel, PageHeader, PSelect, Section, Tag } from "../ui";

const ALT_LABEL: Record<string, string> = {
  plan: "A · 입력안",
  lean: "B · 효율안",
  bold: "C · 공격안",
};

/* ───────────── Workspace vocabulary ───────────── */

function vocab(biz: Biz) {
  const mvvno = biz === "mvvno";
  return {
    benefit: mvvno ? "지원 조건" : "혜택",
    budget: mvvno ? "재원" : "예산",
    points: mvvno ? "유치 지원금(1회선)" : "포인트·사은품(1회선)",
    price: mvvno ? "도매대가 조정" : "월 요금 조정",
    target: mvvno ? "대상 망·사업자·상품" : "대상 요금제·채널·고객",
    plans: mvvno
      ? ["~10GB", "10~29GB", "30~99GB", "무제한·100GB+"]
      : [
          ...new Set(
            offersFor(biz)
              .filter((o) => o.owner === biz)
              .map((o) => o.name),
          ),
        ],
    channels: mvvno
      ? ["사업자 직영몰", "모요", "알뜰폰허브", "오프라인 대리점"]
      : CHANNEL_SETS[biz].map((c) => c.id),
    metrics: mvvno
      ? ["신규", "번호이동", "순증", "매출", "손익", "점유율"]
      : ["가입", "해지", "순증", "매출", "순익"],
  };
}

const STATUS_TONE: Record<CampaignStatus, string> = {
  draft: "border-border text-muted-foreground",
  approved: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  scheduled:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  running:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  paused:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  ended: "border-border bg-muted text-muted-foreground",
};
export function StatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge
      className={cn(
        "h-5 gap-1 px-1.5 text-[10.5px] shadow-none",
        STATUS_TONE[status],
      )}
      variant="outline"
    >
      {status === "running" && (
        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
      )}
      {STATUS_LABEL[status]}
    </Badge>
  );
}

/* ───────────── Shared pieces ───────────── */

function Stepper({
  biz,
  step,
  id,
}: {
  biz: Biz;
  step: CampaignStep;
  id?: string;
}) {
  const index = CAMPAIGN_STEPS.findIndex((s) => s.id === step);
  return (
    <nav
      aria-label="캠페인 단계"
      className="grid grid-cols-5 overflow-hidden rounded-xl border bg-card"
    >
      {CAMPAIGN_STEPS.map((s, i) => (
        <Link
          aria-current={s.id === step ? "step" : undefined}
          className={cn(
            "relative flex items-center gap-2.5 border-r px-3 py-2.5 text-[12.5px] transition-colors last:border-r-0 hover:bg-accent/50",
            s.id === step && "bg-primary/8 font-semibold text-foreground",
            i < index && "text-foreground",
            i > index && "text-muted-foreground",
          )}
          href={`/?workspace=${biz}&view=campaigns&step=${s.id}${id ? `&id=${id}` : ""}`}
          key={s.id}
        >
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums",
              s.id === step &&
                "border-primary bg-primary text-primary-foreground",
              i < index && "border-primary/40 bg-primary/10 text-primary",
            )}
          >
            {i < index ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className="truncate">{s.label}</span>
          {s.id === step && (
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
            />
          )}
        </Link>
      ))}
    </nav>
  );
}

function SummaryGrid({
  s,
  base,
  biz,
}: {
  s: ForecastSummary;
  base?: ForecastSummary;
  biz: Biz;
}) {
  const v = vocab(biz);
  const items: [string, string, string?][] = [
    [biz === "mvvno" ? "신규·번호이동" : "가입", `+${fmt.n(s.lines)}`, "회선"],
    [biz === "mvvno" ? "해지 방어" : "해지", fmt.signed(s.churn), "회선"],
    ["순증", `+${fmt.n(s.net)}`, "회선"],
    [`매출(LTV ${LTV_MONTHS}개월)`, fmt.won(s.revenue), "원"],
    [biz === "mvvno" ? "손익" : "순익", fmt.won(s.profit), "원"],
    [`비용 · ${v.budget}`, fmt.won(s.cost), "원"],
    ["ROI", fmt.rate(s.roi), ""],
    ["위험", s.risk, ""],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([k, val, unit]) => (
        <div className="rounded-lg border bg-muted/20 px-3 py-2" key={k}>
          <dt className="text-[11px] text-muted-foreground">{k}</dt>
          <dd
            className={cn(
              "text-[16px] font-semibold tabular-nums",
              k === "위험" &&
                (val === "높음"
                  ? "text-rose-600"
                  : val === "보통"
                    ? "text-amber-600"
                    : "text-emerald-600"),
              k.startsWith("순익") || k.startsWith("손익")
                ? s.profit < 0
                  ? "text-rose-600"
                  : ""
                : "",
            )}
          >
            {val}
            {unit && (
              <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">
                {unit}
              </span>
            )}
          </dd>
        </div>
      ))}
      {base && (
        <p className="col-span-full text-[11px] text-muted-foreground">
          미시행 대비 증분 · 매출은 증분 회선 × ARPU × {LTV_MONTHS}개월
        </p>
      )}
    </dl>
  );
}

function ForecastChart({
  lines,
  window,
  height = 260,
}: {
  lines: {
    key: string;
    name: string;
    color: string;
    rows: { key: string; value: number | null }[];
    dashed?: boolean;
  }[];
  window?: { start: string; end: string };
  height?: number;
}) {
  const keys = [
    ...new Set(lines.flatMap((l) => l.rows.map((r) => r.key))),
  ].sort();
  const data = keys.map((k) => ({
    key: k,
    ...Object.fromEntries(
      lines.map((l) => [l.key, l.rows.find((r) => r.key === k)?.value ?? null]),
    ),
  }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 4"
            vertical={false}
          />
          <XAxis
            axisLine={false}
            dataKey="key"
            minTickGap={28}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickFormatter={(v) => fmt.md(String(v))}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            width={40}
          />
          {window && (
            <ReferenceArea
              fill="var(--primary)"
              fillOpacity={0.06}
              x1={window.start}
              x2={window.end}
            />
          )}
          {AS_OF >= keys[0] && AS_OF <= keys.at(-1)! && (
            <ReferenceLine
              label={{
                value: "오늘",
                position: "top",
                fontSize: 10,
                fill: "var(--primary)",
              }}
              stroke="var(--primary)"
              x={AS_OF}
              zIndex={3000}
            />
          )}
          {lines.map((l) => (
            <Line
              connectNulls={false}
              dataKey={l.key}
              dot={false}
              isAnimationActive={false}
              key={l.key}
              name={l.name}
              stroke={l.color}
              strokeDasharray={l.dashed ? "5 4" : undefined}
              strokeWidth={l.dashed ? 1.6 : 2.2}
              type="monotone"
            />
          ))}
          <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <ChartTip
                  label={String(label)}
                  rows={lines.map((l) => ({
                    name: l.name,
                    color: l.color,
                    dashed: l.dashed,
                    value:
                      payload[0].payload[l.key] == null
                        ? "—"
                        : fmt.n(Number(payload[0].payload[l.key])),
                  }))}
                />
              ) : null
            }
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  min?: number;
}) {
  return (
    <Field>
      <FieldLabel className="text-[12px] text-muted-foreground">
        {label}
      </FieldLabel>
      <div className="relative">
        <Input
          className="h-9 pr-10 tabular-nums"
          min={min}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          step={step}
          type="number"
          value={value}
        />
        {suffix && (
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

function CheckGroup({
  label,
  options,
  value,
  onChange,
  hint,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  hint?: string;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="flex w-full items-baseline justify-between text-[12px] text-muted-foreground">
        {label}
        <span className="text-[11px]">
          {value.length ? `${value.length}개 선택` : (hint ?? "전체")}
        </span>
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] transition-colors",
                on ? "border-primary/50 bg-primary/8" : "hover:bg-accent/50",
              )}
              key={o}
            >
              <Checkbox
                aria-label={o}
                checked={on}
                onCheckedChange={(c) =>
                  onChange(c ? [...value, o] : value.filter((x) => x !== o))
                }
              />
              {o}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function useSelected(biz: Biz) {
  const { params, set } = useQueryState();
  const { items, ...store } = useCampaigns();
  const mine = items.filter((c) => c.workspace === biz);
  const id = params.get("id");
  const current =
    mine.find((c) => c.id === id) ??
    mine.find((c) => c.status === "running") ??
    mine[0];
  return {
    mine,
    current,
    select: (v: string) => set({ id: v }),
    store,
    all: items,
  };
}

function CampaignPicker({ biz }: { biz: Biz }) {
  const { mine, current, select } = useSelected(biz);
  if (!current) return null;
  return (
    <PSelect
      className="min-w-64"
      label="캠페인 선택"
      onChange={select}
      options={mine.map((c) => ({
        value: c.id,
        label: `[${STATUS_LABEL[c.status]}] ${c.name}`,
      }))}
      value={current.id}
    />
  );
}

/* ───────────── Steps ───────────── */

function RegisterStep({ biz }: { biz: Biz }) {
  const v = vocab(biz);
  const router = useRouter();
  const { create } = useCampaigns();
  const [name, setName] = useState("");
  const [change, setChange] = useState("");
  const [goal, setGoal] = useState({ lines: 3000, net: 2400 });
  const [p, setP] = useState<CampaignParams>(() =>
    blankParams(biz, {
      start: dayShift(AS_OF, 3),
      end: dayShift(AS_OF, 32),
      points: biz === "tdds" ? 20000 : 5000,
      budget: biz === "tdds" ? 200000000 : 50000000,
    }),
  );
  const patch = (x: Partial<CampaignParams>) => setP((s) => ({ ...s, ...x }));
  const alts = useMemo(() => alternatives(biz, p), [biz, p]);
  const plan = alts[1];
  const valid = name.trim() && p.start <= p.end;
  const submit = () => {
    const id = create(
      biz,
      name.trim(),
      change.trim() || `${v.benefit} 변경`,
      goal,
      p,
    );
    toast.success({
      title: "판매 정책을 등록했습니다",
      description: "결과 예측 단계에서 대안과 비교하세요.",
    });
    router.push(`/?workspace=${biz}&view=campaigns&step=forecast&id=${id}`);
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Section
        meta="변경 내용 · 대상 · 기간 · 혜택 · 예산 · 목표"
        title="판매 정책 등록"
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Field>
              <FieldLabel className="text-[12px] text-muted-foreground">
                정책명
              </FieldLabel>
              <Input
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  biz === "mvvno"
                    ? "예: 20GB+ 도매대가 한시 인하"
                    : "예: 번호이동 1만P 웰컴"
                }
                value={name}
              />
            </Field>
            <Field>
              <FieldLabel className="text-[12px] text-muted-foreground">
                변경 내용
              </FieldLabel>
              <Input
                onChange={(e) => setChange(e.target.value)}
                placeholder="무엇이 어떻게 바뀌나요?"
                value={change}
              />
            </Field>
          </div>
          <div className="space-y-3 rounded-xl border p-3">
            <h3 className="text-[12px] font-semibold">{v.target}</h3>
            {biz === "mvvno" && (
              <CheckGroup
                hint="SKKT망 전체"
                label="사업자"
                onChange={(x) => patch({ operators: x })}
                options={SKKT_OPERATORS.map((o) => o.name)}
                value={p.operators}
              />
            )}
            <CheckGroup
              label={biz === "mvvno" ? "상품군" : "요금제"}
              onChange={(x) => patch({ plans: x })}
              options={v.plans}
              value={p.plans}
            />
            <CheckGroup
              label="채널"
              onChange={(x) => patch({ channels: x })}
              options={v.channels}
              value={p.channels}
            />
            <div className="space-y-2">
              <p className="text-[12px] text-muted-foreground">고객</p>
              <ToggleGroup
                onValueChange={(x) =>
                  x[0] && patch({ customers: x[0] as Customers })
                }
                size="sm"
                value={[p.customers]}
                variant="outline"
              >
                {(Object.keys(CUSTOMER_LABEL) as Customers[]).map((k) => (
                  <ToggleGroupItem className="px-3 text-xs" key={k} value={k}>
                    {CUSTOMER_LABEL[k]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field>
              <FieldLabel className="text-[12px] text-muted-foreground">
                시작
              </FieldLabel>
              <Input
                onChange={(e) => patch({ start: e.target.value })}
                type="date"
                value={p.start}
              />
            </Field>
            <Field>
              <FieldLabel className="text-[12px] text-muted-foreground">
                종료
              </FieldLabel>
              <Input
                onChange={(e) => patch({ end: e.target.value })}
                type="date"
                value={p.end}
              />
            </Field>
            <NumberInput
              label={v.price}
              onChange={(x) => patch({ priceDeltaPct: x })}
              suffix="%"
              value={p.priceDeltaPct}
            />
            <NumberInput
              label={v.points}
              min={0}
              onChange={(x) => patch({ points: x })}
              step={1000}
              suffix="원"
              value={p.points}
            />
            <NumberInput
              label="데이터 추가"
              min={0}
              onChange={(x) => patch({ dataGb: x })}
              suffix="GB"
              value={p.dataGb}
            />
            <NumberInput
              label={v.budget}
              min={0}
              onChange={(x) => patch({ budget: x })}
              step={10000000}
              suffix="원"
              value={p.budget}
            />
            <NumberInput
              label="목표 가입"
              min={0}
              onChange={(x) => setGoal((g) => ({ ...g, lines: x }))}
              step={100}
              suffix="회선"
              value={goal.lines}
            />
            <NumberInput
              label="목표 순증"
              min={0}
              onChange={(x) => setGoal((g) => ({ ...g, net: x }))}
              step={100}
              suffix="회선"
              value={goal.net}
            />
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-[12px] text-muted-foreground">
              {days({ start: p.start, end: p.end })}일 · 예상 순증{" "}
              <span className="font-semibold text-foreground">
                +{fmt.n(plan.summary.net)}
              </span>{" "}
              (목표 대비{" "}
              {fmt.rate((plan.summary.net / Math.max(goal.net, 1)) * 100)})
            </p>
            <Button disabled={!valid} onClick={submit}>
              등록하고 결과 예측 <ArrowRight />
            </Button>
          </div>
        </div>
      </Section>
      <div className="space-y-4">
        <Section meta="입력하는 동안 실시간 계산" title="즉시 예측">
          <ForecastChart
            height={200}
            lines={[
              {
                key: "base",
                name: "미시행",
                color: "var(--muted-foreground)",
                dashed: true,
                rows: plan.rows.map((r) => ({ key: r.key, value: r.base })),
              },
              {
                key: "plan",
                name: "입력안",
                color: BIZ[biz].color,
                rows: plan.rows.map((r) => ({ key: r.key, value: r.plan })),
              },
            ]}
            window={{ start: p.start, end: p.end }}
          />
          <div className="mt-3">
            <SummaryGrid biz={biz} s={plan.summary} />
          </div>
        </Section>
        <InsightPanel
          compact
          items={campaignInsights(
            alts.map((a) => ({ label: a.label, summary: a.summary })),
          )}
          scope={[
            BIZ[biz].name,
            name || "새 정책",
            `${fmt.md(p.start)}–${fmt.md(p.end)}`,
          ]}
        />
      </div>
    </div>
  );
}

function ForecastStep({ biz }: { biz: Biz }) {
  const { current } = useSelected(biz);
  const alts = useMemo(
    () => (current ? alternatives(biz, current.params) : []),
    [biz, current],
  );
  const [chosen, setChosen] = useState("plan");
  if (!current) return <EmptyCampaign biz={biz} />;
  const colors: Record<string, string> = {
    base: "var(--muted-foreground)",
    plan: BIZ[biz].color,
    lean: "var(--color-sky-500)",
    bold: "var(--color-amber-500)",
  };
  const best = [...alts.slice(1)].sort(
    (a, b) => (b.summary.roi ?? -1) - (a.summary.roi ?? -1),
  )[0];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Section
          meta={`${fmt.md(current.params.start)}–${fmt.md(current.params.end)} · 미시행 대비`}
          title={`결과 예측 · ${current.name}`}
        >
          <ForecastChart
            lines={alts.map((a) => ({
              key: a.id,
              name: a.label,
              color: colors[a.id],
              dashed: a.id === "base",
              rows: a.rows.map((r) => ({ key: r.key, value: r.plan })),
            }))}
            window={{ start: current.params.start, end: current.params.end }}
          />
        </Section>
        <Section meta="효과 · 비용 · 위험 비교" title="대안 비교">
          <div className="grid gap-3 md:grid-cols-3">
            {alts.slice(1).map((a) => (
              <button
                className={cn(
                  "space-y-2 rounded-xl border p-3 text-left transition-all hover:border-primary/40",
                  chosen === a.id && "border-primary ring-2 ring-primary/20",
                )}
                key={a.id}
                onClick={() => setChosen(a.id)}
                type="button"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: colors[a.id] }}
                    />
                    {a.label}
                  </span>
                  {a === best && (
                    <Badge
                      className="h-5 gap-1 border-primary/30 bg-primary/10 px-1.5 text-[10px] text-primary shadow-none"
                      variant="outline"
                    >
                      <Sparkles className="size-3" /> AI 추천
                    </Badge>
                  )}
                </div>
                <p className="text-[22px] font-semibold tabular-nums">
                  +{fmt.n(a.summary.net)}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    순증
                  </span>
                </p>
                <dl className="grid grid-cols-3 gap-1 text-[11px]">
                  <div>
                    <dt className="text-muted-foreground">비용</dt>
                    <dd className="font-medium tabular-nums">
                      {fmt.won(a.summary.cost)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">ROI</dt>
                    <dd className="font-medium tabular-nums">
                      {fmt.rate(a.summary.roi)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">위험</dt>
                    <dd className="font-medium">{a.summary.risk}</dd>
                  </div>
                </dl>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  가격 {a.params.priceDeltaPct}% · 지원{" "}
                  {fmt.won(a.params.points)} · 데이터 {a.params.dataGb}GB
                </p>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <SummaryGrid
              base={alts[0].summary}
              biz={biz}
              s={alts.find((a) => a.id === chosen)?.summary ?? alts[1].summary}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t pt-4">
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/?workspace=${biz}&view=campaigns&step=adjust&id=${current.id}&alt=${chosen}`}
                />
              }
              variant="outline"
            >
              이 안으로 계획 조정 <ArrowRight />
            </Button>
          </div>
        </Section>
      </div>
      <InsightPanel
        items={campaignInsights(
          alts.map((a) => ({ label: a.label, summary: a.summary })),
        )}
        scope={[BIZ[biz].name, current.name, `v${current.versions.length}`]}
      />
    </div>
  );
}

function AdjustStep({ biz }: { biz: Biz }) {
  const v = vocab(biz);
  const { params } = useQueryState();
  const { current, store } = useSelected(biz);
  const alt = params.get("alt");
  const seed = useMemo(
    () =>
      current
        ? alt
          ? (alternatives(biz, current.params).find((a) => a.id === alt)
              ?.params ?? current.params)
          : current.params
        : null,
    [biz, current, alt],
  );
  const [draft, setDraft] = useState<CampaignParams | null>(null);
  if (!current || !seed) return <EmptyCampaign biz={biz} />;
  const p = draft ?? seed;
  const patch = (x: Partial<CampaignParams>) => setDraft({ ...p, ...x });
  const saved = forecast(biz, current.params);
  const next = forecast(biz, p);
  const span = days({ start: p.start, end: p.end });
  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    fmtv: (n: number) => string,
    on: (n: number) => void,
  ) => (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{fmtv(value)}</span>
      </div>
      <Slider
        aria-label={label}
        max={max}
        min={min}
        onValueChange={(x) => on(Array.isArray(x) ? x[0] : x)}
        step={step}
        value={value}
      />
    </div>
  );
  const diff = (a: number, b: number) => (
    <span
      className={cn(
        "text-[11px] tabular-nums",
        a - b >= 0 ? "text-emerald-600" : "text-rose-600",
      )}
    >
      {fmt.signed(a - b)}
    </span>
  );
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <Section
        meta={
          alt
            ? `${ALT_LABEL[alt] ?? alt} 기준으로 시작`
            : `v${current.versions.length} 기준`
        }
        title={`계획 조정 · ${current.name}`}
      >
        <div className="space-y-5">
          {slider(
            v.price,
            p.priceDeltaPct,
            -30,
            0,
            1,
            (n) => `${n}%`,
            (n) => patch({ priceDeltaPct: n }),
          )}
          {slider(
            v.points,
            p.points,
            0,
            biz === "tdds" ? 100000 : 30000,
            1000,
            (n) => `${fmt.n(n)}원`,
            (n) => patch({ points: n }),
          )}
          {slider(
            "데이터 추가",
            p.dataGb,
            0,
            30,
            1,
            (n) => `${n}GB`,
            (n) => patch({ dataGb: n }),
          )}
          {slider(
            v.budget,
            p.budget,
            0,
            biz === "tdds" ? 800000000 : 300000000,
            5000000,
            (n) => `${fmt.won(n)}원`,
            (n) => patch({ budget: n }),
          )}
          {slider(
            "기간",
            span,
            7,
            90,
            1,
            (n) => `${n}일`,
            (n) => patch({ end: dayShift(p.start, n - 1) }),
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel className="text-[12px] text-muted-foreground">
                시작
              </FieldLabel>
              <Input
                onChange={(e) =>
                  patch({
                    start: e.target.value,
                    end: dayShift(e.target.value, span - 1),
                  })
                }
                type="date"
                value={p.start}
              />
            </Field>
            <Field>
              <FieldLabel className="text-[12px] text-muted-foreground">
                종료
              </FieldLabel>
              <Input
                onChange={(e) => patch({ end: e.target.value })}
                type="date"
                value={p.end}
              />
            </Field>
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <Button
              disabled={!draft && !alt}
              onClick={() => setDraft(null)}
              variant="ghost"
            >
              되돌리기
            </Button>
            <Button
              onClick={() => {
                store.revise(
                  current.id,
                  p,
                  alt ? `${ALT_LABEL[alt] ?? alt} 반영 조정` : "조건 조정",
                );
                setDraft(null);
                toast.success({
                  title: `v${current.versions.length + 1} 저장`,
                  description: "재예측 결과를 새 버전으로 기록했습니다.",
                });
              }}
            >
              <Save /> 새 버전으로 저장
            </Button>
          </div>
        </div>
      </Section>
      <div className="space-y-4">
        <Section meta="저장된 버전 vs 조정안 · 실시간 재예측" title="재예측">
          <ForecastChart
            lines={[
              {
                key: "base",
                name: "미시행",
                color: "var(--muted-foreground)",
                dashed: true,
                rows: next.rows.map((r) => ({ key: r.key, value: r.base })),
              },
              {
                key: "saved",
                name: `v${current.versions.length}`,
                color: "var(--color-sky-400)",
                dashed: true,
                rows: saved.rows.map((r) => ({ key: r.key, value: r.plan })),
              },
              {
                key: "next",
                name: "조정안",
                color: BIZ[biz].color,
                rows: next.rows.map((r) => ({ key: r.key, value: r.plan })),
              },
            ]}
            window={{ start: p.start, end: p.end }}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                [
                  "순증",
                  next.summary.net,
                  saved.summary.net,
                  (n: number) => `+${fmt.n(n)}`,
                ],
                ["순익", next.summary.profit, saved.summary.profit, fmt.won],
                ["비용", next.summary.cost, saved.summary.cost, fmt.won],
                [
                  "ROI",
                  next.summary.roi ?? 0,
                  saved.summary.roi ?? 0,
                  (n: number) => fmt.rate(n),
                ],
              ] as const
            ).map(([k, a, b, f]) => (
              <div className="rounded-lg border px-3 py-2" key={k}>
                <p className="text-[11px] text-muted-foreground">{k}</p>
                <p className="flex items-baseline gap-1.5 text-[16px] font-semibold tabular-nums">
                  {f(a)} {diff(a, b)}
                </p>
              </div>
            ))}
          </div>
        </Section>
        <Section meta={`${current.versions.length}개 버전`} title="계획 버전">
          <ol className="space-y-1.5 text-[12px]">
            {[...current.versions].reverse().map((ver) => {
              const s = forecast(biz, ver.params).summary;
              return (
                <li
                  className="grid grid-cols-[36px_1fr_auto_auto] items-center gap-3 rounded-md border px-2.5 py-1.5"
                  key={ver.n}
                >
                  <span className="font-semibold">v{ver.n}</span>
                  <span className="truncate text-muted-foreground">
                    {ver.note} · {ver.at.slice(0, 10)}
                  </span>
                  <span className="tabular-nums">+{fmt.n(s.net)}</span>
                  <span className="text-muted-foreground tabular-nums">
                    ROI {fmt.rate(s.roi)}
                  </span>
                </li>
              );
            })}
          </ol>
        </Section>
      </div>
    </div>
  );
}

const FLOW: {
  status: CampaignStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: CampaignStatus[];
}[] = [
  { status: "draft", label: "초안", icon: Timer, to: ["approved"] },
  {
    status: "approved",
    label: "확정",
    icon: Flag,
    to: ["scheduled", "running"],
  },
  {
    status: "scheduled",
    label: "예약",
    icon: Timer,
    to: ["running", "paused"],
  },
  {
    status: "running",
    label: "진행",
    icon: CirclePlay,
    to: ["paused", "ended"],
  },
  {
    status: "paused",
    label: "중단",
    icon: CirclePause,
    to: ["running", "ended"],
  },
  { status: "ended", label: "종료", icon: CircleStop, to: [] },
];
const ACTION: Partial<Record<CampaignStatus, string>> = {
  approved: "최종안 확정",
  scheduled: "예약",
  running: "진행",
  paused: "중단",
  ended: "종료",
};

function ExecuteStep({ biz }: { biz: Biz }) {
  const { mine, store } = useSelected(biz);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {FLOW.map((col) => {
          const list = mine.filter((c) => c.status === col.status);
          return (
            <section
              className="flex min-h-64 flex-col rounded-xl border bg-muted/20"
              key={col.status}
            >
              <header className="flex items-center gap-2 border-b px-3 py-2">
                <col.icon className="size-3.5 text-muted-foreground" />
                <h3 className="text-[12.5px] font-semibold">{col.label}</h3>
                <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
                  {list.length}
                </span>
              </header>
              <div className="flex-1 space-y-2 p-2">
                {list.map((c) => {
                  const s = forecast(biz, c.params).summary;
                  return (
                    <article
                      className="space-y-2 rounded-lg border bg-card p-2.5 shadow-xs"
                      key={c.id}
                    >
                      <Link
                        className="line-clamp-2 text-[12.5px] font-medium leading-snug hover:underline"
                        href={`/?workspace=${biz}&view=campaigns&step=analyze&id=${c.id}`}
                      >
                        {c.name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {fmt.md(c.params.start)}~{fmt.md(c.params.end)} · +
                        {fmt.n(s.net)} · v{c.versions.length}
                      </p>
                      {!!col.to.length && (
                        <div className="flex flex-wrap gap-1">
                          {col.to.map((t) => (
                            <Button
                              className="h-6 px-2 text-[11px]"
                              key={t}
                              onClick={() => {
                                store.setStatus(c.id, t);
                                toast.success({
                                  title: `${c.name} · ${STATUS_LABEL[t]}`,
                                  description: "상태 변경 이력을 기록했습니다.",
                                });
                              }}
                              size="sm"
                              variant={
                                t === "ended" || t === "paused"
                                  ? "outline"
                                  : "secondary"
                              }
                            >
                              {ACTION[t]}
                            </Button>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      <Section meta="최근 상태 변경" title="실행 이력">
        <ul className="grid gap-1.5 text-[12px] md:grid-cols-2">
          {mine
            .flatMap((c) => c.history.map((h) => ({ ...h, name: c.name })))
            .sort((a, b) => b.at.localeCompare(a.at))
            .slice(0, 10)
            .map((h) => (
              <li
                className="flex gap-3 rounded-md border px-2.5 py-1.5"
                key={`${h.at}${h.name}${h.action}`}
              >
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {h.at.slice(5, 16).replace("T", " ")}
                </span>
                <span className="truncate font-medium">{h.name}</span>
                <span className="ml-auto shrink-0 text-muted-foreground">
                  {h.action}
                </span>
              </li>
            ))}
        </ul>
      </Section>
    </div>
  );
}

function AnalyzeStep({ biz }: { biz: Biz }) {
  const { current } = useSelected(biz);
  if (!current) return <EmptyCampaign biz={biz} />;
  const { rows, summary } = forecast(biz, current.params);
  const seen = rows.filter((r) => r.actual !== null && r.inWindow);
  const actualLift = seen.reduce((s, r) => s + (r.actual ?? 0) - r.base, 0);
  const planLift = seen.reduce((s, r) => s + r.plan - r.base, 0);
  const rate = planLift ? (actualLift / planLift) * 100 : null;
  const ops =
    biz === "mvvno"
      ? operatorStats({
          start: current.params.start,
          end: current.params.end < AS_OF ? current.params.end : AS_OF,
        })
      : [];
  const kpis: [string, string, string?][] = [
    ["예측 대비 달성", fmt.rate(rate), `관측 ${seen.length}일`],
    ["실제 증분", fmt.signed(actualLift), "기준선 대비 회선"],
    [
      "목표 대비(전망)",
      fmt.rate((summary.net / Math.max(current.goal.net, 1)) * 100),
      `목표 ${fmt.n(current.goal.net)}`,
    ],
    [
      biz === "mvvno" ? "재원 효율" : "순증당 비용",
      summary.net ? `${fmt.won(summary.cost / summary.net)}원` : "—",
      "비용 ÷ 순증",
    ],
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map(([k, v, n]) => (
            <div className="rounded-xl border bg-card p-3.5" key={k}>
              <p className="text-[11px] text-muted-foreground">{k}</p>
              <p className="mt-1 text-[22px] font-semibold leading-none tabular-nums">
                {v}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{n}</p>
            </div>
          ))}
        </div>
        <Section
          actions={<StatusBadge status={current.status} />}
          meta={`${fmt.md(current.params.start)}–${fmt.md(current.params.end)} · 예측 대비 실제 실적 추이`}
          title={current.name}
        >
          <ForecastChart
            height={300}
            lines={[
              {
                key: "base",
                name: "미시행 기준선",
                color: "var(--muted-foreground)",
                dashed: true,
                rows: rows.map((r) => ({ key: r.key, value: r.base })),
              },
              {
                key: "plan",
                name: "예측",
                color: "var(--color-sky-400)",
                dashed: true,
                rows: rows.map((r) => ({ key: r.key, value: r.plan })),
              },
              {
                key: "actual",
                name: "실제",
                color: BIZ[biz].color,
                rows: rows.map((r) => ({ key: r.key, value: r.actual })),
              },
            ]}
            window={{ start: current.params.start, end: current.params.end }}
          />
        </Section>
        {biz === "mvvno" && (
          <Section
            meta="캠페인 기간 SKKT망 사업자별 가입"
            title="사업자별 기여도"
          >
            <div className="grid gap-2 md:grid-cols-2">
              {ops.slice(0, 8).map((o) => (
                <div
                  className="flex items-center gap-3 text-[12px]"
                  key={o.name}
                >
                  <span className="w-28 truncate">{o.name}</span>
                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${o.share}%`,
                        background: BIZ.mvvno.color,
                      }}
                    />
                  </span>
                  <span className="w-12 text-right tabular-nums">
                    {fmt.rate(o.share, 1)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
      <div className="space-y-4">
        <InsightPanel
          items={performanceInsights(current)}
          scope={[BIZ[biz].name, current.name, STATUS_LABEL[current.status]]}
        />
        <Section title="개선안">
          <ul className="space-y-2 text-[12.5px]">
            {(rate ?? 100) < 90 && (
              <li className="flex gap-2">
                <Tag>채널</Tag>성과가 낮은 채널 노출을 줄이고 상위 2개 채널에
                집중
              </li>
            )}
            {summary.roi !== null && summary.roi < 30 && (
              <li className="flex gap-2">
                <Tag>{vocab(biz).budget}</Tag>
                {vocab(biz).points}를 20% 낮춘 효율안 재예측
              </li>
            )}
            <li className="flex gap-2">
              <Tag>기간</Tag>종료 후 7일 관측값으로 잔존 효과(carry-over) 확인
            </li>
            <li className="flex gap-2">
              <Tag>학습</Tag>결과가 다음 예측 모델의 가중치로 반영됩니다
            </li>
          </ul>
          <div className="mt-3 flex justify-end">
            <Button
              nativeButton={false}
              render={
                <Link
                  href={`/?workspace=${biz}&view=campaigns&step=adjust&id=${current.id}`}
                />
              }
              size="sm"
              variant="outline"
            >
              조건 수정 · 재예측 <ArrowRight />
            </Button>
          </div>
        </Section>
      </div>
    </div>
  );
}

function EmptyCampaign({ biz }: { biz: Biz }) {
  return (
    <Section title="캠페인이 없습니다">
      <Button
        nativeButton={false}
        render={
          <Link href={`/?workspace=${biz}&view=campaigns&step=register`} />
        }
      >
        <Plus /> 판매 정책 등록
      </Button>
    </Section>
  );
}

export function CampaignsPage({ biz }: { biz: Biz }) {
  const { params } = useQueryState();
  const step = (CAMPAIGN_STEPS.find((s) => s.id === params.get("step"))?.id ??
    "register") as CampaignStep;
  const { current } = useSelected(biz);
  const label = CAMPAIGN_STEPS.find((s) => s.id === step)?.label;
  const desc: Record<CampaignStep, string> = {
    register:
      biz === "mvvno"
        ? "판매 정책 변경 내용, 대상 망·사업자·상품·채널, 기간·지원 조건·재원·목표"
        : "판매 정책 변경 내용, 대상 요금제·채널·고객, 기간·혜택·예산·목표",
    forecast: `미시행 대비 ${vocab(biz).metrics.join("·")} 예측과 대안별 효과·비용·위험 비교`,
    adjust: `예측 결과를 반영한 ${vocab(biz).benefit}·${vocab(biz).budget}·기간 수정 및 재예측`,
    execute: "최종안 확정, 예약·진행·중단·종료 관리",
    analyze:
      biz === "mvvno"
        ? "예측 대비 실제 실적 추이, 사업자별 기여도, 재원 효율 및 개선안"
        : "예측 대비 실제 실적 추이, 목표 달성률 및 개선안",
  };
  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <>
            {step !== "register" && step !== "execute" && (
              <CampaignPicker biz={biz} />
            )}
            {current && step !== "register" && step !== "execute" && (
              <StatusBadge status={current.status} />
            )}
            {step !== "register" && (
              <Button
                nativeButton={false}
                render={
                  <Link
                    href={`/?workspace=${biz}&view=campaigns&step=register`}
                  />
                }
                size="sm"
              >
                <Plus /> 새 판매 정책
              </Button>
            )}
          </>
        }
        description={desc[step]}
        eyebrow={<>{BIZ[biz].name} · 판매 정책·캠페인</>}
        title={label ?? "등록"}
      />
      <Stepper biz={biz} id={current?.id} step={step} />
      {step === "register" && <RegisterStep biz={biz} />}
      {step === "forecast" && <ForecastStep biz={biz} key={current?.id} />}
      {step === "adjust" && (
        <AdjustStep biz={biz} key={`${current?.id}${params.get("alt")}`} />
      )}
      {step === "execute" && <ExecuteStep biz={biz} />}
      {step === "analyze" && <AnalyzeStep biz={biz} />}
    </div>
  );
}

export type { Campaign };
