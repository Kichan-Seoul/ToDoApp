# 할일 + 계획 관리 앱

일일 할 일 → 주간 계획 → 1년 목표를 계층적으로 연결하고, 완료율을 자동으로 집계하는 Next.js 앱입니다.
자세한 아키텍처는 [`docs/CLAUDE.md`](docs/CLAUDE.md), 제품 요구사항은 [`docs/PRD.md`](docs/PRD.md)를 참고하세요.

## 스택

Next.js 16 (App Router) · TypeScript · MongoDB + Mongoose · Next.js API Routes · SWR · `@dnd-kit` · Tailwind CSS

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. MongoDB 준비

이 앱은 진행률 재계산에 MongoDB 트랜잭션(복제셋 필요)을 사용합니다. 두 가지 방법 중 하나를 선택하세요.

**옵션 A — 별도 계정 없이 로컬에서 바로 실행 (권장, 개발용)**

터미널 하나에서:

```bash
npm run dev:db
```

실제 `mongod` 바이너리를 단일 노드 복제셋으로 띄우고 접속 URI를 출력합니다. 데이터는 `.mongo-data/`에 저장되어 재시작해도 유지됩니다.

**옵션 B — MongoDB Atlas (무료 M0 티어, 프로덕션에도 사용 가능)**

Atlas에서 클러스터를 만들고 연결 문자열을 발급받으세요. Atlas 클러스터는 항상 복제셋이라 별도 설정이 필요 없습니다.

### 3. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`의 `MONGODB_URI`를 위 1번 또는 2번에서 얻은 값으로 설정하세요. 기본값(`mongodb://127.0.0.1:27117/todoapp?replicaSet=testset`)은 `npm run dev:db`를 그대로 실행했을 때의 URI와 일치합니다.

### 4. GitHub OAuth 로그인 설정

이 앱은 GitHub OAuth로만 로그인합니다.

1. [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers)에서 "New OAuth App"을 만듭니다.
2. **Homepage URL**: `http://localhost:3000`
   **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
3. 생성된 **Client ID**를 복사하고, **Generate a new client secret**으로 시크릿을 발급받습니다.
4. `.env.local`에 아래 값을 채웁니다 (`.env.local.example` 참고). `SESSION_SECRET`은 `openssl rand -base64 32`로 생성하세요.

   ```bash
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   GITHUB_OAUTH_CALLBACK_URL=http://localhost:3000/auth/github/callback
   SESSION_SECRET=...
   ```

   `GITHUB_CLIENT_SECRET`과 `SESSION_SECRET`은 항상 환경 변수로만 관리하고, 코드나 커밋에 직접 적지 마세요.

> **참고**: 로그아웃은 계정 단위로 세션을 무효화합니다 — 한 기기/브라우저에서 로그아웃하면 같은 계정으로 로그인된 다른 모든 기기/탭의 세션도 즉시 만료됩니다(탈취된 토큰 방지를 위한 의도된 동작).

### 5. 개발 서버 실행 + 첫 로그인

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에 접속하면 `/login`으로 리다이렉트됩니다. "GitHub로 로그인"으로 한 번 로그인하면 여러분의 GitHub 계정(username/avatar)이 DB에 `User`로 저장됩니다. **샘플 데이터를 계정에 연결하려면 아래 6번보다 먼저 이 단계를 완료하세요** — Task는 로그인한 계정의 것만 보이므로, 계정 없이 만든 샘플 데이터는 어떤 화면에도 나타나지 않습니다.

### 6. (선택) 샘플 데이터 시딩

로그인 후, 방금 로그인한 GitHub username으로 시딩하면 바로 보이는 샘플 데이터가 만들어집니다:

```bash
npm run seed -- --username=<github-login>
```

`--username`을 생략하면 Task가 어떤 계정에도 연결되지 않아(`userId: null`) 화면에 보이지 않습니다. 이미 계정 없이 시딩했다면 아래로 나중에 연결할 수 있습니다:

```bash
npm run migrate:add-user-id -- --assign-to=<github-login>
```

## 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run dev:db` | 로컬 MongoDB(단일 노드 복제셋) 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run typecheck` | TypeScript 타입 체크 |
| `npm run test` | Vitest 단위/통합 테스트 (`mongodb-memory-server` 사용) |
| `npm run test:e2e` | Playwright e2e 테스트 (`npm run dev:db`가 떠 있어야 함 — `.env`의 URI와 무관하게 항상 로컬 `todoapp_e2e` DB를 대상으로 실행되어 운영 데이터와 격리됨) |
| `npm run seed -- --username=<github-login>` | 샘플 데이터 시딩 (해당 계정에 연결; 생략 시 `userId: null`) |
| `npm run migrate:add-user-id -- [--assign-to=<github-login>]` | 기존 Task에 `userId` 필드 backfill, `--assign-to` 지정 시 소유자 없는 Task를 해당 계정에 연결 |

## 데이터 직접 확인하기

`mongosh "mongodb://127.0.0.1:27117/todoapp?replicaSet=testset"` 로 접속하거나, MongoDB Compass에 같은 URI를 입력해서 `annualgoals`, `weeklyplans`, `tasks` 컬렉션을 직접 조회할 수 있습니다.
