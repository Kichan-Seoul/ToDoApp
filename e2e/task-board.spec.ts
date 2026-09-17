import { test, expect, type APIRequestContext } from "@playwright/test";

async function createAnnualGoal(request: APIRequestContext, title: string) {
  const res = await request.post("/api/annual-goals", {
    data: { title, targetYear: 2026 },
  });
  return (await res.json())._id as string;
}

async function createWeeklyPlan(
  request: APIRequestContext,
  title: string,
  annualGoalId: string | null
) {
  const res = await request.post("/api/weekly-plans", {
    data: {
      title,
      weekStartDate: "2026-01-01",
      weekEndDate: "2026-01-07",
      annualGoalId,
    },
  });
  return (await res.json())._id as string;
}

function todayISO(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

test.describe("할 일 생성 -> 드래그로 상태 변경 -> 진행률 반영", () => {
  let goalId: string;
  let planId: string;
  let taskId: string | undefined;
  const taskTitle = `[e2e] 드래그로 완료할 할 일 ${Date.now()}`;

  test.beforeEach(async ({ request }) => {
    goalId = await createAnnualGoal(request, "[e2e] 보드 드래그 테스트 목표");
    planId = await createWeeklyPlan(request, "[e2e] 보드 드래그 테스트 계획", goalId);
    taskId = undefined;
  });

  test.afterEach(async ({ request }) => {
    if (taskId) await request.delete(`/api/tasks/${taskId}`);
    await request.delete(`/api/weekly-plans/${planId}`);
    await request.delete(`/api/annual-goals/${goalId}`);
  });

  test("생성한 할 일을 드래그로 완료 처리하면 주간/연간 진행률이 100%가 된다", async ({
    page,
  }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "새 할 일" }).click();
    await page.getByLabel("제목").fill(taskTitle);
    await page.locator('input[type="date"]').last().fill(todayISO());
    await page
      .getByLabel("연결할 주간 계획")
      .selectOption({ label: "[e2e] 보드 드래그 테스트 계획" });

    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().endsWith("/api/tasks") && res.request().method() === "POST"
      ),
      page.getByRole("button", { name: "저장" }).click(),
    ]);
    taskId = (await createResponse.json())._id as string;

    const card = page.getByText(taskTitle);
    await expect(card).toBeVisible();

    const doneColumn = page
      .getByRole("heading", { name: "완료", exact: true })
      .locator("xpath=ancestor::div[contains(@class,'rounded-2xl')][1]");

    const cardBox = await card.boundingBox();
    const doneColumnBox = await doneColumn.boundingBox();
    if (!cardBox || !doneColumnBox) throw new Error("드래그 대상 좌표를 찾지 못했습니다.");

    await page.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(doneColumnBox.x + doneColumnBox.width / 2, doneColumnBox.y + 100, {
      steps: 10,
    });
    await page.mouse.up();

    await expect(doneColumn).toContainText(taskTitle);

    await page.goto(`/weekly/${planId}`);
    await expect(page.getByText("주간 진행률")).toBeVisible();
    await expect(page.getByText("100%")).toBeVisible();

    await page.goto(`/goals/${goalId}`);
    await expect(page.getByText("연간 진행률")).toBeVisible();
    await expect(page.getByText("100%")).toBeVisible();
  });
});
