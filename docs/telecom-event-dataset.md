# 통신시장 이벤트 데이터 — 2026-09-21 스냅샷

## 구성

- 기간: 2024-09-21~2026-09-21, 한국 날짜 기준 최근 2년.
- 실제 보도 기반 이벤트: 200건, 원문 URL 191개. 동일 발표의 서로 다른 조치는 개별 이벤트로 기록했다.
- 고정 시드 랜덤 데모: 100건. 제목·출처·분류에 가상임을 표시했다. 실제 날짜를 무작위로 바꾸지 않았다.
- 가상 실험: 12개. AIR 7개, TDS 2개, MVNO 3개. SKT·MNO 시장 전략 관점도 포함한다. 모두 초안이며 실제 시행된 실험이 아니다.
- 실제 보도 수행 주체: SKT 86, LG U+ 89, KT 10, MVNO 10, AIR 5. SKT·LG U+ 뉴스룸 중심 표본이므로 시장 전체를 대표하지 않는다.

## 날짜·근거 원칙

`startAt`은 실제 자료의 **발표일**이다. `00:00`은 정렬용으로, 실제 발생 시각을 뜻하지 않는다. 본문에서 확인한 발생·시행일은 `effectiveDate`로 별도 보존한다. 발표한 계획과 실행 완료를 혼동하지 않도록 모든 실제 보도에 `발표/계획 포함`을 표시한다. 종료일이 확인되지 않은 실제 보도에는 임의 종료일을 만들지 않았다.

공식 뉴스룸 807건에서 소비자 요금·혜택·개통·로밍·보안 관련 185건을 추린 후 각 원문의 게시 메타데이터를 다시 확인했다. 공동 발표·재공지 중복을 줄이고 SKT 사고 대응, KT 보안·요금제, MVNO 제휴·가격 사례를 보완했다. 뉴스룸 항목은 원문 제목 중심의 관측 기록이며 상세 조건·시행 완료까지 독립적으로 실사했다는 의미가 아니다. 사건 전체의 최신 조사 결론이 아니라 **해당 발표 당시의 내용**이다.

원문 전체는 저장하지 않는다. 제목·URL·발표일과 짧은 조치 요약만 보존한다. 가격·매출·피해 수치가 확인되지 않은 항목은 임의 수치로 채우지 않는다.

## 대표 원문

- SKT 침해 공개·신고·격리: https://news.sktelecom.com/211423
- SKT 유심 무료 교체: https://news.sktelecom.com/211563
- SKT 고객 안심 패키지: https://news.sktelecom.com/212534
- SKT 보상·복귀 혜택·정보보호 투자 계획: https://news.sktelecom.com/en/1979
- KT 소액결제 사고 대응 브리핑 보도: https://m.newspim.com/news/view/20250911001149
- AIR 개통 시작: https://news.sktelecom.com/215805
- AIR 등 고객 혜택 확대: https://news.sktelecom.com/228558
- KT엠모바일 가격 인하: https://www.newspim.com/news/view/20260811000468

## 화면 및 저장

이벤트 페이지의 `최근 2년`과 `데이터 구분` 필터로 전체·실제 보도·가상 데모를 조회한다. 원문 링크를 열 수 있으며 등록한 사용자 이벤트는 유지된다. 타임라인에도 2년 조회를 제공한다.

실험 초기 데이터는 기존 localStorage와 ID 기준으로 병합한다. 같은 ID에 대한 사용자의 그룹·상태 변경을 우선하며, 신규 fixture만 보충한다. 삭제/변경을 위해 사용자의 저장소를 초기화하지 않는다.

실험별 가격·수요·해지·비용은 검증 전 수동 가정이다. 워크스페이스는 관점 구분이며 실적 기준은 기존 공통 합성 시계열이다. 실제 SKT·KT·LG U+ 매출을 의미하지 않는다. 뉴스와 합성 실적의 인과관계를 주장하던 이전 고정 예시 로직을 제거했다.

## 파일·검증

- 앱 입력: `apps/www/components/market-performance/fixtures/telecom-{news,demo,experiments,manifest}.json`
- CSV: `data/research/telecom-events-20260921.csv`
- 출처 확인 목록: `data/research/telecom-news-verified.json`
- 수집: `python3 scripts/collect-telecom-news.py`
- 출처 메타데이터 확인: `python3 scripts/verify-telecom-sources.py`
- 정적 이벤트 재생성: `python3 scripts/build-telecom-dataset.py`
- 데이터 무결성: `node scripts/check-telecom-dataset.cjs`
- 회귀검증: `node scripts/check-market-data.cjs`, `node scripts/check-alternatives.cjs`

자동 주기 수집이 아닌 고정 스냅샷이다. 자료 갱신 시 기준일, 출처 확인, 중복 제거와 검토를 다시 수행한다.
