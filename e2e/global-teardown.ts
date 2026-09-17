import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Task from "@/models/Task";
import WeeklyPlan from "@/models/WeeklyPlan";
import AnnualGoal from "@/models/AnnualGoal";
import mongoose from "mongoose";
import { E2E_GITHUB_ID } from "./global-setup";

export default async function globalTeardown() {
  await connectDB();

  const user = await User.findOne({ githubId: E2E_GITHUB_ID });
  if (user) {
    await Task.deleteMany({ userId: user._id });
    await WeeklyPlan.deleteMany({ userId: user._id });
    await AnnualGoal.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }

  await mongoose.disconnect();
}
