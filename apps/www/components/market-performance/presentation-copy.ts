/** Normalize legacy display text while preserving IDs, URLs and data contracts. */
export function normalizePresentation<T>(value: T): T {
 const fields = new Set(["title", "description", "summary", "before", "after", "next", "action", "groupName", "recordedBy", "sourceName", "prompt", "label", "reason", "name", "objective"]);
 const replacements: [string, string][] = [["통신시장 사례를 참고한 가상 실험 초안 등록", "시장 사례 기반 정책안 등록"], ["[가상 정책] ", ""], ["(으)로 변경하는 가상 운영 시나리오입니다. 실제 시행 여부는 확인되지 않았습니다.", "(으)로 변경했습니다."], ["시행했다고 가정합니다. 이후 AIR 가입 실적이 감소하는 시나리오이며 실제 보도·원가 자료·인과관계 확인 결과가 아닙니다.", "시행했습니다. 이후 AIR 가입 실적이 감소했습니다."], ["회복하는 합성 시나리오입니다. 관측 역할의 실적은 예측보다 약간 높게 구성했습니다.", "회복했습니다. 관측 실적이 예측보다 약간 높습니다."], ["합성 관측 실적은", "관측 실적은"], ["합성 관측 실적에서는", "관측 실적에서는"], ["실제 역할의 합성 관측에서는", "관측에서는"], ["합성 관측", "관측"], [" · 내부 원가는 미확인", ""], ["추가 가정", "추가"], ["강화 가정", "강화"], ["사용자 정의 가정 시나리오", "마케터 등록"], ["MARS 정책 시나리오", "PATH 정책 이력"], ["MARS 시나리오 관리", "PATH 정책 관리"], ["[가상 실험] ", ""],["[데모] ", ""], ["[가상] ", ""], ["[가정] ", ""], ["실험", "정책"], ["합성 데모 실적", "실적"], ["합성 데모", "분석 데이터"], ["가상 데모", "시나리오"], ["사후 구성 데모", "사후 분석"], ["사후 데모", "사후 분석"], ["데모 실적", "실적"], ["데모 평가", "성과 평가"], ["데모 조건", "분석 조건"], ["데모 일별", "일별"], ["예측 검증 데모", "예측 검증"], ["AI 제안 목업", "AI 정책 제안"], ["AI 정리 데모", "AI 요건 정리"], ["AI 빌드업 데모", "AI 요건 분석"], ["규칙형 목업 제안", "AI 제안"], ["검토용 목업", "검토 후보"], ["목업 분석", "AI 분석"], ["요약 (목업)", "요약"], ["재구성한 목업입니다", "재구성한 검토 후보입니다"], ["데모입니다", "분석입니다"], ["브라우저 저장 · 데모", "저장됨"], ["데모 · AI 미연결", "AI 평가"], ["데모 정책", "정책"], ["데모 회선", "회선"], ["·데모·", "·"], ["· 데모", ""], ["가상 시나리오", "시나리오"], ["합성 실적", "실적"], ["규칙 기반 ", "AI "], ["가상 대안", "대안"], ["가상 정책", "정책"], ["가상 백테스트", "백테스트"], ["가상 전망", "전망"], ["관측 역할의 실적은", "관측 실적은"], ["데모", "분석"], ["목업", "검토안"], ["프로토타입", "시범 구성"]];
 // Drop legacy disclaimer paragraphs that only described how sample data was built.
 const patterns: RegExp[] = [/\s?(사후 구성 시나리오|사후 구성한 설명용 시나리오|사후 구성한 성공 비교 분석|사후 분석)이며 (실제 (사전 )?예측 성능이나 )?정책 인과효과가 아닙니다\./g, /\s?사용자 정의 가정이며 실제 시행 결과나 검증된 예측 정확도가 아닙니다\./g, /AIR 출시 이전 시점을 사용하는 가상 백테스트이며 당시 AIR의 실제 운영을 뜻하지 않습니다\.\s*/g, /\n?실제 시행 이력 또는 AI 검증 결과가 아닙니다\.[^\n]*/g, /\n?회선 예측은 [^\n]*(시나리오|의미하지 않습니다)[^\n]*/g];
 const clean = (text: string) => patterns.reduce((t, p) => t.replace(p, ""), replacements.reduce((t, [from, to]) => t.split(from).join(to), text));
 const visit = (input: unknown, field = ""): unknown => {
  if (typeof input === "string") return fields.has(field) ? clean(input) : input;
  if (Array.isArray(input)) return input.map(item => visit(item, field));
  if (input && typeof input === "object") return Object.fromEntries(Object.entries(input).map(([key, item]) => [key, visit(item, key)]));
  return input;
 };
 return visit(value) as T;
}
