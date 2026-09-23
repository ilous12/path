"use client";
import { Database, Download, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsListContent, TabsTab } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { PageEntry } from "./page-entry";
import { BUSINESSES, businessName } from "./path-intelligence";
import { PolicyEntryButton } from "./policy-entry";
import {
  executionStatus,
  latestRevision,
  type PolicyChange,
  type PolicyGroup,
  type SubPolicy,
} from "./policy-group-model";
import { usePolicyGroups } from "./policy-group-store";
import { WorkspaceHeader } from "./workspace-header";

const ORIGIN: Record<SubPolicy["origin"], { label: string; tone: string }> = {
  ai: {
    label: "AI 제안",
    tone: "border-primary/25 bg-primary/10 text-primary",
  },
  prompt: {
    label: "AI 변환",
    tone: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  direct: {
    label: "직접 입력",
    tone: "border-border bg-secondary text-secondary-foreground",
  },
  legacy: {
    label: "사례 기반 제안",
    tone: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
};
const STATUS: Record<string, string> = {
  draft: "초안",
  registered: "등록",
  scheduled: "예약",
  active: "실행 중",
  completed: "종료",
  stopped: "중지",
};
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const pct = (v: number) => `${v > 0 ? "+" : ""}${v}%`;
function conditions(sub: SubPolicy) {
  if (sub.changes.length) return sub.changes.map(describe).join(" · ");
  const a = sub.source;
  return [
    a.type,
    a.pricePct ? `가격 ${pct(a.pricePct)}` : null,
    a.cancellationPct ? `해지 ${pct(a.cancellationPct)}` : null,
    a.dailyCost ? `일 비용 ${won(a.dailyCost)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
function describe(c: PolicyChange) {
  if (c.kind === "price") return `월 ${won(c.before)} → ${won(c.after)}`;
  if (c.kind === "points")
    return `${c.amount.toLocaleString("ko-KR")}P × ${c.months}개월`;
  if (c.kind === "special-points")
    return `특별 ${c.amount.toLocaleString("ko-KR")}P`;
  return c.description;
}

type Row = { key: string; group: PolicyGroup; sub: SubPolicy; status: string };

export function PolicyLedger() {
  const params = useSearchParams();
  const scope = params.get("workspace") ?? "home";
  const store = usePolicyGroups();
  const [business, setBusiness] = useState(scope === "home" ? "all" : scope);
  const [origins, setOrigins] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const rows = useMemo<Row[]>(
    () =>
      store.policies
        .flatMap((group) =>
          latestRevision(group).items.map((sub) => ({
            key: `${group.id}:${sub.id}`,
            group,
            sub,
            status: executionStatus(group),
          })),
        )
        .sort((a, b) => b.group.createdAt.localeCompare(a.group.createdAt)),
    [store.policies],
  );
  const shown = rows.filter(
    (r) =>
      (business === "all" || r.group.workspace === business) &&
      (!origins.length || origins.includes(r.sub.origin)) &&
      `${r.sub.title} ${latestRevision(r.group).name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const inScope = rows.filter(
    (r) => business === "all" || r.group.workspace === business,
  );
  const decisions = store.policies
    .filter((p) => business === "all" || p.workspace === business)
    .reduce((n, p) => n + p.history.length, 0);
  const stats = [
    ["판매정책", inScope.length],
    ["AI·사례 제안", inScope.filter((r) => r.sub.origin !== "direct").length],
    ["직접 입력", inScope.filter((r) => r.sub.origin === "direct").length],
    ["실행 중", inScope.filter((r) => r.status === "active").length],
    ["학습 기록", decisions],
  ] as const;
  const exportLedger = () => {
    const payload = store.policies.map((p) => ({
      id: p.id,
      workspace: p.workspace,
      createdAt: p.createdAt,
      revisions: p.revisions,
      simulations: p.simulations.map(({ rows, ...s }) => ({
        ...s,
        days: rows.length,
      })),
      executions: p.executions,
      history: p.history,
    }));
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `path-policy-ledger-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const href = (p: PolicyGroup) =>
    `/analysis?${new URLSearchParams({ workspace: p.workspace, policy: p.id })}`;
  return (
    <div className="space-y-5 pb-12">
      <WorkspaceHeader>
        <div>
          <h1>판매정책</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            AI가 제안하고 마케터가 고치고 결정한 모든 판매정책입니다.
            제안·수정·승인·결과가 함께 쌓여 다음 추천의 학습 데이터가 됩니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={exportLedger}
            size="sm"
            type="button"
            variant="outline"
          >
            <Download aria-hidden /> 학습 데이터 내보내기
          </Button>
          <PolicyEntryButton
            workspace={business === "all" ? undefined : business}
          />
        </div>
      </WorkspaceHeader>
      <PageEntry>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map(([label, value]) => (
            <Card className="gap-1 px-4 py-3" data-size="sm" key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {value.toLocaleString("ko-KR")}
              </dd>
            </Card>
          ))}
        </dl>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Database aria-hidden className="size-4 text-muted-foreground" />{" "}
              판매정책 원장
            </CardTitle>
            <CardDescription className="text-xs">
              출처별로 걸러 보고, 행을 누르면 캠페인 구성·예측·실행 이력으로
              이동합니다.
            </CardDescription>
            <CardAction>
              {scope === "home" && (
                <Tabs
                  onValueChange={(v) => setBusiness(String(v))}
                  value={business}
                >
                  <TabsListContent aria-label="사업" className="min-h-8">
                    <TabsTab className="h-6 px-2 text-xs" value="all">
                      전체
                    </TabsTab>
                    {BUSINESSES.map((b) => (
                      <TabsTab
                        className="h-6 px-2 text-xs"
                        key={b.id}
                        value={b.id}
                      >
                        {b.name}
                      </TabsTab>
                    ))}
                  </TabsListContent>
                </Tabs>
              )}
            </CardAction>
          </CardHeader>
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <div className="relative min-w-52 flex-1">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="판매정책 검색"
                className="pl-8"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="판매정책·캠페인 이름"
                value={query}
              />
            </div>
            <ToggleGroup
              aria-label="출처"
              multiple
              onValueChange={setOrigins}
              size="sm"
              value={origins}
              variant="outline"
            >
              {(Object.keys(ORIGIN) as SubPolicy["origin"][]).map((o) => (
                <ToggleGroupItem className="px-2.5 text-xs" key={o} value={o}>
                  {ORIGIN[o].label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  {[
                    "판매정책",
                    "사업",
                    "출처",
                    "변경 조건",
                    "기간",
                    "상태",
                  ].map((h) => (
                    <th className="px-4 py-2.5 font-medium" key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map(({ key, group, sub, status }) => {
                  const r = latestRevision(group);
                  return (
                    <tr
                      className="border-b last:border-0 transition-colors hover:bg-accent/40"
                      key={key}
                    >
                      <td className="max-w-xs px-4 py-3">
                        <Link
                          className="line-clamp-1 font-medium hover:underline"
                          href={href(group)}
                        >
                          {sub.title}
                        </Link>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {r.name} · v{r.number}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span
                            aria-hidden
                            className="size-2 rounded-full"
                            style={{
                              background: BUSINESSES.find(
                                (b) => b.id === group.workspace,
                              )?.color,
                            }}
                          />
                          {businessName(group.workspace)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={cn("shadow-none", ORIGIN[sub.origin].tone)}
                          variant="outline"
                        >
                          {ORIGIN[sub.origin].label}
                        </Badge>
                      </td>
                      <td className="max-w-56 px-4 py-3 text-xs">
                        <span className="line-clamp-2">{conditions(sub)}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums">
                        {(sub.period ?? r).start} ~ {(sub.period ?? r).end}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={cn(
                            "shadow-none",
                            status === "active" &&
                              "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                          )}
                          variant="outline"
                        >
                          {STATUS[status] ?? status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!shown.length && (
              <p className="p-10 text-center text-sm text-muted-foreground">
                조건에 맞는 판매정책이 없습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </PageEntry>
    </div>
  );
}
