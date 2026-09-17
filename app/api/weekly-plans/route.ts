import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import WeeklyPlan from "@/models/WeeklyPlan";
import AnnualGoal from "@/models/AnnualGoal";
import { recalcAnnualProgress } from "@/lib/progress";
import { getSession } from "@/lib/session";
import { isOwner } from "@/lib/ownership";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const annualGoalId = searchParams.get("annualGoalId");

  const filter: Record<string, unknown> = { userId: session.userId };
  if (annualGoalId) filter.annualGoalId = annualGoalId;

  const plans = await WeeklyPlan.find(filter).sort({ createdAt: -1 });
  return Response.json(plans);
}

export async function POST(request: Request) {
  const userSession = await getSession();
  if (!userSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await request.json();
  const { title, weekStartDate, weekEndDate, annualGoalId = null } = body;

  if (!title || !weekStartDate || !weekEndDate) {
    return Response.json(
      { error: "title, weekStartDate and weekEndDate are required" },
      { status: 400 }
    );
  }

  if (annualGoalId) {
    if (!mongoose.isValidObjectId(annualGoalId)) {
      return Response.json({ error: "Invalid annualGoalId" }, { status: 400 });
    }
    const goal = await AnnualGoal.findById(annualGoalId);
    if (!goal || !isOwner(goal, userSession.userId)) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const dbSession = await mongoose.startSession();
  let plan;
  try {
    await dbSession.withTransaction(async () => {
      const created = await WeeklyPlan.create(
        [{ title, weekStartDate, weekEndDate, annualGoalId, userId: userSession.userId }],
        { session: dbSession }
      );
      plan = created[0];

      if (annualGoalId) {
        await recalcAnnualProgress(annualGoalId, dbSession);
      }
    });
  } finally {
    await dbSession.endSession();
  }

  return Response.json(plan, { status: 201 });
}
