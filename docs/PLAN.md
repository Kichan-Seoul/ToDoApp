# 할일 + 계획 관리 앱 — 프로젝트 계획

status: pending approval
source: docs/PRD.md
mode: direct

## 1. Requirements Summary

PRD(`docs/PRD.md`) 기준 요구사항 요약:

- 계층 구조: `Task(할 일) N:1 WeeklyPlan(주간 계획) N:1 AnnualGoal(1년 목표)` (PRD.md:141-145)
- 할 일 상태: `todo / doing / done`, 신규 기본값 `todo`, 드래그 앤 드롭으로 상태 변경, 드롭 즉시 저장 (PRD.md:88-97)
- 상태 보드: 3개 컬럼(`todo`/`doing`/`done`) (PRD.md:99-103)
- 주간 진행률 = `done 할 일 수 / 전체 할 일 수 × 100`, 연결된 할 일 없으면 `0%` (PRD.md:147-154)
- 연간 진행률 = `연결된 주간 계획들의 주간 진행률 합계 / 주간 계획 수`, 연결된 주간 계획 없으면 `0%` (PRD.md:156-164)
- 재계산 트리거: 할 일 상태 변경/생성/삭제/주간계획 연결 변경 시 → 해당 주간 계획 재계산 → 해당 1년 목표 재계산 (PRD.md:151-153, 161-163, 166-169)
- 재연결(reparent) 시 기존/신규 부모 양쪽 모두 재계산 필요 (PRD.md:153, 163) — 놓치기 쉬운 엣지 케이스
- P0: 3개 엔티티 CRUD, 상태 보드, 일일 구조(날짜별 조회/생성), 진행률 계산 엔진 (PRD.md:71-176)
- P1: 기간별 화면(일/주/연), 주간·연간 상세 화면, 필터(상태/날짜/주간계획/목표), 정렬(생성순/날짜순/상태순), 동일 상태 내 순서 변경, 진행률 Progress Bar (PRD.md:177-215)

PRD에 명시되지 않아 이번 계획에서 결정한 사항 (스콜프 결정):

- **인증 없음, 단일 사용자 로컬 앱**으로 가정 (PRD에 로그인/사용자 개념 전무)
- **웹 앱**으로 가정 (드래그 앤 드롭 UI 언급, 데스크톱/모바일 네이티브 언급 없음)

> 이 두 가정은 스콜프에 큰 영향을 주므로, 실행 승인 전에 다르면 알려주세요. 기본값은 각각 "인증 없음"과 "웹 앱"입니다.

**v2 변경**: 사용자 요청에 따라 DB를 MongoDB, API 레이어를 Next.js API Routes로 변경 (하단 섹션 2 참고).

## 2. Tech Stack Decision

| 영역                   | 선택                                                                                 | 이유                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 프레임워크             | Next.js 14+ (App Router) + TypeScript                                                | 프론트/백엔드/라우팅을 한 프로젝트로 통합                                                                                                                                                     |
| DB                     | **MongoDB** (Atlas 무료 티어 M0 권장) + **Mongoose**                                 | 사용자 지정 (v2). Mongoose로 스키마 검증/타입 확보, Atlas M0는 항상 복제셋(replica set)이라 트랜잭션이 로컬 설정 없이 바로 동작                                                               |
| API 레이어             | **Next.js API Routes** (`app/api/**/route.ts`)                                       | 사용자 지정 (v2). REST 엔드포인트로 CRUD + 상태 변경 노출, Server Actions 대신 명시적 HTTP 계약 사용                                                                                          |
| 클라이언트 데이터 패칭 | SWR                                                                                  | API Routes 기반 구조에서 mutation 후 여러 화면(보드/주간상세/연간상세)의 진행률을 일관되게 재검증하기 위해 필요. 직접 fetch+useState만 쓰면 화면 간 캐시 무효화를 수동으로 관리해야 해서 기각 |
| 스타일                 | Tailwind CSS                                                                         | 빠른 보드/카드/Progress Bar UI 구현                                                                                                                                                           |
| 드래그 앤 드롭         | `@dnd-kit/core` + `@dnd-kit/sortable`                                                | 접근성 지원, 컬럼 간 이동 + 컬럼 내 순서 변경(P1) 모두 지원                                                                                                                                   |
| 테스트                 | Vitest(단위/통합, `mongodb-memory-server`로 인메모리 MongoDB 사용) + Playwright(e2e) | 진행률 계산 로직을 실제 MongoDB 동작에 가깝게 검증, DnD 플로우 e2e 검증                                                                                                                       |

대안으로 고려했으나 기각:

- **React(Vite)+localStorage**: 기기 간 동기화 불가, 데이터 유실 위험 → 기각
- **Server Actions** (v1 초안): 사용자가 명시적으로 API Routes를 요청 (v2) → REST 계약이 필요한 것으로 판단, 변경
- **SQLite/Prisma** (v1 초안): 사용자가 명시적으로 MongoDB를 요청 (v2) → 변경
- **로컬 MongoDB 단일 인스턴스 (복제셋 없음)**: 트랜잭션 미지원으로 재계산 원자성 보장 불가 → Atlas M0 또는 로컬 단일 노드 복제셋(`rs.initiate()`) 필수로 결정

## 3. Data Model (Mongoose Schema)

```ts
// models/AnnualGoal.ts
import { Schema, model, models, Types } from "mongoose";

const AnnualGoalSchema = new Schema(
  {
    title: { type: String, required: true },
    targetYear: { type: Number, required: true },
    annualProgress: { type: Number, default: 0 },
  },
  { timestamps: true }, // createdAt, updatedAt 자동 생성
);

export type AnnualGoalDoc = {
  _id: Types.ObjectId;
  title: string;
  targetYear: number;
  annualProgress: number;
  createdAt: Date;
  updatedAt: Date;
};

export default models.AnnualGoal || model("AnnualGoal", AnnualGoalSchema);
```

```ts
// models/WeeklyPlan.ts
import { Schema, model, models, Types } from "mongoose";

const WeeklyPlanSchema = new Schema(
  {
    title: { type: String, required: true },
    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },
    annualGoalId: {
      type: Schema.Types.ObjectId,
      ref: "AnnualGoal",
      default: null,
    },
    weeklyProgress: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type WeeklyPlanDoc = {
  _id: Types.ObjectId;
  title: string;
  weekStartDate: Date;
  weekEndDate: Date;
  annualGoalId: Types.ObjectId | null;
  weeklyProgress: number;
  createdAt: Date;
  updatedAt: Date;
};

export default models.WeeklyPlan || model("WeeklyPlan", WeeklyPlanSchema);
```

```ts
// models/Task.ts
import { Schema, model, models, Types } from "mongoose";

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ["todo", "doing", "done"], default: "todo" },
    order: { type: Number, default: 0 },
    weeklyPlanId: {
      type: Schema.Types.ObjectId,
      ref: "WeeklyPlan",
      default: null,
    },
  },
  { timestamps: true },
);

export type TaskDoc = {
  _id: Types.ObjectId;
  title: string;
  date: Date;
  status: "todo" | "doing" | "done";
  order: number;
  weeklyPlanId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

export default models.Task || model("Task", TaskSchema);
```

```ts
// lib/mongodb.ts — Next.js dev 서버 hot reload 시 연결 중복 생성 방지용 싱글턴
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

declare global {
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export function connectDB() {
  if (!global._mongooseConn) {
    global._mongooseConn = mongoose.connect(MONGODB_URI);
  }
  return global._mongooseConn;
}
```

- `order` 필드는 P1 "동일 상태 내 순서 변경"을 위해 P0 단계부터 스키마에 포함.
- `annualGoalId` / `weeklyPlanId`는 PRD상 선택적 연결("연결 가능")이므로 nullable, 참조 무결성은 애플리케이션 레벨(API Route 핸들러)에서 검증.

## 4. Progress Recalculation Engine

핵심 엣지 케이스: **재연결 시 기존 부모 + 신규 부모 모두 재계산.** MongoDB 트랜잭션(세션) 내에서 원자적으로 실행.

```ts
// lib/progress.ts
import mongoose from "mongoose";
import Task from "@/models/Task";
import WeeklyPlan from "@/models/WeeklyPlan";
import AnnualGoal from "@/models/AnnualGoal";

export async function recalcWeeklyProgress(
  weeklyPlanId: string,
  session: mongoose.ClientSession,
) {
  const tasks = await Task.find({ weeklyPlanId }).session(session);
  const progress =
    tasks.length === 0
      ? 0
      : (tasks.filter((t) => t.status === "done").length / tasks.length) * 100;

  const plan = await WeeklyPlan.findByIdAndUpdate(
    weeklyPlanId,
    { weeklyProgress: progress },
    { new: true, session },
  );

  if (plan?.annualGoalId) {
    await recalcAnnualProgress(plan.annualGoalId.toString(), session);
  }
}

export async function recalcAnnualProgress(
  annualGoalId: string,
  session: mongoose.ClientSession,
) {
  const plans = await WeeklyPlan.find({ annualGoalId }).session(session);
  const progress =
    plans.length === 0
      ? 0
      : plans.reduce((sum, p) => sum + p.weeklyProgress, 0) / plans.length;

  await AnnualGoal.findByIdAndUpdate(
    annualGoalId,
    { annualProgress: progress },
    { session },
  );
}
```

호출 지점 (모두 `mongoose.startSession()` + `session.withTransaction()` 내부에서 실행하여 원자성 보장):

| 트리거                           | 재계산 대상                                                     |
| -------------------------------- | --------------------------------------------------------------- |
| Task 생성/삭제                   | 해당 `weeklyPlanId`의 주간 진행률 (→ 연쇄적으로 연간)           |
| Task 상태 변경                   | 해당 `weeklyPlanId`의 주간 진행률                               |
| Task의 `weeklyPlanId` 변경       | **기존** `weeklyPlanId` 재계산 + **신규** `weeklyPlanId` 재계산 |
| WeeklyPlan 생성/삭제             | 해당 `annualGoalId`의 연간 진행률                               |
| WeeklyPlan의 `annualGoalId` 변경 | **기존** `annualGoalId` 재계산 + **신규** `annualGoalId` 재계산 |

API Route 핸들러 예시 (Task 상태 변경):

```ts
// app/api/tasks/[id]/status/route.ts
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import Task from "@/models/Task";
import { recalcWeeklyProgress } from "@/lib/progress";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  await connectDB();
  const { status } = await req.json();
  const session = await mongoose.startSession();

  try {
    let updated;
    await session.withTransaction(async () => {
      updated = await Task.findByIdAndUpdate(
        params.id,
        { status },
        { new: true, session },
      );
      if (updated?.weeklyPlanId) {
        await recalcWeeklyProgress(updated.weeklyPlanId.toString(), session);
      }
    });
    return Response.json(updated);
  } finally {
    await session.endSession();
  }
}
```

## 5. Implementation Steps (Phased)

### Phase 0 — 스캐폴딩

1. `npx create-next-app@latest` (TypeScript, Tailwind, App Router)
2. `mongoose` 설치, `lib/mongodb.ts` 연결 싱글턴 작성, `.env.local`에 `MONGODB_URI` 설정 (Atlas M0 클러스터 권장 — 트랜잭션에 복제셋 필요)
3. `@dnd-kit/core`, `@dnd-kit/sortable`, `swr` 설치
4. Vitest, `mongodb-memory-server`, Playwright 설치 및 기본 설정
5. `docs/CLAUDE.md`에 스택/아키텍처 요약 작성 (현재 비어있음)

### Phase 1 — P0 핵심 기능

6. `models/AnnualGoal.ts`, `models/WeeklyPlan.ts`, `models/Task.ts` — Mongoose 스키마 (섹션 3)
7. `lib/progress.ts` — 재계산 엔진 (섹션 4) + Vitest 단위/통합 테스트 (`mongodb-memory-server` 기반, 0건/1건/전체완료/부분완료/재연결 케이스)
8. `app/api/annual-goals/route.ts` (GET 목록/POST 생성), `app/api/annual-goals/[id]/route.ts` (GET/PATCH/DELETE)
9. `app/api/weekly-plans/route.ts`, `app/api/weekly-plans/[id]/route.ts` — 생성/삭제/수정 시 `annualGoalId` 변경이면 기존·신규 양쪽 재계산 호출
10. `app/api/tasks/route.ts`, `app/api/tasks/[id]/route.ts`, `app/api/tasks/[id]/status/route.ts` — 생성/삭제/상태변경/`weeklyPlanId` 변경 시 재계산 호출
11. `app/page.tsx` — 오늘의 할 일 뷰: SWR로 `/api/tasks?date=` 조회, `todo/doing/done` 3컬럼 보드
12. `components/TaskBoard.tsx` — dnd-kit `DndContext`, 컬럼별 `SortableContext`, `onDragEnd` → `PATCH /api/tasks/[id]/status` 호출 후 `mutate()`로 재검증
13. `components/TaskForm.tsx`, `AnnualGoalForm.tsx`, `WeeklyPlanForm.tsx` — fetch 기반 생성/수정 폼, 제출 후 SWR 캐시 무효화

### Phase 2 — P1 확장 기능

14. `app/weekly/page.tsx`, `app/weekly/[id]/page.tsx` — `/api/weekly-plans` 목록/상세 (전체/완료/미완료 할 일 수, 진행률 Progress Bar)
15. `app/goals/page.tsx`, `app/goals/[id]/page.tsx` — `/api/annual-goals` 목록/상세 (연결된 주간 계획별 진행률, 연간 진행률 Progress Bar)
16. 필터 UI (상태별/날짜별/주간계획별/목표별) — API Route에 query parameter로 필터 조건 전달 (`/api/tasks?status=doing&weeklyPlanId=...`)
17. 정렬 UI (생성순/날짜순/상태순) — API Route에 `sort` query parameter 전달
18. `components/ProgressBar.tsx` — 공용 컴포넌트
19. 컬럼 내 순서 변경 (dnd-kit `arrayMove` + `PATCH /api/tasks/[id]`로 `order` 필드 업데이트)

### Phase 3 — 테스트 및 마감

20. Playwright e2e: 할 일 생성 → 드래그로 상태 변경 → 주간/연간 진행률 반영 확인
21. Playwright e2e: 주간 계획 재연결 시 기존/신규 목표 진행률 모두 갱신 확인
22. `scripts/seed.ts` — `connectDB()` 연결 후 샘플 목표/계획/할 일 삽입 (Mongoose 모델 직접 사용)
23. `README.md` — 실행 방법 (`npm run dev`, `MONGODB_URI` 설정 가이드, `mongosh`/Compass로 데이터 확인)

## 6. Acceptance Criteria

- [ ] `AnnualGoal`/`WeeklyPlan`/`Task` 3개 엔티티 모두 REST API로 생성/조회/수정/삭제 가능
- [ ] 새 Task 생성 시 상태 기본값이 `todo`
- [ ] Task를 보드에서 드래그하여 다른 컬럼에 드롭하면 `PATCH /api/tasks/[id]/status` 호출로 상태가 즉시 저장되고 새로고침 없이 반영됨
- [ ] `weeklyProgress = round(done tasks / total tasks * 100)`이며 연결 Task가 0개면 `0%`
- [ ] `annualProgress = sum(weeklyProgress of linked plans) / count(linked plans)`이며 연결 Plan이 0개면 `0%`
- [ ] Task 상태 변경 시 소속 WeeklyPlan 진행률과 연쇄적으로 상위 AnnualGoal 진행률이 재계산됨
- [ ] Task의 `weeklyPlanId`를 변경하면 기존 WeeklyPlan과 신규 WeeklyPlan 양쪽 진행률이 모두 갱신됨 (자동 테스트로 검증)
- [ ] WeeklyPlan의 `annualGoalId`를 변경하면 기존 AnnualGoal과 신규 AnnualGoal 양쪽 진행률이 모두 갱신됨 (자동 테스트로 검증)
- [ ] 날짜별 할 일 조회/생성 가능 (일일 구조)
- [ ] 주간 계획 상세에서 전체/완료/미완료 Task 수와 진행률이 표시됨
- [ ] 1년 목표 상세에서 연결된 각 WeeklyPlan의 진행률과 전체 연간 진행률이 표시됨
- [ ] 상태별/날짜별/주간계획별/목표별 필터가 API query parameter로 동작함
- [ ] 생성순/날짜순/상태순 정렬이 동작함
- [ ] 동일 상태 컬럼 내에서 드래그로 순서 변경이 가능하고 저장됨
- [ ] 재계산이 실패하면 트랜잭션이 롤백되어 부분 업데이트가 남지 않음 (자동 테스트로 검증)

## 7. Risks and Mitigations

| 리스크                                                                   | 완화책                                                                                                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| MongoDB 트랜잭션은 복제셋(replica set) 필요, 로컬 단일 인스턴스는 미지원 | Atlas 무료 티어(M0, 항상 복제셋)를 dev/prod 공통 DB로 사용. 로컬 전용 개발을 원하면 `mongod --replSet rs0` + `rs.initiate()`로 단일 노드 복제셋 구성 |
| Next.js dev 서버 hot reload 시 Mongoose 연결이 중복 생성됨               | `lib/mongodb.ts`에서 `global` 캐시 패턴으로 연결 싱글턴화                                                                                            |
| MongoDB는 스키마 레벨 외래키 제약이 없어 참조 무결성이 보장되지 않음     | API Route 핸들러에서 참조 대상 존재 여부 검증, 부모 삭제 시 자식 문서의 참조 필드를 `null`로 업데이트하는 로직 명시 (섹션 5, 단계 8-10)              |
| 재연결(reparent) 시 한쪽 부모만 재계산하는 버그                          | 섹션 4의 엔진을 API Route에서 "기존 값 조회 → 변경 → 기존/신규 양쪽 재계산" 순서로 트랜잭션 내에 강제, 단위/통합 테스트로 회귀 방지                  |
| 빠른 연속 드래그로 인한 진행률 계산 레이스 컨디션                        | 모든 재계산을 `session.withTransaction()` 내부에서 수행하여 직렬화, SWR optimistic update로 체감 지연 최소화                                         |
| 인증 없음 가정이 틀렸을 경우 스콜프 재작업                               | 섹션 1의 가정을 실행 승인 전 명시적으로 확인 요청                                                                                                    |

## 8. Verification Steps

1. `npm run test` — Vitest 단위/통합 테스트 전체 통과 (`mongodb-memory-server`로 실제 MongoDB 동작 기준 진행률 계산 엣지 케이스 검증)
2. `npm run test:e2e` — Playwright e2e 시나리오 통과 (드래그 상태 변경, 재연결 진행률 전파)
3. `mongosh` 또는 MongoDB Compass로 실제 컬렉션 확인: 시드 데이터 기준 진행률 수치가 수식과 일치하는지 수동 검증
4. `npm run build` — 프로덕션 빌드 성공 확인
5. 브라우저에서 실제 드래그 앤 드롭 동작 확인 (수동 QA, golden path + 빈 목록/빈 진행률 0% 엣지 케이스)

---

## Changelog

- v1 (direct mode): 초기 계획 작성. 인증/플랫폼 가정을 섹션 1에 명시, 재연결 시 양쪽 재계산이 핵심 엣지 케이스임을 강조. 스택: SQLite/Prisma + Server Actions.
- v2 (사용자 요청 반영): DB를 SQLite/Prisma → MongoDB/Mongoose로, API 레이어를 Server Actions → Next.js API Routes로 변경. 클라이언트 데이터 패칭에 SWR 추가 (다중 화면 진행률 재검증 필요). MongoDB 트랜잭션 복제셋 제약을 리스크로 추가하고 Atlas M0 사용을 완화책으로 제시. 데이터 모델을 Mongoose 스키마로 재작성, 재계산 엔진을 `mongoose.ClientSession` 기반 트랜잭션으로 재작성, 참조 무결성 부재 리스크 추가.
