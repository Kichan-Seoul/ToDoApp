import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import WeeklyPlan from "@/models/WeeklyPlan";
import AnnualGoal from "@/models/AnnualGoal";
import User from "@/models/User";
import mongoose from "mongoose";

function parseAssignToArg(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--assign-to="));
  return arg ? arg.slice("--assign-to=".length) : null;
}

const COLLECTIONS = [
  { name: "AnnualGoal", model: AnnualGoal },
  { name: "WeeklyPlan", model: WeeklyPlan },
  { name: "Task", model: Task },
] as const;

async function main() {
  await connectDB();

  for (const { name, model } of COLLECTIONS) {
    const missingCount = await model.countDocuments({ userId: { $exists: false } });
    console.log(`userId 필드가 없는 ${name}: ${missingCount}건`);

    const backfillResult = await model.updateMany(
      { userId: { $exists: false } },
      { $set: { userId: null } }
    );
    console.log(`${name} 마이그레이션 완료: ${backfillResult.modifiedCount}건에 userId: null을 backfill함`);
  }

  const assignToUsername = parseAssignToArg();
  if (assignToUsername) {
    const user = await User.findOne({ username: assignToUsername });
    if (!user) {
      console.error(
        `--assign-to=${assignToUsername} 사용자를 찾을 수 없습니다. 먼저 GitHub로 한 번 로그인한 뒤 다시 시도하세요.`
      );
      process.exit(1);
    }

    // AnnualGoal -> WeeklyPlan -> Task 순서로 계층 전체를 함께 연결해야
    // "Task의 소속 WeeklyPlan은 같은 사용자 소유"라는 불변식이 깨지지 않는다.
    for (const { name, model } of COLLECTIONS) {
      const claimResult = await model.updateMany(
        { userId: null },
        { $set: { userId: user._id } }
      );
      console.log(
        `userId: null인 ${name} ${claimResult.modifiedCount}건을 계정 "${assignToUsername}"에 연결함`
      );
    }
  } else {
    console.log(
      "참고: userId가 null인 문서는 어떤 계정에도 연결되지 않은 레거시 데이터이며, 로그인 후 API에서는 조회되지 않습니다." +
        " `npm run migrate:add-user-id -- --assign-to=<github-login>`으로 AnnualGoal/WeeklyPlan/Task 전체를 한 계정에 연결할 수 있습니다."
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
