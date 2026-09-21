"use client";
import { Check, Circle } from "lucide-react";
import { ExperimentForecastChart } from "./experiment-forecast-chart";
import {
  validateAlternative,
  type PolicyAlternative,
} from "./alternative-model";
import {
  registrationScenario,
  REVIEW_SCENARIOS,
} from "./registration-scenarios";
export function RegistrationScenarioReview({
  base,
  selected,
  onSelect,
  onMethodChange,
}: {
  base: PolicyAlternative;
  selected: number | null;
  onSelect: (index: number) => void;
  onMethodChange?: (method: NonNullable<PolicyAlternative["forecastMethod"]>) => void;
}) {
  const preview = registrationScenario(base, selected ?? 0);
  const error = validateAlternative(preview);
  return (
    <section className="space-y-4" aria-label="등록 전 정책 비교">
      <div>
        <h3 className="text-lg font-semibold">어떤 정책을 검토할까요?</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          후보를 선택해 차트를 비교하세요. 최종 선택 전에는 등록되지 않습니다.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {REVIEW_SCENARIOS.map((title, i) => {
          const a = registrationScenario(base, i);
          return (
            <button
              type="button"
              key={title}
              aria-pressed={selected === i}
              onClick={() => onSelect(i)}
              className={`space-y-2 rounded-xl border p-4 text-left transition-colors ${selected === i ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted/40"}`}
            >
              <div className="flex items-center justify-between text-xs text-primary">
                <span>후보 0{i + 1}</span>
                {selected === i ? (
                  <Check className="size-4" />
                ) : (
                  <Circle className="size-4" />
                )}
              </div>
              <h4 className="font-semibold text-sm">{title}</h4>
              <p className="text-xs leading-5 text-muted-foreground">
                {i === 0
                  ? "추가 요금·혜택 변경 없이 기준 전망을 관찰합니다."
                  : i === 1
                    ? "같은 요건을 짧게 적용해 초기 비용과 반응을 점검합니다."
                    : "전체 적용 기간 동안 효과의 지속성과 비용을 검증합니다."}
              </p>
              <p className="text-xs">
                요금 {a.pricePct}% · 적용 {a.applyDays ?? a.days}일
              </p>
            </button>
          );
        })}
      </div>
      <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs" role="status">
        {selected === null
          ? "아직 선택하지 않았습니다. 아래는 현행 유지 기준 전망입니다."
          : `선택: ${REVIEW_SCENARIOS[selected]} · 차트와 등록에 같은 가정을 사용합니다.`}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          시뮬레이션 가정을 확인하세요: {error}
        </p>
      ) : (
        <ExperimentForecastChart experiment={preview} onMethodChange={onMethodChange} />
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        후보는 입력 요건을 재구성한 검토 후보입니다. 수요·해지 반응과 혜택 비용은
        추정하지 않으며, 아래 가정에서 직접 조정할 수 있습니다.
      </p>
    </section>
  );
}
