import type { ClientSession } from "mongoose";
import Task from "@/models/Task";
import WeeklyPlan from "@/models/WeeklyPlan";
import AnnualGoal from "@/models/AnnualGoal";

export async function recalcWeeklyProgress(weeklyPlanId: string, session: ClientSession) {
  const tasks = await Task.find({ weeklyPlanId }).session(session);
  const progress =
    tasks.length === 0
      ? 0
      : (tasks.filter((t) => t.status === "done").length / tasks.length) * 100;

  const plan = await WeeklyPlan.findByIdAndUpdate(
    weeklyPlanId,
    { weeklyProgress: progress },
    { returnDocument: "after", session }
  );

  if (plan?.annualGoalId) {
    await recalcAnnualProgress(plan.annualGoalId.toString(), session);
  }
}

export async function recalcAnnualProgress(annualGoalId: string, session: ClientSession) {
  const plans = await WeeklyPlan.find({ annualGoalId }).session(session);
  const progress =
    plans.length === 0
      ? 0
      : plans.reduce((sum, p) => sum + p.weeklyProgress, 0) / plans.length;

  await AnnualGoal.findByIdAndUpdate(annualGoalId, { annualProgress: progress }, { session });
}
