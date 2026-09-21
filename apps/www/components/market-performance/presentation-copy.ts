/** Normalize legacy display text while preserving IDs, URLs and data contracts. */
export function normalizePresentation<T>(value: T): T {
 const fields = new Set(["title", "description", "summary", "before", "after", "next", "action", "groupName", "recordedBy", "sourceName", "prompt", "label", "reason"]);
 const replacements: [string, string][] = [["합성 데모 실적", "합성 실적"], ["합성 데모", "합성 데이터"], ["가상 데모", "가상 시나리오"], ["사후 구성 데모", "사후 구성 시나리오"], ["사후 데모", "사후 구성 시나리오"], ["[데모] ", "[가상] "], ["데모 실적", "합성 실적"], ["데모 평가", "시나리오 평가"], ["데모 조건", "분석 조건"], ["데모 일별", "시나리오 일별"], ["예측 검증 데모", "예측 비교 시나리오"], ["AI 제안 목업", "정책 후보 제안 · 규칙 기반"], ["AI 정리 데모", "요건 정리"], ["AI 빌드업 데모", "요건 분석"], ["규칙형 목업 제안", "규칙 기반 제안"], ["검토용 목업", "검토 후보"], ["목업 분석", "규칙 기반 분석"], ["요약 (목업)", "요약"], ["재구성한 목업입니다", "재구성한 검토 후보입니다"], ["데모입니다", "시나리오입니다"], ["브라우저 저장 · 데모", "브라우저 저장"], ["데모 · AI 미연결", "규칙 기반 평가"], ["데모 실험", "실험"], ["데모 회선", "시나리오 회선"], ["·데모·", "·가상 시나리오·"], ["· 데모", "· 가정 기반"], ["데모", "시나리오"], ["목업", "검토안"], ["프로토타입", "시범 구성"]];
 const visit = (input: unknown, field = ""): unknown => {
  if (typeof input === "string") return fields.has(field) ? replacements.reduce((text, [from, to]) => text.split(from).join(to), input) : input;
  if (Array.isArray(input)) return input.map(item => visit(item, field));
  if (input && typeof input === "object") return Object.fromEntries(Object.entries(input).map(([key, item]) => [key, visit(item, key)]));
  return input;
 };
 return visit(value) as T;
}
