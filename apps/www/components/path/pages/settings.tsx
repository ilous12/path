"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { AnalysisPreferences } from "@/components/market-performance/analysis-preferences";
import { getEventType } from "@/components/market-performance/data";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { SourceManager } from "@/components/market-performance/source-manager";
import { useAnalysisPreferences } from "@/components/market-performance/use-analysis-preferences";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { TrendChart } from "../charts";
import { SETTINGS_TABS, type SettingsTab } from "../ia";
import type { Insight } from "../insights";
import { DEFAULT_CRITERIA, detectPivots, type PivotCriteria } from "../market";
import { AS_OF, BIZ, type Biz, fmt, perf } from "../model";
import { usePivotCriteria, useQueryState } from "../state";
import { InsightPanel, PageHeader, Section, Tag } from "../ui";

function useDraft() {
  const { preferences, save } = useAnalysisPreferences();
  const [draft, setDraft] = useState<AnalysisPreferences | null>(null);
  const value = draft ?? preferences;
  return {
    value,
    set: setDraft,
    dirty: draft !== null,
    commit: () => {
      if (!draft) return;
      save(draft);
      setDraft(null);
      toast.success({
        title: "설정을 저장했습니다",
        description: "모든 화면의 분석과 AI Insight에 반영됩니다.",
      });
    },
    discard: () => setDraft(null),
  };
}

function SaveBar({
  dirty,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {dirty && (
        <span className="text-[11px] text-amber-600">저장하지 않은 변경</span>
      )}
      <Button disabled={!dirty} onClick={onDiscard} size="sm" variant="ghost">
        되돌리기
      </Button>
      <Button disabled={!dirty} onClick={onSave} size="sm">
        저장
      </Button>
    </div>
  );
}

function Sources() {
  const d = useDraft();
  const { events } = useEventCatalog();
  const on = Object.values(d.value.sources).filter(Boolean).length;
  const insights: Insight[] = [
    {
      tone: "idea",
      title: `참조 소스 ${on} / ${d.value.sourceDefinitions.length}`,
      body: `전체 이벤트 ${fmt.n(events.length)}건 중 참조 소스에 해당하는 이벤트만 변곡점 원인 후보와 AI Insight 근거로 사용합니다.`,
    },
    {
      tone: on < d.value.sourceDefinitions.length / 2 ? "warn" : "up",
      title:
        on < d.value.sourceDefinitions.length / 2
          ? "참조 범위가 좁습니다"
          : "참조 범위가 충분합니다",
      body: "공식 뉴스룸·요금제 수집 소스를 우선 유지하세요.",
    },
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
      <Section
        actions={
          <SaveBar dirty={d.dirty} onDiscard={d.discard} onSave={d.commit} />
        }
        meta="수집·참조 대상 소스"
        title="참조 소스 관리"
      >
        <SourceManager draft={d.value} onChange={d.set} />
      </Section>
      <InsightPanel items={insights} scope={["참조 소스"]} />
    </div>
  );
}

function Types() {
  const d = useDraft();
  const { events } = useEventCatalog();
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of events)
      for (const t of e.types) m.set(t, (m.get(t) ?? 0) + 1);
    return m;
  }, [events]);
  const defs = d.value.typeDefinitions;
  const toggle = (id: string, v: boolean) =>
    d.set({ ...d.value, types: { ...d.value.types, [id]: v } });
  const off = defs.filter((t) => d.value.types[t.id] === false);
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
      <Section
        actions={
          <>
            <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
              AI 신규 유형 자동 등록
              <Switch
                checked={d.value.autoRegisterTypes}
                onCheckedChange={(v) =>
                  d.set({ ...d.value, autoRegisterTypes: v })
                }
                size="sm"
              />
            </label>
            <SaveBar dirty={d.dirty} onDiscard={d.discard} onSave={d.commit} />
          </>
        }
        meta={`${defs.length}개 유형`}
        title="참조 이벤트 유형 관리"
      >
        <ul className="grid gap-2 md:grid-cols-2">
          {defs.map((t) => (
            <li
              className="flex items-start gap-3 rounded-lg border p-3"
              key={t.id}
            >
              <span
                className="mt-1 size-3 shrink-0 rounded"
                style={{ background: getEventType(t.id).color }}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13px] font-medium">
                  {t.label}
                  <Tag>{t.origin === "AI" ? "AI 감지" : "기본"}</Tag>
                  <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                    {counts.get(t.id) ?? 0}건
                  </span>
                </p>
                <p className="line-clamp-2 text-[12px] text-muted-foreground">
                  {t.description}
                </p>
              </div>
              <Switch
                aria-label={`${t.label} 참조`}
                checked={d.value.types[t.id] !== false}
                onCheckedChange={(v) => toggle(t.id, v)}
                size="sm"
              />
            </li>
          ))}
        </ul>
      </Section>
      <InsightPanel
        items={[
          {
            tone: "idea",
            title: `참조 제외 ${off.length}개 유형`,
            body: off.length
              ? `${off.map((t) => t.label).join(", ")} 이벤트는 분석 근거에서 빠집니다.`
              : "모든 유형을 분석에 사용합니다.",
          },
          {
            tone: "up",
            title: "가장 많은 유형",
            body: [...counts.entries()]
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([k, n]) => `${getEventType(k).label} ${n}건`)
              .join(" · "),
          },
        ]}
        scope={["이벤트 유형"]}
      />
    </div>
  );
}

function Pivot() {
  const [saved, save] = usePivotCriteria();
  const d = useDraft();
  const [c, setC] = useState<PivotCriteria>(saved);
  const [biz, setBiz] = useState<Biz>("aiir");
  const range = useMemo(() => ({ start: "2026-06-01", end: AS_OF }), []);
  const pivots = useMemo(() => detectPivots(biz, range, c), [biz, c, range]);
  const rows = perf(biz, range).map((r) => ({ key: r.key, [biz]: r.lines }));
  const dirty = JSON.stringify(c) !== JSON.stringify(saved) || d.dirty;
  const field = (
    label: string,
    key: keyof PivotCriteria,
    suffix: string,
    step: number,
  ) => (
    <label className="space-y-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          className="h-9 w-full rounded-md border bg-background px-3 pr-10 text-sm tabular-nums"
          min={1}
          onChange={(e) => setC({ ...c, [key]: Number(e.target.value) || 1 })}
          step={step}
          type="number"
          value={c[key]}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px] text-muted-foreground">
          {suffix}
        </span>
      </div>
    </label>
  );
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <Section
          actions={
            <SaveBar
              dirty={dirty}
              onDiscard={() => {
                setC(saved);
                d.discard();
              }}
              onSave={() => {
                save(c);
                d.commit();
                toast.success({
                  title: "변곡점 기준을 저장했습니다",
                  description:
                    "이벤트 타임라인과 AI Insight가 새 기준으로 다시 계산됩니다.",
                });
              }}
            />
          }
          meta="직전 N일 평균 대비 변화율과 최소 변화량을 모두 넘으면 변곡점"
          title="변곡점 판단 기준"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {field("변화율 기준", "thresholdPct", "%", 1)}
            {field("최소 변화량", "minDelta", "회선", 5)}
            {field("비교 기간", "window", "일", 1)}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            기본값 ±{DEFAULT_CRITERIA.thresholdPct}% ·{" "}
            {DEFAULT_CRITERIA.minDelta}회선 · {DEFAULT_CRITERIA.window}일
            <Button
              className="h-6 px-2 text-[11px]"
              onClick={() => setC(DEFAULT_CRITERIA)}
              size="sm"
              variant="ghost"
            >
              기본값으로
            </Button>
          </div>
        </Section>
        <Section
          actions={
            <div className="flex gap-1">
              {(["aiir", "tdds", "mvvno"] as Biz[]).map((b) => (
                <Button
                  className="h-7 px-2.5 text-xs"
                  key={b}
                  onClick={() => setBiz(b)}
                  size="sm"
                  variant={b === biz ? "secondary" : "ghost"}
                >
                  {BIZ[b].name}
                </Button>
              ))}
            </div>
          }
          meta={`2026-06-01 이후 · 감지 ${pivots.length}건`}
          title="미리보기"
        >
          <TrendChart
            data={rows}
            height={220}
            markers={pivots.map((p) => ({
              x: p.date,
              color:
                p.pct < 0 ? "var(--color-rose-500)" : "var(--color-blue-600)",
            }))}
            series={[{ key: biz, name: BIZ[biz].name, color: BIZ[biz].color }]}
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pivots.map((p) => (
              <Link
                className="rounded border px-2 py-0.5 text-[11px] tabular-nums hover:border-primary/40"
                href={`/?workspace=${biz}&view=timeline&period=qtd`}
                key={p.date}
              >
                {fmt.md(p.date)} {fmt.pct(p.pct, 0)}
              </Link>
            ))}
          </div>
        </Section>
        <Section
          meta="변곡점 원인 해석에 사용하는 AI 지시문"
          title="판단 프롬프트"
        >
          <Textarea
            className="min-h-40 text-[12px] leading-relaxed"
            onChange={(e) =>
              d.set({ ...d.value, turningPointPrompt: e.target.value })
            }
            value={d.value.turningPointPrompt}
          />
        </Section>
      </div>
      <InsightPanel
        items={[
          {
            tone: pivots.length > 12 ? "warn" : "idea",
            title: `현재 기준으로 ${BIZ[biz].name} 변곡점 ${pivots.length}건`,
            body:
              pivots.length > 12
                ? "너무 민감합니다. 변화율 기준을 높이거나 비교 기간을 늘리세요."
                : pivots.length < 2
                  ? "감지가 적습니다. 기준을 낮춰 초기 신호를 놓치지 않도록 하세요."
                  : "노이즈와 신호의 균형이 적절합니다.",
          },
          ...(pivots[0]
            ? [
                {
                  tone: (pivots[0].pct < 0 ? "warn" : "up") as Insight["tone"],
                  title: `최근 변곡 ${fmt.md(pivots[0].date)} ${fmt.pct(pivots[0].pct, 0)}`,
                  body: `직전 ${c.window}일 평균 ${fmt.n(pivots[0].baseline)} → ${fmt.n(pivots[0].actual)}회선.`,
                },
              ]
            : []),
        ]}
        scope={[
          "변곡점 기준",
          BIZ[biz].name,
          `±${c.thresholdPct}% · ${c.minDelta}회선 · ${c.window}일`,
        ]}
      />
    </div>
  );
}

export function SettingsPage() {
  const { params } = useQueryState();
  const tab = (SETTINGS_TABS.find((t) => t.id === params.get("tab"))?.id ??
    "sources") as SettingsTab;
  const ws = params.get("workspace") ?? "home";
  return (
    <div className="space-y-4">
      <PageHeader
        description="모든 워크스페이스의 분석 기준을 관리합니다"
        eyebrow="공통 · 설정"
        title={SETTINGS_TABS.find((t) => t.id === tab)?.label ?? ""}
      />
      <nav aria-label="설정 영역" className="flex flex-wrap gap-1.5">
        {SETTINGS_TABS.map((t, i) => (
          <Link
            className={
              t.id === tab
                ? "rounded-md border border-primary/40 bg-primary/8 px-2.5 py-1 text-[12px] font-semibold"
                : "rounded-md border px-2.5 py-1 text-[12px] text-muted-foreground hover:bg-accent/50"
            }
            href={`/?workspace=${ws}&view=settings&tab=${t.id}`}
            key={t.id}
          >
            6.{i + 1} {t.label}
          </Link>
        ))}
      </nav>
      {tab === "sources" && <Sources />}
      {tab === "types" && <Types />}
      {tab === "pivot" && <Pivot />}
    </div>
  );
}
