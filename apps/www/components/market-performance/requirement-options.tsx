"use client";
import type { PolicyRequirements } from "./policy-requirements";
const style =
  "h-10 w-full min-w-0 rounded-lg border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";
export function RequirementOptions({
  value,
  price,
  onPrice,
  onChange,
}: {
  value: PolicyRequirements;
  price: number;
  onPrice: (value: number) => void;
  onChange: (value: PolicyRequirements) => void;
}) {
  const options = [
    {
      key: "benefits",
      label: "데이터·통화 혜택",
      values: [
        "데이터 1GB 추가",
        "데이터 3GB 추가",
        "데이터 5GB 추가",
        "데이터 10GB 추가",
        "데이터 20GB 추가",
        "통화 100분 추가",
        "통화 300분 추가",
        "데이터 5GB 추가 · 통화 100분 추가",
      ],
    },
    {
      key: "points",
      label: "포인트·지급 조건",
      values: [
        ...[1000, 3000, 5000, 10000, 20000].flatMap((amount) =>
          ["가입 즉시", "30일 유지 시", "90일 유지 시"].map(
            (condition) =>
              `${condition} 포인트 ${amount.toLocaleString("ko-KR")}원 지급`,
          ),
        ),
      ],
    },
    {
      key: "freeOffers",
      label: "무료 제공·면제",
      values: [
        "eSIM 발급비 무료",
        "유심 배송 무료",
        "유심비 면제",
        "eSIM 발급비 무료 · 유심 배송 무료",
        "유심비 면제 · 유심 배송 무료",
      ],
    },
    {
      key: "other",
      label: "적용 대상",
      values: [
        "전체 고객",
        "신규 가입 고객",
        "번호이동 고객",
        "기존 고객",
        "온라인 신규 가입 고객",
        "20GB 요금제 가입 고객",
        "고용량 요금제 가입 고객",
      ],
    },
  ] as const;
  return (
    <div className="mt-3 grid gap-4 sm:grid-cols-2">
      <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">
        수치와 조건을 선택하세요. 분석된 기존 값이 선택지에 없으면 현재 값으로
        유지합니다. 변경 내용은 요약에 바로 반영됩니다.
      </p>
      <label className="grid gap-2 text-sm font-medium">
        요금 변경률
        <select
          className={style}
          value={price}
          onChange={(e) => {
            const next = Number(e.target.value);
            onPrice(next);
            onChange({ ...value, pricePct: next });
          }}
        >
          {[
            ...new Set([
              -30,
              -20,
              -15,
              -10,
              -7,
              -5,
              -3,
              -1,
              0,
              1,
              3,
              5,
              7,
              10,
              15,
              20,
              30,
              price,
            ]),
          ]
            .sort((a, b) => a - b)
            .map((v) => (
              <option key={v} value={v}>
                {v === 0
                  ? "변경 없음 · 0%"
                  : `${Math.abs(v)}% ${v < 0 ? "인하" : "인상"}`}
              </option>
            ))}
        </select>
      </label>
      {options.map((field) => (
        <label
          key={field.key}
          className="grid min-w-0 gap-2 text-sm font-medium"
        >
          {field.label}
          <select
            className={style}
            value={value[field.key]}
            onChange={(e) =>
              onChange({ ...value, [field.key]: e.target.value })
            }
          >
            <option value="">선택 안 함 · 없음/미확인</option>
            {[
              ...new Set([
                ...field.values,
                ...(value[field.key] ? [value[field.key]] : []),
              ]),
            ].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
