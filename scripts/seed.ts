import { connectDB } from "@/lib/mongodb";
import AnnualGoal from "@/models/AnnualGoal";
import WeeklyPlan from "@/models/WeeklyPlan";
import Task from "@/models/Task";
import User from "@/models/User";
import mongoose from "mongoose";

function parseUsernameArg(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--username="));
  return arg ? arg.slice("--username=".length) : null;
}

async function main() {
  await connectDB();

  const targetUsername = parseUsernameArg();
  let seedUserId: mongoose.Types.ObjectId | null = null;

  if (targetUsername) {
    const user = await User.findOne({ username: targetUsername });
    if (!user) {
      console.error(
        `--username=${targetUsername} 사용자를 찾을 수 없습니다. 먼저 GitHub로 한 번 로그인한 뒤 다시 시도하세요.`
      );
      process.exit(1);
    }
    seedUserId = user._id;
  }

  await Task.deleteMany({});
  await WeeklyPlan.deleteMany({});
  await AnnualGoal.deleteMany({});

  const goal = await AnnualGoal.create({ title: "건강한 몸 만들기", targetYear: 2026, userId: seedUserId });

  const plan1 = await WeeklyPlan.create({
    title: "1월 1주차 - 운동 루틴 정착",
    weekStartDate: new Date("2026-01-01"),
    weekEndDate: new Date("2026-01-07"),
    annualGoalId: goal._id,
    userId: seedUserId,
  });

  const plan2 = await WeeklyPlan.create({
    title: "1월 2주차 - 식단 관리",
    weekStartDate: new Date("2026-01-08"),
    weekEndDate: new Date("2026-01-14"),
    annualGoalId: goal._id,
    userId: seedUserId,
  });

  const unplanned = await WeeklyPlan.create({
    title: "미분류 잡무",
    weekStartDate: new Date("2026-01-01"),
    weekEndDate: new Date("2026-01-07"),
    userId: seedUserId,
  });

  await Task.create([
    { title: "헬스장 등록", date: new Date("2026-01-01"), status: "done", weeklyPlanId: plan1._id, order: 0, userId: seedUserId },
    { title: "월/수/금 러닝 30분", date: new Date("2026-01-02"), status: "done", weeklyPlanId: plan1._id, order: 1, userId: seedUserId },
    { title: "스트레칭 루틴 만들기", date: new Date("2026-01-03"), status: "doing", weeklyPlanId: plan1._id, order: 2, userId: seedUserId },
    { title: "주 3회 유산소 계획 짜기", date: new Date("2026-01-04"), status: "todo", weeklyPlanId: plan1._id, order: 3, userId: seedUserId },
    { title: "식단 앱 설치", date: new Date("2026-01-08"), status: "done", weeklyPlanId: plan2._id, order: 0, userId: seedUserId },
    { title: "일주일 식단표 작성", date: new Date("2026-01-09"), status: "todo", weeklyPlanId: plan2._id, order: 1, userId: seedUserId },
    { title: "이메일 정리", date: new Date(), status: "todo", weeklyPlanId: unplanned._id, order: 0, userId: seedUserId },
    { title: "오늘 할 일 (계획 미연결)", date: new Date(), status: "todo", weeklyPlanId: null, order: 0, userId: seedUserId },
  ]);

  async function recalcSeed() {
    const { recalcWeeklyProgress } = await import("@/lib/progress");
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await recalcWeeklyProgress(plan1._id.toString(), session);
        await recalcWeeklyProgress(plan2._id.toString(), session);
        await recalcWeeklyProgress(unplanned._id.toString(), session);
      });
    } finally {
      await session.endSession();
    }
  }
  await recalcSeed();

  console.log("시드 데이터 생성 완료:");
  console.log(`- AnnualGoal: ${goal.title}`);
  console.log(`- WeeklyPlan: ${plan1.title}, ${plan2.title}, ${unplanned.title}`);
  console.log("- Task: 8개");
  if (seedUserId) {
    console.log(`- Task는 계정 "${targetUsername}"에 연결되어 로그인 후 바로 보입니다.`);
  } else {
    console.log(
      '- --username=<github-login>이 주어지지 않아 Task가 어떤 계정에도 연결되지 않았습니다 (userId: null).' +
        ' GitHub로 한 번 로그인한 뒤 `npm run seed -- --username=<github-login>`으로 다시 실행하거나,' +
        ' `npm run migrate:add-user-id -- --assign-to=<github-login>`으로 기존 시드 데이터를 계정에 연결하세요.'
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
