"use client";

import { Bot, Send, User } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  buildPerformance,
  presetRange,
} from "@/components/market-performance/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useAIChat } from "./ai-chat";

const EMPTY_MESSAGES: import("./ai-chat").ChatMessage[] = [];

export function ChatStreaming() {
  const workspace = useSearchParams().get("workspace") ?? "air";
  const name =
    workspace === "tds" ? "TDS" : workspace === "mvno" ? "MVNO" : "air";
  const { conversations, setConversations, input, setInput } = useAIChat();
  const messages = conversations[workspace] ?? EMPTY_MESSAGES;
  const latestQuestion = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messages.length)
      latestQuestion.current?.scrollIntoView({ block: "start" });
  }, [messages]);
  const range = presetRange("1M");
  const totals = buildPerformance(range).reduce(
    (sum, row) => ({
      revenue: sum.revenue + row.revenue,
      netProfit: sum.netProfit + row.netProfit,
      customers: sum.customers + row.customers,
      cancellations: sum.cancellations + row.cancellations,
    }),
    { revenue: 0, netProfit: 0, customers: 0, cancellations: 0 },
  );
  const format = (value: number) => value.toLocaleString("ko-KR");
  const focus =
    workspace === "tds"
      ? "매출·순익 변동과 운영 지표를 함께 점검하고, 비용 증가 요인을 확인하세요."
      : workspace === "mvno"
        ? "사업자·망·판매 채널별 요금과 혜택을 같은 조건으로 비교하고, 할인 종료일을 확인하세요."
        : "공식 채널과 MOYO의 동일 요금제를 비교하되, 가입 혜택과 유지 조건의 차이를 확인하세요.";
  const examples = [
    {
      question: `${name}의 최근 30일 경영 현황을 요약해줘`,
      answer: `${name} · 최근 30일 요약\n조회 기간: ${range.start} ~ ${range.end}\n\n매출: ₩${format(totals.revenue)}\n순익: ₩${format(totals.netProfit)}\n가입 회선: ${format(totals.customers)}회선\n해지: ${format(totals.cancellations)}건\n\n확인할 사항\n${focus}\n\n현재 합계만으로 성장 여부를 판단할 수 없습니다. 전기·전년 동일 기간과 비교해 추세를 확인하세요.`,
    },
    {
      question: `${name}에서 주의해야 할 변화는 무엇이야?`,
      answer: `${name} · 변화 점검\n\n1. 시장 변화\n${focus}\n\n2. 실적 변화\n가입과 해지의 동시 증가 여부, 매출 대비 순익의 변화, 특정 채널 의존도를 점검하세요.\n\n3. 영향 확인\n이벤트 전후 동일 길이의 기간을 비교하고 계절성·캠페인 영향을 분리해야 합니다. 동시에 발생했다는 이유만으로 인과관계로 해석하지 않습니다.\n\n판단: 관망\n관련 지표와 이벤트를 함께 확인해 원인을 점검하세요.`,
    },
    {
      question: `${name}의 대응 실험을 비교해줘`,
      answer: `${name} · 정책 실험 비교\n\n현행 유지 — 관망\n추가 지출이 적습니다. 해지 증가가 지속되는지 재확인합니다.\n\n한정 혜택 조정 — 대응 검토\n전환 개선을 기대할 수 있지만 추가 비용과 순익 감소 위험이 있습니다. 소규모 비교 실험이 필요합니다.\n\n일괄 가격 조정 — 판단 보류\n경쟁력 개선 가능성과 전체 매출·순익 감소 위험을 함께 계산해야 합니다.\n\n재검토 조건\n해지량이 전기 대비 10% 이상 증가하거나 순익이 10% 이상 감소하는 상태가 2주 지속되면 검토합니다.\n\n${focus}`,
    },
  ];
  const send = (question: string) => {
    if (!question.trim()) return;
    const match = examples.find((item) => item.question === question);
    setConversations((previous) => ({
      ...previous,
      [workspace]: [
        ...(previous[workspace] ?? []),
        { role: "user", content: question },
        {
          role: "ai",
          content:
            match?.answer ??
            `추천 질문을 선택해 ${name}의 현황 요약·변화 점검·대응 실험을 확인해 주세요.`,
        },
      ],
    }));
    setInput("");
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 overflow-y-auto p-4 space-y-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="flex w-full gap-2 items-start">
          <div className="size-8 rounded-full border flex items-center justify-center shrink-0">
            <span aria-hidden="true" className="text-xl">
              <Bot className="size-4 text-foreground" />
            </span>
          </div>
          <div className="max-w-[80%] space-y-2 text-sm">
            <p>{name}의 현황, 변화, 대응 실험을 질문해 보세요.</p>
          </div>
        </div>
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-2 pl-10">
            {examples.map((item) => (
              <Button
                key={item.question}
                className="bg-background cursor-pointer hover:bg-background h-auto justify-start whitespace-normal text-left gap-2 w-fit border hover:border-primary/50"
                variant="unstyled"
                onClick={() => send(item.question)}
              >
                {item.question}
              </Button>
            ))}
          </div>
        )}
        {messages.map((message, index) => (
          <div
            ref={index === messages.length - 2 ? latestQuestion : undefined}
            key={index}
            className={`flex w-full gap-2 items-start py-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {message.role === "ai" && (
              <div className="size-8 rounded-full border flex items-center justify-center shrink-0">
                <span aria-hidden="true" className="text-xl">
                  <Bot className="size-4 text-foreground" />
                </span>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-md text-sm leading-relaxed ${message.role === "user" ? "bg-accent text-accent-foreground p-2" : ""}`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === "user" && (
              <div className="size-8 rounded-full border flex items-center justify-center shrink-0">
                <User className="size-4" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="shrink-0 p-4">
        <form
          className="relative flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <Input
            aria-label="워크스페이스 질문"
            placeholder="질문을 입력하세요…"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <Button
            aria-label="질문 보내기"
            className="absolute right-2"
            variant="ghost"
            size="icon-xs"
            type="submit"
            disabled={!input.trim()}
          >
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
