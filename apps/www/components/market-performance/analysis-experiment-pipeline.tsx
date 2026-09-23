"use client";
import { PolicySimulator } from "./policy-simulator";
import { useEffect, useRef, useState } from "react";
import { Sparkles, LoaderCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogPortal,
  DialogBackdrop,
  DialogViewport,
  DialogPopup,
} from "@/components/ui/dialog";
import {
  RegistrationWizard,
  type RegistrationSeed,
} from "./registration-wizard";
import {
  scopeAnalysis,
  scopeExperimentProposals,
} from "./channel-analysis-model";
import type { Range } from "./data";
export function AnalysisExperimentPipeline({
  range,
  workspace,
  channels = [],
}: {
  range: Range;
  workspace: string;
  channels?: string[];
}) {
  const key = `${workspace}:${range.start}:${range.end}:${channels.join(",")}`;
  return (
    <Pipeline
      key={key}
      range={range}
      workspace={workspace}
      channels={channels}
    />
  );
}
function Pipeline({
  range,
  workspace,
  channels,
}: {
  range: Range;
  workspace: string;
  channels: string[];
}) {
  const report = scopeAnalysis(range, channels);
  const [phase, setPhase] = useState("idle");
  const [seed, setSeed] = useState<RegistrationSeed | null>(null);
  const [notice, setNotice] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const proposals = scopeExperimentProposals(range, channels);
  const [selected, setSelected] = useState(0);
  const configure = (i: number) => {
    const p = proposals[i];
    setSeed({
      title: p.title,
      type:
        i === 1
          ? "혜택 변경"
          : i === 2 && p.prompt.includes("인하")
            ? "가격 조정"
            : "운영 개선",
      prompt: p.prompt,
      channels,
      analysisContext: { ...range, workspace, channels, reason: p.reason },
    });
  };
  return (
    <section
      className="space-y-4 rounded-xl border bg-card p-5"
      aria-label="분석에서 정책으로"
    >
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-primary">
            기간별 분석 → AI 정책 제안 → 선택 → 정책 반영
          </p>
          <h2 className="text-lg font-semibold">
            {workspace.toUpperCase()} · {channels.join(", ") || "전체 채널"}{" "}
            정책 제안
          </h2>
        </div>
        <Button
          disabled={phase === "loading" || !report.rows.length}
          onClick={() => {
            setPhase("loading");
            timer.current = setTimeout(() => setPhase("ready"), 1800);
          }}
        >
          {phase === "loading" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {phase === "loading" ? "분석 근거 정리 중" : "AI 정책 3건 제안"}
        </Button>
      </div>
      <p className="text-sm leading-6">{report.reason}</p>
      
      {phase === "ready" && (
        <div className="space-y-4">
          <PolicySimulator
            range={range}
            channels={channels}
            events={[]}
            selectedIndex={selected}
            onSelectionChange={setSelected}
            onDetail={configure}
            alternatives={proposals.map((p, i) => ({
              title: p.title,
              tag: "검토 후보",
              benefit: p.reason,
              cost:
                i === 0
                  ? "추가 비용 없음"
                  : i === 1
                    ? "유지 보상 지급 비용 확인"
                    : "가격 조정·운영 비용 확인",
              risk: p.guard,
              condition: p.guard,
            }))}
          />
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => configure(selected)}>
              정책 {selected + 1} · 요건 확인 및 등록
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      <Dialog
        open={Boolean(seed)}
        onOpenChange={(open) => {
          if (!open) setSeed(null);
        }}
      >
        <DialogPortal>
          <DialogBackdrop className="z-50 bg-black/35 backdrop-blur-md" />
          <DialogViewport className="z-50 flex items-center justify-center p-3 sm:p-6">
            <DialogPopup className="relative flex h-[min(760px,92dvh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
              {seed && (
                <RegistrationWizard
                  workspace={workspace}
                  defaultStart={range.end}
                  initialKind="experiment"
                  seed={seed}
                  onClose={() => setSeed(null)}
                  onSaved={() =>
                    setNotice(
                      "선택한 분석 기간과 채널을 포함해 정책을 등록했습니다.",
                    )
                  }
                />
              )}
            </DialogPopup>
          </DialogViewport>
        </DialogPortal>
      </Dialog>
    </section>
  );
}
