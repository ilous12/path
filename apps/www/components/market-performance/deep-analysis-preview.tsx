import { Bot, ArrowRight, FlaskConical, GitBranch, Search } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Range } from "./data";

export function DeepAnalysisPreview({
  range,
  workspace,
  focus,
  eventCount,
}: {
  range: Range;
  workspace: string;
  focus: string;
  eventCount: number;
}) {
  return (
    <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 to-card">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-5 text-primary" />
            AI와 분석 이어하기
          </CardTitle>
          <Badge variant="outline">Phase 2 예정</Badge>
        </div>
        <CardDescription>
          기본 분석을 출발점으로, 질문과 가정을 바꾸며 실행 가능한 정책을 함께
          검토합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            workspace,
            `${range.start} ~ ${range.end}`,
            focus,
            `분석 대상 ${eventCount}건`,
          ].map((text) => (
            <span
              key={text}
              className="rounded-md border bg-background/70 px-2.5 py-1.5"
            >
              {text}
            </span>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {[
            {
              icon: FlaskConical,
              title: "요금 탄력도 정책",
              question:
                "일부 요금제를 5% 인하하면 가입·해지·순익이 어떻게 바뀔까?",
              result: "변경 폭별 예측 곡선 · 손익분기점 · 민감도 비교",
            },
            {
              icon: GitBranch,
              title: "마케팅 시뮬레이션",
              question:
                "TOSS와 MOYO의 예산·혜택을 재배분하면 어떤 조합이 유리할까?",
              result: "정책별 성과 차트 · 비용·수익 비교표 · 제약 조건",
            },
            {
              icon: Search,
              title: "변화 원인과 반례 검토",
              question: "회복이 가격 대응 때문일까, 채널 노출 효과일까?",
              result: "근거 이벤트 · 정책 가설 · 추가 확인할 데이터",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border bg-background/60 p-4"
            >
              <item.icon className="mb-3 size-5 text-primary" />
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6">{item.question}</p>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {item.result}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
          <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
            기간·중점 지표·근거 이벤트·기본 분석을 이어받는 전용 대화 공간을
            제공할 예정입니다. 대화에서 가정을 수정하고, 차트·비교표로 결과를
            확인하며 분석 분기를 저장합니다. 심층 추론과 시뮬레이션은 Phase
            2에서 제공됩니다.
          </p>
          <Button disabled variant="outline">
            분석 이어하기 · Phase 2 <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
