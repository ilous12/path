import { Badge } from "@/components/ui/badge";
import {
  Timeline,
  TimelineCard,
  TimelineDate,
  TimelineHeader,
  TimelineItem,
  TimelineTitle,
} from "@/components/ui/timeline";

const releases = [
  {
    date: "2026-09-17",
    title: "워크스페이스별 의사결정 지원",
    content: [
      "air·TDS·MVNO의 업무 공간을 선택하고 경영 요약을 확인할 수 있습니다.",
      "AI 대화에서 현황 요약·주의할 변화·대응 대안에 대한 추천 질문과 답변을 제공합니다.",
      "대응 필요·관망·대응 불필요 판단을 검토할 수 있도록 대안별 기대 효과·비용·위험과 재검토 조건를 안내합니다.",
    ],
  },
  {
    date: "2026-09-16",
    title: "회선·해지·매출·순익 통합 조회",
    content: [
      "회선과 해지는 막대그래프, 매출과 순익은 선차트로 함께 표시합니다.",
      "1주·1개월·1년 및 직접 지정한 기간에 따라 일간·월간·연간 실적을 집계합니다.",
      "하단 기간 차트 드래그와 Ctrl + 마우스 휠로 조회 기간을 조정할 수 있습니다.",
    ],
  },
  {
    date: "2026-09-15",
    title: "시장 변화와 실적을 한눈에 비교",
    content: [
      "가격·혜택·상품·프로모션·채널·정책 변화를 이벤트 유형으로 구분합니다.",
      "차트의 E 표시에 마우스를 올리면 이벤트 요약과 시작일·종료일을 확인할 수 있습니다.",
      "같은 기간의 이벤트는 묶어서 표시하며, 상세 화면에서 변경 전후 내용과 후속 확인 사항을 살펴볼 수 있습니다.",
    ],
  },
  {
    date: "2026-09-14",
    title: "핵심 지표와 거래 내역 탐색 개선",
    content: [
      "매출·비용·가입 회선 수·해지율을 핵심 지표 카드로 제공합니다.",
      "전기 대비·전년 대비·월 누적 지표의 의미와 계산 기준을 툴팁으로 안내합니다.",
      "거래 내역은 표시할 열을 선택하고 한 페이지에 최대 10건씩 조회할 수 있습니다.",
    ],
  },
  {
    date: "2026-09-13",
    title: "통합 모니터링 시범 화면 공개",
    content: [
      "시장과 내부 실적의 변화를 함께 살펴보는 경영 대시보드를 구성했습니다.",
      "화면 문구를 한글로 정리하고 금액 단위를 ₩으로 통일했습니다.",
      "시장 이벤트와 실적 추이를 함께 조회할 수 있습니다.",
    ],
  },
];

export function ProductChangelog() {
  return (
    <Timeline>
      {releases.map((release, index) => (
        <TimelineItem key={release.date}>
          <TimelineCard>
            <TimelineHeader>
              <TimelineDate dateTime={release.date}>
                {release.date}
              </TimelineDate>
              <TimelineTitle>
                {release.title}
                {index === 0 && <Badge variant="outline">최신</Badge>}
              </TimelineTitle>
            </TimelineHeader>
            <ul className="list-disc pl-4 space-y-2">
              {release.content.map((content) => (
                <li
                  className="text-sm leading-relaxed text-muted-foreground"
                  key={content}
                >
                  {content}
                </li>
              ))}
            </ul>
          </TimelineCard>
        </TimelineItem>
      ))}
    </Timeline>
  );
}
