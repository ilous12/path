import type { PolicyRequirements } from "./policy-requirements";
export function RequirementsSummary({
  requirements: r,
}: {
  requirements: PolicyRequirements;
}) {
  return (
    <section className="rounded-xl border bg-muted/20 p-4 text-sm">
      <h3 className="mb-3 font-semibold">확정한 변경 요건</h3>
      <dl className="grid gap-3 sm:grid-cols-[130px_1fr]">
        {[
          [
            "요금 변경",
            r.pricePct === null
              ? "미기재"
              : `${r.pricePct > 0 ? "+" : ""}${r.pricePct}%`,
          ],
          ["혜택·제공량", r.benefits],
          ["포인트·조건", r.points],
          ["무료 제공·면제", r.freeOffers],
          ["대상·기타", r.other],
        ].map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="whitespace-pre-wrap break-words">
              {value || "미기재"}
            </dd>
          </div>
        ))}
      </dl>
      
    </section>
  );
}

export function ReviewSummary({
  review,
}: {
  review: import("./policy-requirements").PolicyReviewSnapshot;
}) {
  return (
    <section className="rounded-xl border bg-primary/5 p-4 text-sm">
      <h3 className="font-semibold">사용자가 선택한 정책 · {review.label}</h3>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        분석 요청: {review.summary}
      </p>
      <p className="mt-2 text-xs leading-5">
        {review.start}부터 적용 {review.applyDays}일 · 예측 {review.days}일 ·
        요금 {review.pricePct}% · 수요 {review.demandPct}% · 해지{" "}
        {review.cancellationPct}%
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        등록 시점의 시뮬레이션 가정 · 실제 정책 적용을 의미하지 않습니다.
      </p>
    </section>
  );
}
