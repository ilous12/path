"use client";
import { useState, useEffect, useRef } from "react";
import { Tags, LoaderCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useEventCatalog } from "@/components/market-performance/event-catalog";
import { useEventVisibility } from "@/components/market-performance/event-visibility";
import { EVENT_TYPES } from "@/components/market-performance/data";
import {
  DEFAULT_PREFERENCES,
  isReferenced,
  type AnalysisPreferences,
  type Focus,
} from "@/components/market-performance/analysis-preferences";
import { useAnalysisPreferences } from "@/components/market-performance/use-analysis-preferences";

import { TurningPointPrompt } from "@/components/market-performance/turning-point-prompt";
import { SourceManager } from "@/components/market-performance/source-manager";

export function ManagementConsole() {
  const { events } = useEventCatalog();
  const { hiddenIds } = useEventVisibility();
  const { preferences, save, workspace } = useAnalysisPreferences();
  const [draft, setDraft] = useState<AnalysisPreferences>(preferences);
  const [notice, setNotice] = useState("");
  const [action, setAction] = useState<"reset" | "save" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const requestAction = (next: "reset" | "save") => {
    setActionError("");
    setAction(next);
  };
  const applyAction = () => {
    if (busy || !action) return;
    const next = structuredClone(
      action === "reset" ? DEFAULT_PREFERENCES : draft,
    );
    setBusy(true);
    setActionError("");
    timer.current = setTimeout(() => {
      try {
        save(next);
        setDraft(next);
        if (action === "reset") {
          setTypePage(0);
          setTypeQuery("");
        }
        setNotice(
          action === "reset"
            ? "기본값으로 초기화하여 적용했습니다."
            : "설정을 시스템에 적용했습니다.",
        );
        setAction(null);
      } catch {
        setActionError(
          "설정을 적용하지 못했습니다. 브라우저 저장 공간을 확인한 후 다시 시도해 주세요.",
        );
      } finally {
        setBusy(false);
        timer.current = null;
      }
    }, 800);
  };
  const [typePage, setTypePage] = useState(0);
  const [typeQuery, setTypeQuery] = useState("");
  const filteredTypes = draft.typeDefinitions.filter((type) =>
    [type.label, type.description, type.origin === "AI" ? "AI 신규" : ""]
      .join(" ")
      .toLocaleLowerCase()
      .includes(typeQuery.trim().toLocaleLowerCase()),
  );
  const typePages = Math.max(1, Math.ceil(filteredTypes.length / 6));
  const currentTypePage = Math.min(typePage, typePages - 1);
  useEffect(() => {
    setDraft(preferences);
  }, [preferences]);
  const eligible = events.filter(
    (e) => !hiddenIds.includes(e.id) && isReferenced(e, draft),
  ).length;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy) requestAction("save");
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">설정</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace === "air" ? "air" : workspace.toUpperCase()} · 분석에
            참조할 정보와 판단의 우선순위를 설정합니다.
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => requestAction("reset")}
          >
            기본값
          </Button>
          <Button type="submit" disabled={busy}>
            설정 저장
          </Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          [
            "참조 소스",
            `${Object.values(draft.sources).filter(Boolean).length} / ${draft.sourceDefinitions.length}`,
          ],
          [
            "참조 이벤트 유형",
            `${Object.values(draft.types).filter(Boolean).length} / ${draft.typeDefinitions.length}`,
          ],
          ["분석 대상 미리보기", `${eligible} / ${events.length}건`],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <Card>
          <SourceManager draft={draft} onChange={setDraft} />
        </Card>
        <div className="flex min-w-0 flex-col">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="size-4" />
                참조 이벤트 유형
              </CardTitle>
              <CardDescription>
                소스와 유형이 모두 참조 대상인 이벤트를 분석에 포함합니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3">
              <Input
                type="search"
                aria-label="참조 이벤트 유형 검색"
                placeholder="이벤트 유형, 설명 검색"
                value={typeQuery}
                onChange={(event) => {
                  setTypeQuery(event.target.value);
                  setTypePage(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
              />
              <div className="grid min-h-[636px] auto-rows-[96px] content-start gap-3">
                {filteredTypes
                  .slice(currentTypePage * 6, currentTypePage * 6 + 6)
                  .map(({ id, ...type }) => (
                    <label
                      key={id}
                      className="flex flex-1 cursor-pointer items-center justify-between gap-4 rounded-lg border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {type.label}
                          {type.origin === "AI" && (
                            <Badge className="ml-2" variant="secondary">
                              AI 신규
                            </Badge>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </div>
                      <Switch
                        aria-label={`${type.label} 참조`}
                        checked={draft.types[id as keyof typeof EVENT_TYPES]}
                        onCheckedChange={(checked) =>
                          setDraft({
                            ...draft,
                            types: { ...draft.types, [id]: checked },
                          })
                        }
                      />
                    </label>
                  ))}
                {!filteredTypes.length && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    검색 결과가 없습니다.
                  </p>
                )}
              </div>
              <nav
                aria-label="참조 이벤트 유형 페이지 이동"
                className="flex items-center justify-between gap-2 border-t pt-3 text-sm"
              >
                <span className="text-muted-foreground">
                  {filteredTypes.length}건 · {currentTypePage + 1} / {typePages}{" "}
                  페이지
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={currentTypePage === 0}
                    onClick={() => setTypePage(currentTypePage - 1)}
                  >
                    이전
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={currentTypePage === typePages - 1}
                    onClick={() => setTypePage(currentTypePage + 1)}
                  >
                    다음
                  </Button>
                </div>
              </nav>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>AI 신규 유형 자동 등록</span>
                <Switch
                  checked={draft.autoRegisterTypes}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, autoRegisterTypes: checked })
                  }
                />
              </label>
              <p className="text-xs text-muted-foreground">
                AI 분류 결과에 새 유형이 있으면 자동 등록하고 참조 대상으로
                포함합니다.
              </p>
              <p className="text-xs text-muted-foreground">
                복합 유형은 선택한 유형이 하나 이상 포함되면 참조합니다.
                개별적으로 숨긴 이벤트는 항상 제외합니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>AI 판단</CardTitle>
          <CardDescription>
            중점 지표를 선택하면 현재 워크스페이스의 분석과 정책 제안에 판단
            우선순위로 반영합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">중점 지표</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  {
                    value: "growth",
                    label: "회선 성장",
                    description: "신규 가입과 회선 확대를 우선합니다.",
                  },
                  {
                    value: "retention",
                    label: "이탈 방어",
                    description: "해지 감소와 고객 유지를 우선합니다.",
                  },
                  {
                    value: "profit",
                    label: "수익성",
                    description: "매출 대비 순익과 마진을 우선합니다.",
                  },
                ] satisfies {
                  value: Focus;
                  label: string;
                  description: string;
                }[]
              ).map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${draft.focus === option.value ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                >
                  <input
                    type="radio"
                    name="judgment-focus"
                    value={option.value}
                    checked={draft.focus === option.value}
                    onChange={() => setDraft({ ...draft, focus: option.value })}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">
                      {option.label}
                    </span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              상단의 ‘설정 저장’을 누르면 적용됩니다.
            </p>
          </fieldset>
        </CardContent>
      </Card>
      <TurningPointPrompt
        value={draft.turningPointPrompt}
        onChange={(turningPointPrompt) =>
          setDraft({ ...draft, turningPointPrompt })
        }
      />
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      <AlertDialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setAction(null);
        }}
      >
        <AlertDialogContent aria-busy={busy}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "reset"
                ? "기본값으로 초기화할까요?"
                : "설정을 시스템에 적용할까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "reset"
                ? "현재 워크스페이스의 설정이 기본값으로 변경됩니다. 등록한 참조 소스와 수정한 설정도 초기화됩니다. 진행하시겠습니까?"
                : "현재 설정을 저장하고 타임라인·인사이트·상세 분석에 적용합니다. 진행하시겠습니까?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {busy && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 py-6 text-sm"
            >
              <LoaderCircle
                className="size-5 animate-spin"
                aria-hidden="true"
              />
              {action === "reset"
                ? "초기화하고 있습니다…"
                : "설정을 적용하고 있습니다…"}
            </div>
          )}
          {actionError && (
            <p role="alert" className="py-3 text-sm text-destructive">
              {actionError}
            </p>
          )}
          <AlertDialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setAction(null)}
            >
              취소
            </Button>
            <Button type="button" disabled={busy} onClick={applyAction}>
              {busy ? "처리 중…" : "진행"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-xs text-muted-foreground">
        설정은 현재 브라우저에 워크스페이스별로 저장됩니다. 원본 이벤트와
        회선·매출 실적은 변경하지 않습니다.
      </p>
    </form>
  );
}
