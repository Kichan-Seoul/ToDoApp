## 참고 문서

- PRD: docs/PRD.md
- 구현계획: docs/PLAN.md
- 프로젝트 계획(승인됨): .omc/plans/todo-app-plan.md

작업 전 반드시 위 문서를 읽고 시작할 것.

## 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- MongoDB + Mongoose (ODM)
- API 레이어: Next.js API Routes (`app/api/**/route.ts`), REST 계약
- 클라이언트 데이터 패칭: SWR
- 드래그 앤 드롭: `@dnd-kit/core` + `@dnd-kit/sortable`
- 테스트: Vitest + `mongodb-memory-server`(단위/통합), Playwright(e2e)

## 계층 구조

`Task N:1 WeeklyPlan N:1 AnnualGoal` — `models/Task.ts`, `models/WeeklyPlan.ts`, `models/AnnualGoal.ts` (Mongoose 스키마).

## 핵심 모듈

- `lib/mongodb.ts` — `connectDB()`. Next.js dev 서버 hot reload 시 연결 중복 생성을 막기 위해 `global` 캐시 패턴 사용. 모든 API route 핸들러의 첫 줄에서 호출.
- `lib/progress.ts` — 진행률 재계산 엔진. `recalcWeeklyProgress(weeklyPlanId, session)` / `recalcAnnualProgress(annualGoalId, session)`. **재연결(reparent) 시 기존/신규 부모 양쪽 모두 재계산**하는 것이 핵심 불변식이며, 모든 재계산은 `mongoose.startSession()` + `session.withTransaction()` 안에서 원자적으로 실행됨.
- `app/api/annual-goals/**`, `app/api/weekly-plans/**`, `app/api/tasks/**` — REST 엔드포인트. `[id]/route.ts`의 동적 세그먼트 `params`는 **Promise**이므로 반드시 `await params`.

## 로컬 개발 DB (Atlas/시스템 설치 불필요)

- `npm run dev:db` — `mongodb-memory-server`로 실제 mongod 바이너리를 단일 노드 복제셋(`replSet: { count: 1 }`)으로 기동, `.mongo-data`에 영속. 트랜잭션 지원을 위해 복제셋 구성이 필수.
- `.env.local`의 `MONGODB_URI`가 이 로컬 인스턴스를 가리킴 (기본값: `mongodb://127.0.0.1:27117/todoapp?directConnection=true`).
- 프로덕션/공유 환경에서는 MongoDB Atlas(M0 무료 티어, 항상 복제셋)로 교체 가능 — `.env.local.example` 참고.
- 참고: brew의 `mongodb/brew` 탭은 이 환경에서 "untrusted tap"으로 차단되어 시스템 전역 설치를 사용하지 않음.

## 테스트

- `npm run test` — Vitest, `mongodb-memory-server`로 실제 MongoDB 동작 기준 진행률 계산 검증 (`tests/progress.test.ts`).
- `npm run test:e2e` — Playwright e2e.
- `npm run typecheck` — `tsc --noEmit`.
