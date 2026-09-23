"use client";
import { useHistoryViewState } from "./history-view-state";
import { WorkspaceHeader } from "./workspace-header";
import { PageEntry } from "./page-entry";

import { useSearchParams } from "next/navigation";
import { RecordMenu } from "./record-menu";
import { Fragment, useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanTrend } from "./plan-visualizations";
import { lastChanged } from "./plan-market-model";
import catalog from "./fixtures/plan-catalog.json";

type Offer = (typeof catalog.offers)[number];
const sources: Record<string, string> = {
  "air-official": "AIR 공식",
  "air-kakaopay": "AIR · 카카오페이",
  moyo: "모요",
};
const money = (n: number | null) =>
  n == null ? "미확인" : `${n.toLocaleString("ko-KR")}원`;
const observed = (s: string) =>
  new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(s));
function allowance(p: Offer) {
  if (p.unlimitedData) return "데이터 무제한";
  return `${p.monthlyDataGb ?? "—"}GB${p.dailyDataGb ? ` + 매일 ${p.dailyDataGb}GB` : ""}${p.qosKbps ? ` · ${p.qosKbps >= 1000 ? `${p.qosKbps / 1000}Mbps` : `${p.qosKbps}Kbps`}` : ""}`;
}
const size = 20;
export function PlanCatalog() {
  const params = useSearchParams();
  const detailHref = (id: string) => { const q = new URLSearchParams(params.toString()); q.delete("view"); q.set("plan", id); return `/analysis?${q.toString()}`; };
  const [source, setSource] = useHistoryViewState("plan-catalog:source", "all");
  const [network, setNetwork] = useHistoryViewState("plan-catalog:network", "all");
  const [query, setQuery] = useHistoryViewState("plan-catalog:query", "");
  const [status, setStatus] = useHistoryViewState("plan-catalog:status", "all");
  const [sort, setSort] = useHistoryViewState("plan-catalog:sort", "recent");
  const [page, setPage] = useHistoryViewState("plan-catalog:page", 0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      catalog.offers
        .filter(
          (p) =>
            (source === "all" || p.sourceId === source) &&
            (network === "all" || p.network === network) &&
            (status !== "changed" || lastChanged.has(p.offerId)) &&
            (status !== "new" || !lastChanged.has(p.offerId)) &&
            (status !== "review" ||
              p.qualityFlags.includes("VISIBLE_VS_JSONLD_PRICE_MISMATCH")) &&
            `${p.name} ${p.operator} ${sources[p.sourceId]}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "bill"
            ? (a.monthlyBilledKrw ?? Infinity) -
              (b.monthlyBilledKrw ?? Infinity)
            : sort === "effective"
              ? (a.displayedEffectiveKrw ?? Infinity) -
                (b.displayedEffectiveKrw ?? Infinity)
              : (lastChanged.get(b.offerId) ?? "").localeCompare(
                  lastChanged.get(a.offerId) ?? "",
                ) ||
                b.observedAt.localeCompare(a.observedAt) ||
                a.offerId.localeCompare(b.offerId),
        ),
    [source, network, query, status, sort],
  );
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages - 1);
  const reset = () => {
    setPage(0);
    setExpanded(null);
  };
  return (
    <div className="space-y-6 pb-14">
      <WorkspaceHeader>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            시장 가격과 채널 혜택
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">요금제 검색</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            같은 상품도 판매 채널과 혜택에 따라 달라집니다. 청구 요금과 체감가를
            함께 확인하세요.
          </p>
        </div>
        <span className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground">
          2026.09.21 수집 · 전체 시장
        </span>
      </WorkspaceHeader>
      <PageEntry>
      <section className="overflow-hidden rounded-xl border bg-card">
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">요금제 리스트</h2>
            <span className="text-xs text-muted-foreground">
              {catalog.offers.length.toLocaleString("ko-KR")}개 판매 조건 · 변경
              확인 {lastChanged.size}건
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            첫 수집본입니다. ‘신규 수집’은 신상품 출시를 뜻하지 않습니다. 이전
            가격이 없어 변경 전후 비교는 아직 제공하지 않습니다.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "전체"],
              ["new", "신규 수집"],
              ["changed", "변경 확인"],
              ["review", "가격 확인 필요"],
            ].map(([id, label]) => (
              <Button
                key={id}
                size="sm"
                variant={status === id ? "secondary" : "ghost"}
                aria-pressed={status === id}
                onClick={() => {
                  setStatus(id);
                  reset();
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                aria-label="요금제 검색"
                placeholder="요금제명, 통신사, 채널 검색"
                className="pl-9"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  reset();
                }}
              />
            </div>
            <select
              aria-label="판매 채널"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                reset();
              }}
            >
              <option value="all">모든 채널</option>
              {Object.entries(sources).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="통신망"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={network}
              onChange={(e) => {
                setNetwork(e.target.value);
                reset();
              }}
            >
              <option value="all">모든 망</option>
              {["SKT", "KT", "LG U+"].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
            <select
              aria-label="정렬 기준"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                reset();
              }}
            >
              <option value="recent">최신 변경순 · 미변경은 수집순</option>
              <option value="bill">청구 요금 낮은순</option>
              <option value="effective">체감가 낮은순</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {[
                  "요금제 · 판매 채널",
                  "제공량",
                  "월 청구 요금",
                  "혜택 반영 체감가",
                  "상태 · 수집 시각",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-4 py-3 font-medium ${h === "" ? "sticky right-0 bg-card" : ""}`}
                  >
                    {h || <span className="sr-only">항목 메뉴</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(current * size, (current + 1) * size).map((p) => (
                <Fragment key={p.offerId}>
                  <tr className="border-t align-top hover:bg-muted/20">
                    <td className="max-w-72 px-4 py-4">
                      <div className="mb-1 text-xs text-muted-foreground">
                        {sources[p.sourceId]} · {p.operator}
                      </div>
                      <button
                        type="button"
                        className="text-left font-medium hover:underline"
                        onClick={() =>
                          setExpanded(expanded === p.offerId ? null : p.offerId)
                        }
                        aria-expanded={expanded === p.offerId}
                      >
                        {p.name}
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.network}망{p.radio ? ` · ${p.radio}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="whitespace-nowrap text-xs">
                        {allowance(p)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        통화{" "}
                        {p.voiceUnlimited
                          ? "무제한"
                          : `${p.voiceMinutes ?? "—"}분`}{" "}
                        · 문자{" "}
                        {p.smsUnlimited ? "무제한" : `${p.smsCount ?? "—"}건`}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-medium tabular-nums">
                      {money(p.monthlyBilledKrw)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-semibold tabular-nums">
                        {money(p.displayedEffectiveKrw)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {p.effectivePeriodMonths && p.effectivePeriodMonths > 0
                          ? `${p.effectivePeriodMonths}개월`
                          : "기간 상세 확인"}{" "}
                        · 혜택 조건 적용
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="rounded-full bg-muted px-2 py-1 text-xs">
                        {p.qualityFlags.includes(
                          "VISIBLE_VS_JSONLD_PRICE_MISMATCH",
                        )
                          ? "가격 확인 필요"
                          : lastChanged.has(p.offerId)
                            ? "체감가 변경"
                            : "신규 수집"}
                      </span>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {observed(lastChanged.get(p.offerId) ?? p.observedAt)}
                      </p>
                    </td>
                    <td className="sticky right-0 bg-card px-4 py-3">
                      <RecordMenu
                        label={`${p.name} ${sources[p.sourceId]}`}
                        actions={[
                          {
                            label: "상세보기",
                            href: detailHref(p.offerId),
                          },
                          {
                            label: "원문 보기",
                            href: p.detailUrl,
                            external: true,
                          },
                        ]}
                      />
                    </td>
                  </tr>
                  {expanded === p.offerId && (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={6} className="p-5">
                        <div className="mb-5">
                          <PlanTrend offer={p} />
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                          <div>
                            <h3 className="mb-2 text-sm font-semibold">
                              가격과 혜택 조건
                            </h3>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                              {p.benefits.length ? (
                                p.benefits.map((b, i) => (
                                  <li key={`${i}-${b}`}>{b}</li>
                                ))
                              ) : (
                                <li>
                                  목록에 추가 혜택 없음 · 상세 가입 조건 확인
                                </li>
                              )}
                            </ul>
                            <p className="mt-2 text-xs">
                              혜택 종료 후 표시 가격:{" "}
                              {money(p.postEffectiveKrw)}
                            </p>
                          </div>
                          <div>
                            <h3 className="mb-2 text-sm font-semibold">
                              채널별 조건
                            </h3>
                            {p.sourceId.startsWith("air-") ? (
                              catalog.offers
                                .filter(
                                  (other) =>
                                    other.productId === p.productId &&
                                    other.sourceId.startsWith("air-"),
                                )
                                .map((other) => (
                                  <p
                                    key={other.offerId}
                                    className="mb-1 text-xs"
                                  >
                                    {sources[other.sourceId]} · 체감가{" "}
                                    {money(other.displayedEffectiveKrw)}
                                  </p>
                                ))
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                모요의 판매 조건입니다. 통신사 공식·다른 채널
                                가격과 동일하다고 간주하지 않습니다.
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                              청구액과 포인트·구독 평가액을 구분해 비교하세요.
                            </p>
                          </div>
                          <div>
                            <h3 className="mb-2 text-sm font-semibold">
                              수집 근거
                            </h3>
                            <a
                              href={p.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs underline underline-offset-4"
                            >
                              {sources[p.sourceId]} 수집 목록 ↗
                            </a>
                            <p className="mt-2 text-xs text-muted-foreground">
                              {observed(p.observedAt)} KST · 최초 관측
                            </p>
                            {p.qualityFlags.includes(
                              "VISIBLE_VS_JSONLD_PRICE_MISMATCH",
                            ) && (
                              <p className="mt-2 text-xs text-foreground">
                                공식 AIR X: 화면 20,000원 / 내장 데이터
                                28,500원. 구독 평가액 반영 차이이며 추가 확인이
                                필요합니다.
                              </p>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                              가입 자격·유지 기간·혜택 수령 조건은 원문에서
                              확인하세요.
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {status === "changed"
              ? "이전 수집본이 없어 확인된 가격·혜택 변경이 없습니다."
              : "선택한 조건에 맞는 요금제가 없습니다."}
          </div>
        )}
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {rows.length.toLocaleString("ko-KR")}건 · 페이지당 {size}건
          </span>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={current === 0}
              onClick={() => {
                setPage(current - 1);
                setExpanded(null);
              }}
            >
              이전
            </Button>
            <span className="text-xs tabular-nums">
              {current + 1} / {pages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={current + 1 >= pages}
              onClick={() => {
                setPage(current + 1);
                setExpanded(null);
              }}
            >
              다음
            </Button>
          </div>
        </div>
      </section>
      </PageEntry>
    </div>
  );
}
