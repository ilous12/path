import Link from "next/link";
import type { MarketEvent } from "./data";
import { getEventType } from "./data";
const features: Record<string, { focus: string; metrics: string }> = {
  price: {
    focus: "변경 전후 요금·할인 기간·동일 조건 경쟁 상품 확인",
    metrics: "가격 차이 · 번호이동 · 증분 순익",
  },
  benefit: {
    focus: "포인트·데이터·구독 혜택의 수령 조건과 지급 비용 확인",
    metrics: "혜택 비용 · 가입 전환 · 유지율",
  },
  product: {
    focus: "출시·종료 시점과 대체 상품, 대상 고객 확인",
    metrics: "신규 가입 · 상품별 회선 · 기존 상품 이동",
  },
  campaign: {
    focus: "프로모션 적용 기간·대상·종료 후 조건 확인",
    metrics: "기간 내 가입 · 획득 비용 · 종료 후 해지",
  },
  channel: {
    focus: "대상 채널·노출·유입 조건의 차이 확인",
    metrics: "채널별 유입 · 가입 전환 · 회선 기여",
  },
  policy: {
    focus: "가입·유지·지급 조건 및 시행 범위 확인",
    metrics: "대상 고객 규모 · 지급 비용 · 순익",
  },
  pivot: {
    focus: "관측 전환점과 다음 변곡점까지의 영향 구간 확인",
    metrics: "회선 추세 · 해지 추세 · 전후 변화율",
  },
  "ai:보안사고": {
    focus: "공식 발표·영향 고객·발생/발표 시점 구분",
    metrics: "해지 · 번호이동 · 고객 문의",
  },
  "ai:보안대응": {
    focus: "고객 보호 조치·보상·신청 기간 확인",
    metrics: "보호 조치 이행 · 유지율 · 대응 비용",
  },
};
export function EventFeatures({
  event,
  workspace,
  start,
  end,
}: {
  event: MarketEvent;
  workspace: string;
  start: string;
  end: string;
}) {
  const url = `/analysis?${new URLSearchParams({ workspace, start, end, events: event.id })}`;
  return (
    <details className="mt-3 rounded-lg border bg-background/50 p-3 text-xs">
      <summary className="cursor-pointer font-medium">
        유형별 검토 · 변경 전후
      </summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="font-medium">변경 전</p>
          <p className="mt-1 text-muted-foreground">
            {event.before || "확인 필요"}
          </p>
        </div>
        <div>
          <p className="font-medium">변경 후</p>
          <p className="mt-1 text-muted-foreground">
            {event.after || "확인 필요"}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {event.types.map((type) => {
          const f = features[type] ?? {
            focus: "사건의 적용 범위·기간·근거 확인",
            metrics: "회선 · 해지 · 매출 · 순익",
          };
          return (
            <div key={type}>
              <p className="font-medium">
                {getEventType(type).label} · {f.focus}
              </p>
              <p className="mt-1 text-muted-foreground">
                검토 지표: {f.metrics}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-muted-foreground">
        후속 대응: {event.next || "검토 필요"}
      </p>
      <div className="mt-3 flex gap-4">
        <Link className="underline underline-offset-4" href={url}>
          이벤트 상세 분석 →
        </Link>
        {event.sourceUrl && (
          <a
            className="underline underline-offset-4"
            href={event.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            출처 확인 ↗
          </a>
        )}
      </div>
    </details>
  );
}
