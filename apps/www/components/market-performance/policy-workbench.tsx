"use client";
import { DataBasis } from "./data-basis";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  EllipsisVertical,
  Send,
  ArrowRight,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { CartesianGrid, LineChart, Line, XAxis, YAxis } from "recharts";
import { buildPerformance, type Range, type MarketEvent } from "./data";
import { forecastPolicy, type ForecastMetric } from "./forecast";
import { PolicySimulator } from "./policy-simulator";
import { DetailLoading } from "./detail-loading";

type Alternative = {
  title: string;
  tag: string;
  benefit: string;
  cost: string;
  risk: string;
  condition: string;
};
type Topic = "elasticity" | "marketing" | "evidence";
const suggestions: { topic: Topic; title: string; question: string }[] = [
  {
    topic: "elasticity",
    title: "요금 탄력도 실험",
    question: "요금을 5% 인하하면 회선과 순익은 어떻게 바뀔까?",
  },
  {
    topic: "marketing",
    title: "마케팅 배분 비교",
    question: "TOSS와 MOYO의 혜택을 재배분하면 어떤 결과가 나올까?",
  },
  {
    topic: "evidence",
    title: "원인과 반례 검토",
    question: "회복이 가격 대응 때문인지 채널 노출 효과인지 비교해줘.",
  },
];
const metricNames: Record<ForecastMetric, string> = {
  customers: "회선",
  cancellations: "해지",
  revenue: "매출",
  netProfit: "순익",
};
type Message = {
  id: number;
  question: string;
  topic: Topic | null;
  discount: number;
  policy: string;
};

function AnalysisAnswer({
  message,
  range,
  events,
}: {
  message: Message;
  range: Range;
  events: MarketEvent[];
}) {
  const [metric, setMetric] = useState<ForecastMetric>("customers");
  const history = buildPerformance(range, "day").slice(-28);
  const last = history.at(-1);
  const money = metric === "revenue" || metric === "netProfit";
  const format = (value: number) =>
    `${money ? "₩" : ""}${Math.round(value).toLocaleString("ko-KR")}${money ? "" : metric === "customers" ? "회선" : "건"}`;
  if (!message.topic)
    return (
      <p className="text-sm leading-7">
        이 질문의 자유형 심층 추론은 Phase 2에서 연결됩니다. 아래 제안 중 요금
        탄력도, 마케팅 배분, 원인 검토를 선택하면 분석 흐름을 확인할 수
        있습니다.
      </p>
    );
  if (!last) return <p>선택 기간의 관측 데이터가 없어 분석할 수 없습니다.</p>;
  const evidence = message.topic === "evidence";
  const elasticity = message.topic === "elasticity";
  const change = message.discount / 100;
  const effects = elasticity
    ? {
        customers: change * 1.6,
        cancellations: -change * 0.8,
        revenue: (1 - change) * (1 + change * 1.6) - 1,
        netProfit: -change * 2,
      }
    : { customers: 0.12, cancellations: -0.04, revenue: 0.08, netProfit: 0.03 };
  const forecast = forecastPolicy(history, "damped", effects);
  const chart = evidence
    ? history.map((row) => ({ date: row.key, observed: row[metric] }))
    : [
        { date: range.end, current: last[metric], predicted: last[metric] },
        ...forecast.map((row, i) => ({
          date: new Date(
            Date.parse(`${range.end}T00:00:00Z`) + (i + 1) * 86400000,
          )
            .toISOString()
            .slice(0, 10),
          current: row.current[metric],
          predicted: row.predicted[metric],
        })),
      ];
  const matching = events.filter(
    (event) =>
      evidence ||
      event.types.some((type) =>
        (elasticity
          ? ["price", "benefit", "product"]
          : ["campaign", "channel"]
        ).includes(type),
      ),
  );
  const endpoint = forecast.at(-1)!;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-primary">
          {evidence ? "근거 검토" : "조건부 전망"} · {message.policy}
        </p>
        <h3 className="mt-2 font-semibold">
          {evidence
            ? "관측된 회복과 원인 가설을 구분했습니다."
            : elasticity
              ? `요금 ${message.discount}% 인하 시 가입 증가와 순익 부담을 함께 검토합니다.`
              : "채널 혜택 재배분의 가입·수익 효과를 비교합니다."}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {evidence
            ? "선택 기간의 실적과 관련 이벤트를 함께 제시합니다. 가격 대응과 채널 노출이 겹치면 단일 원인의 효과를 분리할 수 없습니다. 상품·채널별 대조군과 캠페인 노출 자료가 추가로 필요합니다."
            : elasticity
              ? `가입 탄력도 1.6, 해지 민감도 0.8, 순익 변화는 할인율의 −2배로 설정한 조건부 계산입니다. 탄력도는 실측 추정치가 아니며, 매출은 가격과 가입 변화의 곱으로 계산합니다.`
              : "총 예산을 유지하며 TOSS·MOYO 혜택을 재배분한다는 조건입니다. 30일 후 회선 +12%, 해지 −4%, 매출 +8%, 순익 +3%를 입력 가정으로 비교합니다. 실제 채널별 최적 배분은 전환율·획득비용 자료가 필요합니다."}
        </p>
      </div>
      <div className="rounded-xl border bg-background p-3">
        <div className="mb-3 flex flex-wrap gap-1">
          {Object.entries(metricNames).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={metric === key ? "secondary" : "ghost"}
              aria-pressed={metric === key}
              onClick={() => setMetric(key as ForecastMetric)}
            >
              {label}
            </Button>
          ))}
        </div>
        <ChartContainer
          className="h-56 w-full"
          config={{
            observed: { label: "관측 실적", color: "var(--chart-2)" },
            current: { label: "현행 유지", color: "var(--muted-foreground)" },
            predicted: { label: "조건 적용", color: "var(--chart-1)" },
          }}
        >
          <LineChart
            data={chart}
            margin={{ left: 12, right: 16, top: 12, bottom: 4 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 4" />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => v.slice(5)}
              minTickGap={32}
            />
            <YAxis
              width={74}
              domain={metric === "netProfit" ? ["auto", "auto"] : [0, "auto"]}
              tickFormatter={(v: number) =>
                money ? `₩${Math.round(v / 10000)}만` : `${Math.round(v)}`
              }
            />
            <ChartTooltip
              content={
                <ChartTooltipContent formatter={(v) => format(Number(v))} />
              }
            />
            {evidence ? (
              <Line
                dataKey="observed"
                stroke="var(--chart-2)"
                dot={false}
                strokeWidth={2}
              />
            ) : (
              <>
                <Line
                  dataKey="current"
                  stroke="var(--muted-foreground)"
                  dot={false}
                  strokeDasharray="4 4"
                />
                <Line
                  dataKey="predicted"
                  stroke="var(--chart-1)"
                  dot={false}
                  strokeWidth={2}
                />
              </>
            )}
          </LineChart>
        </ChartContainer>
        <p className="mt-2 text-xs text-muted-foreground">
          {evidence
            ? "실선 · 선택 기간 관측 실적"
            : "점선 · 현행 유지 / 실선 · 조건 적용 · 감쇠 추세 기준 예측"}
        </p>
        {!evidence && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
            <div className="text-muted-foreground">
              30일 후 현행 유지
              <p className="mt-1 font-semibold text-foreground">
                {format(endpoint.current[metric])}
              </p>
            </div>
            <div className="text-muted-foreground">
              30일 후 조건 적용
              <p className="mt-1 font-semibold text-primary">
                {format(endpoint.predicted[metric])}
              </p>
            </div>
          </div>
        )}
      </div>
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          연결 근거 · {matching.length}건
        </summary>
        <div className="mt-3 space-y-3">
          {matching.slice(0, 5).map((event) => (
            <div key={event.id} className="border-t pt-2 text-xs leading-5">
              <p className="font-medium">{event.title}</p>
              <p className="text-muted-foreground">
                {event.startAt.slice(0, 10)} · {event.operator} ·{" "}
                {event.sourceName || "출처 미등록"}
              </p>
              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  출처 확인
                </a>
              )}
            </div>
          ))}
          {matching.length === 0 && (
            <p className="text-sm text-muted-foreground">
              연결 가능한 이벤트가 없습니다. 영향 관계는 N/A입니다.
            </p>
          )}
          {matching.length > 5 && (
            <p className="text-xs text-muted-foreground">
              최근 정렬 순서 중 5건 표시 · 전체 {matching.length}건
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

export function PolicyWorkbench({
  range,
  events,
  alternatives: initialAlternatives,
  workspace,
  focus,
  decision,
  evidenceSummary,
}: {
  range: Range;
  events: MarketEvent[];
  alternatives: Alternative[];
  workspace: string;
  focus: string;
  decision: string;
  evidenceSummary?: string;
}) {
  const [round, setRound] = useState(0);
  const [reloading, setReloading] = useState(false);
  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!reloading) return;
    const timer = setTimeout(() => {
      setRound((r) => r + 1);
      setSelected(0);
      setNotice("새 정책 후보를 준비했습니다. 효과·비용은 검토용 가정입니다.");
      setReloading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [reloading]);
  const variants = [
    ["현행 유지·유지율 관찰", "30일 유지 포인트 검증", "20GB 가격 경쟁력 검증"],
    [
      "현행 유지·채널 반응 관찰",
      "eSIM 개통 혜택 검증",
      "번호이동 한정 가격 조정",
    ],
    [
      "현행 유지·순익 추이 관찰",
      "데이터 추가 혜택 검증",
      "고용량 상품 가격 재설계",
    ],
  ];
  const benefits = [
    [
      "추가 변경 없이 가입 이후 유지율을 확인합니다.",
      "30일 유지 고객의 보상 혜택으로 조기 해지 감소를 검토합니다.",
      "동일 망·데이터 조건의 20GB 상품에 한정해 가격 반응을 비교합니다.",
    ],
    [
      "채널별 유입 구성과 개통 이탈을 추가 관찰합니다.",
      "eSIM 발급 비용 지원으로 온라인 개통 완료율을 검토합니다.",
      "번호이동 고객을 대상으로 제한된 기간의 가격 조정을 비교합니다.",
    ],
    [
      "기존 정책을 유지하며 순익과 혜택 지급액을 점검합니다.",
      "데이터 추가 혜택으로 가입·유지 반응과 제공 원가를 비교합니다.",
      "고용량 상품의 가격 구조와 원가·장기 유지 효과를 검토합니다.",
    ],
  ];
  const alternatives =
    round === 0
      ? initialAlternatives
      : initialAlternatives.map((a, i) => ({
          ...a,
          title: variants[(round - 1) % 3][i],
          benefit: benefits[(round - 1) % 3][i],
          condition: `${workspace} · ${focus} 기준. ${a.condition}`,
        }));
  const evidenceMode = evidenceSummary !== undefined;
  const ownCount = events.filter(
    (event) => event.operator.toLowerCase() === workspace.toLowerCase(),
  ).length;
  const priceCount = events.filter((event) =>
    event.types.some((type) => ["price", "benefit", "product"].includes(type)),
  ).length;
  const channelCount = events.filter((event) =>
    event.types.some((type) => ["channel", "campaign"].includes(type)),
  ).length;
  const topics = evidenceMode
    ? [
        {
          topic: "evidence" as const,
          title: "이벤트와 실적 변곡점의 연결",
          question: `${range.start}~${range.end} 이벤트 ${events.length}건 중 실적 변화와 연결된 근거와 다른 원인 가설을 검토해줘.`,
        },
        {
          topic: "elasticity" as const,
          title: `가격·혜택 변화의 영향과 대응 · ${priceCount}건`,
          question: `기간 내 가격·혜택 관련 ${priceCount}건을 참고해 요금을 5% 인하할 때 영향을 비교해줘.`,
        },
        {
          topic: "marketing" as const,
          title: `채널·프로모션 전략 비교 · ${channelCount}건`,
          question: `기간 내 채널·프로모션 ${channelCount}건을 참고해 TOSS와 MOYO 마케팅 배분을 비교해줘.`,
        },
      ]
    : suggestions;
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<"detail" | "chat" | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [discount, setDiscount] = useState(5);
  const [pending, setPending] = useState<Message | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      setMessages((items) => [...items, pending]);
      setPending(null);
    }, 900);
    return () => clearTimeout(timer);
  }, [pending]);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pending]);
  const ask = (question: string, topic: Topic | null) => {
    if (pending || !question.trim()) return;
    const number = question.match(/(\d+(?:\.\d+)?)\s*%/);
    const amount = number
      ? Math.min(20, Math.max(0, Number(number[1])))
      : discount;
    setPending({
      id: ++nextId.current,
      question,
      topic,
      discount: amount,
      policy: evidenceMode
        ? "선택 기간 이벤트 분석"
        : alternatives[selected].title,
    });
    setInput("");
  };
  const send = () => {
    const topic = /요금|할인|탄력|인하/.test(input)
      ? "elasticity"
      : /마케팅|예산|배분|TOSS|MOYO/i.test(input)
        ? "marketing"
        : /원인|근거|반례|회복/.test(input)
          ? "evidence"
          : null;
    ask(input, topic);
  };
  return (
    <>
      {evidenceMode ? (
        <Button
          variant="outline"
          className="shrink-0"
          onClick={() => setMode("chat")}
        >
          <Bot className="size-4" />
          AI로 심층분석
        </Button>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">어떤 정책을 검토할까요?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                현재 판단: {decision} · 실험을 선택하여 가정에 따른 기대 효과를
                비교합니다.
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="정책 검토 메뉴"
                  />
                }
              >
                <EllipsisVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                matchAnchorWidth={false}
                className="w-52"
              >
                <DropdownMenuItem
                  className="w-full cursor-pointer py-2.5"
                  onClick={() => {
                    setDetailIndex(selected);
                    setMode("detail");
                  }}
                >
                  상세보기
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="w-full cursor-pointer py-2.5"
                  onClick={() => setMode("chat")}
                >
                  <Bot className="size-4" />
                  AI로 심층 분석하기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {round + 1}차 제안 <DataBasis details="정책 후보는 사전 구성된 규칙으로 제안됩니다. 실시간 생성형 모델의 분석 결과가 아닙니다." />
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={reloading}
              onClick={() => {
                setMode(null);
                setDetailIndex(null);
                setReloading(true);
                setNotice("");
              }}
            >
              <RefreshCw
                className={`size-4 ${reloading ? "animate-spin" : ""}`}
              />
              {reloading ? "AI 정책 제안 중…" : "Reload"}
            </Button>
          </div>
          {notice && (
            <p role="status" className="text-sm text-primary">
              {notice}
            </p>
          )}
          {reloading ? (
            <DetailLoading />
          ) : (
            <PolicySimulator
              range={range}
              alternatives={alternatives}
              events={events}
              key={round}
              selectedIndex={selected}
              onSelectionChange={setSelected}
              onDetail={(index) => {
                setDetailIndex(index);
                setMode("detail");
              }}
            />
          )}
        </>
      )}
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) setMode(null);
        }}
      >
        <DialogContent
          showCloseButton
          className="flex h-[88dvh] max-h-[940px] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0! sm:max-w-5xl"
        >
          <DialogHeader className="shrink-0 border-b p-5 pr-12">
            <DialogTitle className="flex items-center gap-2">
              <Bot className="size-5 text-primary" />
              {mode === "chat" ? "AI로 심층 분석하기" : "정책 검토 상세"}
            </DialogTitle>
            <DialogDescription>
              {workspace} · {range.start} ~ {range.end} · {focus}
            </DialogDescription>
            <p className="text-xs text-muted-foreground">
              {evidenceMode
                ? `이벤트 ${events.length}건 · ${workspace} ${ownCount}건 · 경쟁사·기타 ${events.length - ownCount}건`
                : `검토 실험 · ${alternatives[detailIndex ?? selected].title}`}
            </p>
          </DialogHeader>
          {mode === "detail" ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-4">
                {alternatives.map((item, index) =>
                  index === (detailIndex ?? selected) ? (
                    <div
                      key={item.title}
                      className={`rounded-xl border p-4 ${selected === index ? "border-primary bg-primary/5" : "bg-muted/20"}`}
                    >
                      <p className="text-xs text-primary">
                        실험 {index + 1}
                        {selected === index ? " · 선택됨" : ""}
                      </p>
                      <h3 className="mt-2 font-semibold">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6">{item.benefit}</p>
                      <dl className="mt-4 space-y-2 text-sm">
                        <dt className="font-medium">비용</dt>
                        <dd className="text-muted-foreground">{item.cost}</dd>
                        <dt className="font-medium">검토 조건</dt>
                        <dd className="text-muted-foreground">
                          {item.condition}
                        </dd>
                        <dt className="font-medium">위험</dt>
                        <dd className="text-muted-foreground">{item.risk}</dd>
                      </dl>
                    </div>
                  ) : null,
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                적용하면 이 실험을 선택하고 비교 차트에 반영합니다. 실제 정책
                실행이나 실험 자동 등록은 하지 않습니다.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMode(null);
                    setDetailIndex(null);
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={() => {
                    const index = detailIndex ?? selected;
                    setSelected(index);
                    setNotice(
                      `${alternatives[index].title} 실험을 비교 차트에 적용했습니다.`,
                    );
                    setMode(null);
                    setDetailIndex(null);
                  }}
                >
                  적용
                </Button>
              </div>
              <Button className="mt-5" onClick={() => setMode("chat")}>
                <Bot className="size-4" />
                AI로 심층 분석하기
                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5"
                role="log"
                aria-label="정책 심층 분석 대화"
              >
                <div className="max-w-3xl rounded-2xl border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">
                    {evidenceMode
                      ? "해당 기간의 심층분석 주제를 선정하세요."
                      : "정책의 다음 질문을 함께 검토합니다."}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {evidenceMode
                      ? `${range.start} ~ ${range.end} · ${focus}. ${evidenceSummary}`
                      : `기간·중점 지표·${events.length}건의 이벤트와 선택 실험을 가져왔습니다. 요금 변화, 마케팅 배분, 원인 가설을 차트와 근거로 비교하세요.`}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Phase 2 · 심층 AI 연결 예정. 현재는 입력 가정에 따른 계산과
                    준비된 분석 흐름을 제공합니다.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    {topics.map((item) => (
                      <Button
                        key={item.topic}
                        disabled={!!pending}
                        variant="outline"
                        className="h-auto justify-between whitespace-normal px-3 py-3 text-left"
                        onClick={() =>
                          ask(
                            item.topic === "elasticity"
                              ? `${evidenceMode ? `선택 기간의 가격·혜택 이벤트 ${priceCount}건을 참고해 ` : ""}요금을 ${discount}% 인하하면 회선과 순익은 어떻게 바뀔까?`
                              : item.question,
                            item.topic,
                          )
                        }
                      >
                        {item.title}
                        <ArrowRight className="size-4 shrink-0" />
                      </Button>
                    ))}
                  </div>
                </div>
                {messages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    <div className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">
                      {message.question}
                    </div>
                    <div className="mr-auto w-full max-w-3xl rounded-2xl border bg-muted/20 p-4">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
                        <Bot className="size-4" />
                        분석 어시스턴트
                      </div>
                      <AnalysisAnswer
                        message={message}
                        range={range}
                        events={events}
                      />
                    </div>
                  </div>
                ))}
                {pending && (
                  <div className="space-y-3">
                    <div className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">
                      {pending.question}
                    </div>
                    <p
                      role="status"
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <LoaderCircle className="size-4 animate-spin" />
                      관측값과 입력 조건을 비교하고 있습니다…
                    </p>
                  </div>
                )}
              </div>
              <form
                className="shrink-0 space-y-3 border-t bg-background p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  send();
                }}
              >
                <div className="flex items-center gap-3 text-xs">
                  <label htmlFor="policy-discount">요금 인하 가정</label>
                  <input
                    id="policy-discount"
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={discount}
                    onChange={(event) =>
                      setDiscount(Number(event.target.value))
                    }
                    className="w-32 accent-current"
                  />
                  <span className="tabular-nums">{discount}%</span>
                  <span className="text-muted-foreground">
                    다음 요금 분석에 적용
                  </span>
                </div>
                <div className="flex items-end gap-2">
                  <Textarea
                    aria-label="심층 분석 질문"
                    placeholder="요금을 8% 인하하면? / 마케팅 배분을 비교해줘"
                    value={input}
                    maxLength={2000}
                    onChange={(event) => setInput(event.target.value)}
                    rows={2}
                    className="max-h-32 min-h-16 resize-none"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="질문 보내기"
                    disabled={!!pending || !input.trim()}
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
