# PATH v2 — 판매정책 의사결정 대시보드 재구성

작성일: 2026-09-28 · 대상: `apps/www` (Next.js 16, Lumi UI + Base UI, recharts)

## 1. 기존 소스 분석 요약

| 영역 | 기존 구성 | 한계 |
| --- | --- | --- |
| 라우팅 | `/?workspace=&view=` 쿼리 한 페이지. `dashboard-view.tsx`가 30여 개 view 분기 | 메뉴가 기능 단위(채널·요금제·시장 동향·정책 계획)로 흩어져 업무 흐름과 불일치 |
| 데이터 | `data.ts`(AIIR 일별 실적·이벤트), `home-performance.ts`(TDDS·MVVNO 파생 시리즈), `plan-catalog.json`(aiir + 모요 2,187개 요금제), `channel-data.ts`(AIIR 채널 배분) | TDDS 채널·요금제, MVVNO 시장·사업자 데이터 없음. 워크스페이스 차트가 AIIR 데이터를 공유 |
| 정책·캠페인 | `policy-group-*`(리비전·시뮬레이션·실행), `registration-wizard.tsx`(991줄) | 등록→예측→조정→실행→성과가 한 흐름으로 보이지 않음 |
| AI | `path-intelligence.ts` 규칙 기반 신호·가설, 화면별 요약 | 페이지·필터 연동 인사이트 부재 |
| 설정·데이터 | `management-console.tsx`, `data-explorer.tsx` | 요건(참조 소스·유형·변곡점 기준 / 6개 데이터 영역)과 구조 불일치 |

## 2. 요건 ↔ 화면 매핑 (v2)

| 요건 | URL (`/?workspace=…&view=…`) | 구현 |
| --- | --- | --- |
| 1.1 Online 통합 현황 | `home` · `online` | KPI 6종, aiir+TDDS 누적 추이·목표·월말 전망 밴드, TDDS·aiir 요약(순증 목표 달성률, Online 기여도, 동향·정책 변경, 캠페인 현황, 섹션별 AI Insight, 상세 이동) |
| 1.2 MVVNO 현황 | `home` · `mvvno-summary` | 시장 규모·SKKT망 점유율·순증 목표·캠페인 예상 성과, 망별 추이, 사업자 기여, 주요 변화 |
| 2.1/3.1 현황 | `aiir·tdds` · `overview` | 가입·해지·순증·매출·순익·전망, 목표선·전망 추이, 시장 요약, 판매정책 변경, 채널 기여 |
| 2.2/3.2/4.2 이벤트 타임라인 | `timeline` | 실적×이벤트(시장·자사·변곡점·캠페인 구간), 발생·영향·대응·경과 표, 캠페인 일정·예측·실적 간트 |
| 2.3/3.3 상품·채널 | `products` | 상품 섹션(스펙트럼 + 판매조건·경쟁력 표)과 채널 섹션(가입·해지·순증·매출·비중·취급 요금제·캠페인) — 섹션별 독립 검색·필터·페이지 + AI Insight |
| 4.1 시장 현황 | `mvvno` · `market` | 시장 규모·망별·사업자별 동향, 신규·번호이동·순증·매출·점유율·목표 |
| 4.3 상품·포트폴리오 | `mvvno` · `portfolio` | 요금제 경쟁력, 망·사업자·상품군 구성, 추정 마진 |
| 2.4/3.4/4.4 판매 정책·캠페인 | `campaigns&step=register|forecast|adjust|execute|analyze` | 등록 → 미시행 대비 예측·대안 A/B/C 비교 → 슬라이더 재예측·버전 저장 → 상태 보드(확정·예약·진행·중단·종료) → 예측 대비 실적·달성률·개선안. MVVNO는 망·사업자·지원 조건·재원·사업자별 기여도 어휘 사용 |
| 5.1~5.6 데이터 | `data&table=performance|events|offers|campaigns|reference|targets` | 공통 데이터 표(검색·필터·정렬·페이지) + AI Insight |
| 6.1~6.3 설정 | `settings&tab=sources|types|pivot` | 참조 소스(기존 SourceManager 재사용), 이벤트 유형 참조, 변곡점 기준(변화율·최소 변화량·비교 기간, 미리보기, 판단 프롬프트) |
| 테넌트 | 사이드바 상단 | 테넌트 카드(SK텔레콤 · 온라인사업본부) + 워크스페이스 전환, 사용자 역할 표시 |

모든 페이지 우측의 **AI Insight**는 기간(`period`), 대상(워크스페이스·캠페인), 표 필터·검색 결과를 입력으로 다시 계산되며, 범위 칩으로 근거 조건을 표시합니다.

## 3. 구조

```
components/path/
  model.ts       사업별 실적·비교·목표·월/연 전망(밴드)
  market.ts      요금제(aiir·TDDS·시장), 채널, 이벤트, 변곡점, MVVNO 시장·사업자
  campaigns.ts   캠페인 모델·예측(대안 A/B/C)·버전·상태 저장소 (localStorage `path-v2-campaigns`)
  insights.ts    페이지별 AI Insight 생성
  state.ts       기간 필터(URL), 변곡점 기준, 테넌트 세션
  ia.ts          메뉴·경로 정의, 롤백 플래그
  ui.tsx charts.tsx blocks.tsx nav.tsx view.tsx
  pages/         home · overview · timeline · products · campaigns · mvvno · data · settings
```

연결 지점은 두 파일뿐입니다: `registry/blocks/sidebar-03/components/dashboard-view.tsx`(PathView/PathTitle), `app-sidebar.tsx`(PathSidebar). 기존 컴포넌트는 삭제하지 않았습니다.

### 모델 가정 (교체 지점)
- TDDS·MVVNO 실적은 `home-performance.ts` 파생 시리즈, TDDS 요금제·채널과 MVVNO 시장·사업자 수치는 `market.ts`의 결정적 합성 데이터입니다. 원천 연동 시 이 파일만 교체합니다.
- 캠페인 예측은 가격·포인트·데이터 반응(체감 수확) + 예산 상한 + 종료 후 14일 잔존 효과, 매출은 증분 회선 × ARPU × 24개월(LTV)입니다 (`campaigns.ts forecast`).
- AI Insight는 규칙 기반 생성입니다 (`insights.ts`). LLM/ML 서비스 연결 시 같은 `Insight[]` 형식으로 반환하면 UI 변경 없이 교체됩니다.

## 4. 롤백 계획

| 단계 | 방법 | 소요 | 영향 |
| --- | --- | --- | --- |
| 1. 즉시 전환 | `apps/www/.env.local`에 `NEXT_PUBLIC_PATH_UI=v1` 추가 후 dev/build 재시작 | 1분 | 기존 UI 전체 복귀. v2 코드는 남아 있음 |
| 2. 연결 해제 | `dashboard-view.tsx`, `app-sidebar.tsx`의 `PATH_V2` 분기 2곳 제거 (또는 `git checkout` 해당 2개 파일) | 5분 | v2 폴더는 미사용 상태로 유지 |
| 3. 코드 제거 | `rm -rf apps/www/components/path docs/PATH-V2.md` + 2단계 | 5분 | v2 완전 제거 |
| 4. 전체 스냅샷 복원 | `git read-tree`/`checkout` 대신 아래 명령으로 v2 착수 직전 작업 트리 복원 | 10분 | 착수 직전(2026-09-28) 미커밋 변경 포함 전체 복원 |

스냅샷: `refs/backups/path-v1-2026-09-28` (`f922a9f`) — 착수 시점 HEAD `4f7779f` 위에 당시 작업 트리 전체(미커밋·신규 파일 포함)를 커밋 객체로 보관했습니다. 브랜치·인덱스는 건드리지 않았습니다.

```sh
# 스냅샷 내용 확인
git show --stat refs/backups/path-v1-2026-09-28
# 특정 파일만 복원
git checkout refs/backups/path-v1-2026-09-28 -- apps/www/registry/blocks/sidebar-03/components/dashboard-view.tsx
# 전체 복원(현재 변경을 먼저 보관할 것)
git stash push -u -m "path-v2" && git checkout refs/backups/path-v1-2026-09-28 -- .
```

브라우저 저장소: v2는 `path-v2-campaigns`, `path-v2-pivot-criteria` 키만 추가로 사용합니다. 기존 키는 수정하지 않습니다.

## 5. 검증
- `pnpm typecheck`, `pnpm build`, `node scripts/check-market-data.cjs` 통과
- FHD(1920×1080)에서 16개 주요 화면 렌더링·콘솔 오류 없음 확인
- 캠페인 흐름: 등록 → 결과 예측(대안 선택) → 계획 조정(v2 저장) → 실행·관리(초안→확정) 확인
