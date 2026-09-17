import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import AnnualGoal from "@/models/AnnualGoal";
import WeeklyPlan from "@/models/WeeklyPlan";
import Task from "@/models/Task";
import { recalcWeeklyProgress, recalcAnnualProgress } from "@/lib/progress";

let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri("todoapp-test"));
}, 60000);

afterEach(async () => {
  await Task.deleteMany({});
  await WeeklyPlan.deleteMany({});
  await AnnualGoal.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

async function withSession<T>(fn: (session: mongoose.ClientSession) => Promise<T>) {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

describe("recalcWeeklyProgress", () => {
  it("returns 0% when the plan has no linked tasks", async () => {
    const plan = await WeeklyPlan.create({
      title: "Week 1",
      weekStartDate: new Date("2026-01-01"),
      weekEndDate: new Date("2026-01-07"),
    });

    await withSession((session) => recalcWeeklyProgress(plan._id.toString(), session));

    const updated = await WeeklyPlan.findById(plan._id);
    expect(updated?.weeklyProgress).toBe(0);
  });

  it("computes done/total * 100 for a partially completed plan", async () => {
    const plan = await WeeklyPlan.create({
      title: "Week 1",
      weekStartDate: new Date("2026-01-01"),
      weekEndDate: new Date("2026-01-07"),
    });
    await Task.create([
      { title: "A", date: new Date(), status: "done", weeklyPlanId: plan._id },
      { title: "B", date: new Date(), status: "todo", weeklyPlanId: plan._id },
      { title: "C", date: new Date(), status: "doing", weeklyPlanId: plan._id },
      { title: "D", date: new Date(), status: "done", weeklyPlanId: plan._id },
    ]);

    await withSession((session) => recalcWeeklyProgress(plan._id.toString(), session));

    const updated = await WeeklyPlan.findById(plan._id);
    expect(updated?.weeklyProgress).toBe(50);
  });

  it("computes 100% when every linked task is done", async () => {
    const plan = await WeeklyPlan.create({
      title: "Week 1",
      weekStartDate: new Date("2026-01-01"),
      weekEndDate: new Date("2026-01-07"),
    });
    await Task.create([
      { title: "A", date: new Date(), status: "done", weeklyPlanId: plan._id },
      { title: "B", date: new Date(), status: "done", weeklyPlanId: plan._id },
    ]);

    await withSession((session) => recalcWeeklyProgress(plan._id.toString(), session));

    const updated = await WeeklyPlan.findById(plan._id);
    expect(updated?.weeklyProgress).toBe(100);
  });

  it("cascades into the linked AnnualGoal's annualProgress", async () => {
    const goal = await AnnualGoal.create({ title: "Goal", targetYear: 2026 });
    const plan = await WeeklyPlan.create({
      title: "Week 1",
      weekStartDate: new Date("2026-01-01"),
      weekEndDate: new Date("2026-01-07"),
      annualGoalId: goal._id,
    });
    await Task.create([{ title: "A", date: new Date(), status: "done", weeklyPlanId: plan._id }]);

    await withSession((session) => recalcWeeklyProgress(plan._id.toString(), session));

    const updatedGoal = await AnnualGoal.findById(goal._id);
    expect(updatedGoal?.annualProgress).toBe(100);
  });
});

describe("recalcAnnualProgress", () => {
  it("returns 0% when the goal has no linked weekly plans", async () => {
    const goal = await AnnualGoal.create({ title: "Goal", targetYear: 2026 });

    await withSession((session) => recalcAnnualProgress(goal._id.toString(), session));

    const updated = await AnnualGoal.findById(goal._id);
    expect(updated?.annualProgress).toBe(0);
  });

  it("averages weeklyProgress across all linked plans", async () => {
    const goal = await AnnualGoal.create({ title: "Goal", targetYear: 2026 });
    await WeeklyPlan.create([
      {
        title: "Week 1",
        weekStartDate: new Date(),
        weekEndDate: new Date(),
        annualGoalId: goal._id,
        weeklyProgress: 100,
      },
      {
        title: "Week 2",
        weekStartDate: new Date(),
        weekEndDate: new Date(),
        annualGoalId: goal._id,
        weeklyProgress: 0,
      },
    ]);

    await withSession((session) => recalcAnnualProgress(goal._id.toString(), session));

    const updated = await AnnualGoal.findById(goal._id);
    expect(updated?.annualProgress).toBe(50);
  });
});

describe("reparenting", () => {
  it("updates both the old and new WeeklyPlan's weeklyProgress when a Task moves plans", async () => {
    const planA = await WeeklyPlan.create({
      title: "Plan A",
      weekStartDate: new Date(),
      weekEndDate: new Date(),
    });
    const planB = await WeeklyPlan.create({
      title: "Plan B",
      weekStartDate: new Date(),
      weekEndDate: new Date(),
    });
    const task = await Task.create({
      title: "T",
      date: new Date(),
      status: "done",
      weeklyPlanId: planA._id,
    });

    // Task starts as the only (done) task in Plan A -> Plan A should be 100%.
    await withSession((session) => recalcWeeklyProgress(planA._id.toString(), session));
    expect((await WeeklyPlan.findById(planA._id))?.weeklyProgress).toBe(100);

    // Reparent: move the task from Plan A to Plan B, recalc BOTH sides.
    await withSession(async (session) => {
      await Task.findByIdAndUpdate(task._id, { weeklyPlanId: planB._id }, { session });
      await recalcWeeklyProgress(planA._id.toString(), session);
      await recalcWeeklyProgress(planB._id.toString(), session);
    });

    expect((await WeeklyPlan.findById(planA._id))?.weeklyProgress).toBe(0);
    expect((await WeeklyPlan.findById(planB._id))?.weeklyProgress).toBe(100);
  });

  it("updates both the old and new AnnualGoal's annualProgress when a WeeklyPlan moves goals", async () => {
    const goalA = await AnnualGoal.create({ title: "Goal A", targetYear: 2026 });
    const goalB = await AnnualGoal.create({ title: "Goal B", targetYear: 2026 });
    const plan = await WeeklyPlan.create({
      title: "Plan",
      weekStartDate: new Date(),
      weekEndDate: new Date(),
      annualGoalId: goalA._id,
      weeklyProgress: 80,
    });

    await withSession((session) => recalcAnnualProgress(goalA._id.toString(), session));
    expect((await AnnualGoal.findById(goalA._id))?.annualProgress).toBe(80);

    await withSession(async (session) => {
      await WeeklyPlan.findByIdAndUpdate(plan._id, { annualGoalId: goalB._id }, { session });
      await recalcAnnualProgress(goalA._id.toString(), session);
      await recalcAnnualProgress(goalB._id.toString(), session);
    });

    expect((await AnnualGoal.findById(goalA._id))?.annualProgress).toBe(0);
    expect((await AnnualGoal.findById(goalB._id))?.annualProgress).toBe(80);
  });
});
