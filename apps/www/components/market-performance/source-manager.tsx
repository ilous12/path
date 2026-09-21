"use client";
import { getEventType } from "@/components/market-performance/data";

import { useState } from "react";
import { Plus, Pencil, Trash2, Database } from "lucide-react";
import {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EVENT_TYPES, type EventType } from "./data";
import type {
  AnalysisPreferences,
  ReferenceSource,
} from "./analysis-preferences";
export function SourceManager({
  draft,
  onChange,
}: {
  draft: AnalysisPreferences;
  onChange: (next: AnalysisPreferences) => void;
}) {
  const [editing, setEditing] = useState<ReferenceSource | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const filteredSources = draft.sourceDefinitions.filter((source) =>
    [source.name, source.group, source.operator, source.channel, source.url]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filteredSources.length / 6));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleSources = filteredSources.slice(
    currentPage * 6,
    currentPage * 6 + 6,
  );
  const open = (source?: ReferenceSource) => {
    setError("");
    setEditing(
      source ?? {
        id: `source-${crypto.randomUUID()}`,
        name: "",
        group: "등록 소스",
        operator: "",
        channel: "",
        url: "",
        typeMode: "auto",
        selectedTypes: [],
        analysisMethod: "AI",
      },
    );
  };
  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Database className="size-4" />
            참조 소스
          </CardTitle>
          <CardDescription>
            정보가 들어오는 출처입니다. 분석에 참조할지를 선택합니다.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => open()}
        >
          <Plus className="size-4" />
          소스 등록
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="search"
          aria-label="참조 소스 검색"
          placeholder="소스명, 사업자, 채널, URL 검색"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.preventDefault();
          }}
        />
        <div className="grid min-h-[636px] auto-rows-[96px] content-start gap-3">
          {visibleSources.map((source) => (
            <div key={source.id} className="min-w-0 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-sm font-semibold"
                    title={source.name}
                  >
                    {source.name}
                  </p>
                  <p
                    className="truncate text-xs text-muted-foreground"
                    title={`${source.group} · AI · ${source.typeMode === "auto" ? "유형 자동 선택" : source.selectedTypes.map((t) => getEventType(t).label).join(" · ")}`}
                  >
                    {source.group} · AI ·{" "}
                    {source.typeMode === "auto"
                      ? "유형 자동 선택"
                      : source.selectedTypes
                          .map((t) => getEventType(t).label)
                          .join(" · ")}
                  </p>
                </div>
                <Switch
                  aria-label={`${source.name} 참조`}
                  checked={draft.sources[source.id] ?? true}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...draft,
                      sources: { ...draft.sources, [source.id]: checked },
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${source.name} 수정`}
                  onClick={() =>
                    open({
                      ...source,
                      selectedTypes: [...source.selectedTypes],
                    })
                  }
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${source.name} 삭제`}
                  onClick={() => {
                    const sources = { ...draft.sources };
                    delete sources[source.id];
                    onChange({
                      ...draft,
                      sources,
                      deletedSourceUrls: source.url
                        ? [...draft.deletedSourceUrls, source.url]
                        : draft.deletedSourceUrls,
                      sourceDefinitions: draft.sourceDefinitions.filter(
                        (s) => s.id !== source.id,
                      ),
                    });
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p
                className="mt-2 truncate text-xs text-muted-foreground"
                title={source.url || "URL 미등록"}
              >
                {source.url || "URL 미등록"}
              </p>
            </div>
          ))}
          {!filteredSources.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {query.trim()
                ? "검색 결과가 없습니다."
                : "등록된 소스가 없습니다."}
            </p>
          )}
        </div>
        <nav
          aria-label="참조 소스 페이지 이동"
          className="flex items-center justify-between gap-2 border-t pt-3 text-sm"
        >
          <span className="text-muted-foreground">
            {filteredSources.length}건 · {currentPage + 1} / {pageCount} 페이지
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              이전
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentPage === pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              다음
            </Button>
          </div>
        </nav>
        <p className="text-xs text-muted-foreground">
          삭제·참조 변경은 설정 저장 후 적용됩니다. 삭제한 소스의 이벤트 기록은
          보존하며 분석에서는 제외합니다.
        </p>
        <Dialog
          open={!!editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        >
          <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {draft.sourceDefinitions.some((s) => s.id === editing?.id)
                  ? "소스 수정"
                  : "소스 등록"}
              </DialogTitle>
              <DialogDescription>
                소스 URL과 유형 분류 방식을 지정합니다. 분석은 AI 방식만
                제공합니다.
              </DialogDescription>
            </DialogHeader>
            {editing && (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  let url: URL;
                  try {
                    url = new URL(editing.url);
                    if (!["http:", "https:"].includes(url.protocol))
                      throw Error();
                  } catch {
                    setError("http 또는 https 소스 URL을 입력하세요.");
                    return;
                  }
                  if (
                    editing.typeMode === "manual" &&
                    !editing.selectedTypes.length
                  ) {
                    setError("이벤트 유형을 하나 이상 선택하세요.");
                    return;
                  }
                  if (
                    draft.sourceDefinitions.some(
                      (s) =>
                        s.id !== editing.id &&
                        s.url.replace(/\/$/, "") ===
                          url.href.replace(/\/$/, ""),
                    )
                  ) {
                    setError("이미 등록된 소스 URL입니다.");
                    return;
                  }
                  const next = {
                    ...editing,
                    name: editing.name.trim(),
                    url: url.href,
                    analysisMethod: "AI" as const,
                  };
                  if (!next.name) {
                    setError("소스 이름을 입력하세요.");
                    return;
                  }
                  onChange({
                    ...draft,
                    sources: {
                      ...draft.sources,
                      [next.id]: draft.sources[next.id] ?? true,
                    },
                    sourceDefinitions: draft.sourceDefinitions.some(
                      (s) => s.id === next.id,
                    )
                      ? draft.sourceDefinitions.map((s) =>
                          s.id === next.id ? next : s,
                        )
                      : [...draft.sourceDefinitions, next],
                  });
                  if (!draft.sourceDefinitions.some((s) => s.id === next.id)) {
                    setQuery("");
                    setPage(Math.floor(draft.sourceDefinitions.length / 6));
                  }
                  setEditing(null);
                }}
              >
                <label className="block space-y-2 text-sm">
                  소스 이름
                  <Input
                    required
                    maxLength={80}
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  소스 URL
                  <Input
                    required
                    type="url"
                    value={editing.url}
                    onChange={(e) =>
                      setEditing({ ...editing, url: e.target.value })
                    }
                    placeholder="https://…"
                  />
                </label>
                <label className="block space-y-2 text-sm">
                  소스 분류
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3"
                    value={editing.group}
                    onChange={(e) =>
                      setEditing({ ...editing, group: e.target.value })
                    }
                  >
                    {[
                      "MNO · 사업자별 채널",
                      "우리 사업자 채널",
                      "중간 사업자",
                      "플랫폼",
                      "수동 입력",
                      "미분류 소스",
                      "등록 소스",
                    ].map((group) => (
                      <option key={group}>{group}</option>
                    ))}
                  </select>
                </label>
                <fieldset className="space-y-3">
                  <legend className="mb-2 text-sm font-medium">
                    이벤트 유형
                  </legend>
                  <div className="flex gap-4">
                    {["auto", "manual"].map((mode) => (
                      <label
                        key={mode}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name="type-mode"
                          checked={editing.typeMode === mode}
                          onChange={() =>
                            setEditing({
                              ...editing,
                              typeMode: mode as "auto" | "manual",
                            })
                          }
                        />
                        {mode === "auto" ? "자동 선택 · 기본" : "수동 선택"}
                      </label>
                    ))}
                  </div>
                  {editing.typeMode === "manual" ? (
                    <div className="grid grid-cols-2 gap-3">
                      {draft.typeDefinitions.map(({ id, ...type }) => (
                        <label
                          key={id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={editing.selectedTypes.includes(
                              id as EventType,
                            )}
                            onChange={(e) =>
                              setEditing({
                                ...editing,
                                selectedTypes: e.target.checked
                                  ? [...editing.selectedTypes, id as EventType]
                                  : editing.selectedTypes.filter(
                                      (t) => t !== id,
                                    ),
                              })
                            }
                          />
                          {type.label}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      출처 기반의 유형 분류와 등록된 이벤트 유형을 참조하는
                      설정입니다.
                    </p>
                  )}
                </fieldset>
                <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>분석 방식</span>
                  <Badge>AI</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL이 일치하는 이벤트에 참조 설정을 적용합니다.
                </p>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditing(null)}
                  >
                    취소
                  </Button>
                  <Button type="submit">소스 적용</Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </>
  );
}
