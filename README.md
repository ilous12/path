# PATH — AIIR Market Intelligence

공식 Lumi UI 저장소를 기반으로 AIIR 시장·채널·요금제 변화를 모니터링하는 Next.js 목업입니다.

## 실행

```sh
cd path
pnpm install --frozen-lockfile
pnpm dev
```

- Playground: http://localhost:3100/playground
- 컴포넌트 문서: http://localhost:3100/docs/introduction
- Node.js 24, pnpm 10.33.4
- Next.js 16.3.5, React 19.3.0, TypeScript 5.9.3, Tailwind CSS 4.3.3, Base UI 1.8.0
- `pnpm typecheck`: Next.js 타입 생성 및 TypeScript 검사
- `pnpm build`: 프로덕션 빌드
- `pnpm start`: 빌드 결과 실행 (개발 서버 종료 후)

로컬 next-intl rewrite와 서버 호스트가 일치하도록 `localhost`로 실행합니다.

## 목업 수정 위치

- 페이지: `apps/www/app/[locale]/(view)/playground/page.tsx`
- 현재 대시보드: `apps/www/components/mars/dashboard.tsx`
- 사이드바·검색·알림: `apps/www/components/mars/controls.tsx`
- 공개 관측값·목업 데이터·집계: `apps/www/components/mars/data.ts`
- 원본 예제(보존): `apps/www/registry/blocks/sidebar-03/components/`
- 계정 테이블: `apps/www/components/blocks/data-table/`
- 프로젝트용 Lumi 컴포넌트 52개: `apps/www/components/ui/`
- 테마 및 공통 스타일: `apps/www/styles/`
- Lumi registry 설정: `apps/www/components.json`

기능 코드에서 `@/components/ui/*`를 import합니다. Toast는 원본 문서와 최상위 Toaster가 같은 manager를 쓰도록 원본 모듈을 재수출합니다. `.root` 격리, 애니메이션, highlight 유틸리티를 유지합니다. 다음 작업에서 Lumi 스킬을 이용해 목업을 구성할 수 있습니다.

컴포넌트 추가:

```sh
cd apps/www
pnpm dlx shadcn@latest add @lumi-ui/button
```

기존 컴포넌트 덮어쓰기 질문에는 기존 파일을 보존하고 필요한 변경만 병합합니다.

## 원본과 로컬 변경

- 원본: https://github.com/patrick-xin/lumi-ui
- clone 기준 커밋: `fcacb7da77aab99f863104764dd995fd8ba5fb45`
- 원본 Playground: https://www.lumiui.dev/playground
- 라이선스: MIT (`LICENSE` 보존)
- 원본 소개: `README.upstream.md`
- Next.js 최신 안정 버전 적용 및 pnpm workspace/lockfile 구성
- 문서 도구와 아이콘은 원본과 호환되는 버전으로 고정하고, 빠진 Recharts/RHF 의존성을 명시
- 통화/월 표시를 en-US로 고정해 SSR hydration 오류 해결
- 계정 데이터 기준일을 2026-09-15로 고정해 서버/브라우저의 날짜 차이 방지

Playground는 원본의 데모 데이터와 모의 동작을 유지합니다. 실제 결제·계정 저장·AI API는 연결하지 않았습니다. 송장 생성 등 일부 원본 데모는 성공/실패를 무작위로 시뮬레이션합니다.

기존 독립 프로젝트 `mars/`(즉, `/Users/1111304/work/github/mars/mars`)는 보존했으며 새 저장소의 Git 추적에서 제외합니다.


## AIIR 모니터링 목업

- 기간 선택(월간·일간·날짜+시간), 경쟁사 필터, 이벤트 표시, 지표 토글
- KPI: 매출·비용·이익률·기간 말 활성 회선수. 기간/채널/상품 집계는 같은 데이터셋에서 계산
- Event Table: 검색·정렬·상태/판단 필터·열 표시·페이지 이동
- Event Detail: 변경/비교 근거, 영향 범위, 이탈 위험, 후속 검토 조건. 상태 변경은 현재 세션에만 반영
- Top channels: APP/TOSS/KAKAO/MOYO/기타. 채널 선택은 요금제 순위에 연결
- Top Plan: AIIR 공식 6종, 상품 클릭 시 공식·MOYO 관측 정책 비교
- AI 패널: 선택 이벤트·기간을 반영하는 템플릿 응답과 문서 탭. 외부 AI 모델 호출 없음
- 기본 기간은 2026-09-01~15, 가상 실적 범위는 2026-08-01~09-15. 시간 단위 데이터
- TDDS 내부 상품·실적은 제공되지 않아 별도 수치를 생성하지 않음
- 검증: `pnpm --filter www exec tsx scripts/test-mars.ts`
- 자료 출처와 구분 원칙: `apps/www/components/mars/SOURCES.md`
