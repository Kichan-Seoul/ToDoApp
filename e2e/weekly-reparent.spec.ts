import { test, expect, type APIRequestContext } from "@playwright/test";

async function createAnnualGoal(request: APIRequestContext, title: string) {
  const res = await request.post("/api/annual-goals", {
    data: { title, targetYear: 2026 },
  });
  return (await res.json())._id as string;
}

test.describe("WeeklyPlan의 AnnualGoal 재연결 시 양쪽 진행률 갱신", () => {
  let goalAId: string;
  let goalBId: string;
  let planId: string;
  let taskId: string;

  test.beforeEach(async ({ request }) => {
    goalAId = await createAnnualGoal(request, "[e2e] 재연결 목표 A");
    goalBId = await createAnnualGoal(request, "[e2e] 재연결 목표 B");

    const planRes = await request.post("/api/weekly-plans", {
      data: {
        title: "[e2e] 재연결 대상 계획",
        weekStartDate: "2026-01-01",
        weekEndDate: "2026-01-07",
        annualGoalId: goalAId,
      },
    });
    planId = (await planRes.json())._id;

    const taskRes = await request.post("/api/tasks", {
      data: {
        title: "[e2e] 완료된 할 일",
        date: "2026-01-02",
        status: "done",
        weeklyPlanId: planId,
      },
    });
    taskId = (await taskRes.json())._id;
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`/api/tasks/${taskId}`);
    await request.delete(`/api/weekly-plans/${planId}`);
    await request.delete(`/api/annual-goals/${goalAId}`);
    await request.delete(`/api/annual-goals/${goalBId}`);
  });

  test("계획을 목표 A에서 목표 B로 재연결하면 A는 0%, B는 100%가 된다", async ({
    request,
    page,
  }) => {
    const goalABefore = await (await request.get(`/api/annual-goals/${goalAId}`)).json();
    expect(goalABefore.annualProgress).toBe(100);

    await page.goto(`/weekly/${planId}`);
    await expect(page.getByText("100%")).toBeVisible();

    await page.getByRole("button", { name: "수정" }).click();
    await page
      .getByLabel("연결할 1년 목표")
      .selectOption({ label: "[e2e] 재연결 목표 B" });
    await page.getByRole("button", { name: "저장" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.goto(`/goals/${goalAId}`);
    await expect(page.getByText("연간 진행률")).toBeVisible();
    await expect(page.getByText("0%")).toBeVisible();

    await page.goto(`/goals/${goalBId}`);
    await expect(page.getByText("연간 진행률")).toBeVisible();
    await expect(page.getByText("100%")).toBeVisible();
  });
});
