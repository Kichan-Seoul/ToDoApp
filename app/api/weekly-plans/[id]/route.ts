import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import WeeklyPlan from "@/models/WeeklyPlan";
import AnnualGoal from "@/models/AnnualGoal";
import Task from "@/models/Task";
import { recalcAnnualProgress } from "@/lib/progress";
import { getSession } from "@/lib/session";
import { isOwner } from "@/lib/ownership";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSession();
  if (!userSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;
  const plan = await WeeklyPlan.findById(id);

  if (!plan || !isOwner(plan, userSession.userId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(plan);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSession();
  if (!userSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;
  const body = await request.json();
  const update: {
    title?: string;
    weekStartDate?: string;
    weekEndDate?: string;
    annualGoalId?: string | null;
  } = {};

  if (body.title !== undefined) update.title = body.title;
  if (body.weekStartDate !== undefined) update.weekStartDate = body.weekStartDate;
  if (body.weekEndDate !== undefined) update.weekEndDate = body.weekEndDate;
  if (body.annualGoalId !== undefined) update.annualGoalId = body.annualGoalId;

  const existingPlan = await WeeklyPlan.findById(id);
  if (!existingPlan || !isOwner(existingPlan, userSession.userId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (update.annualGoalId) {
    if (!mongoose.isValidObjectId(update.annualGoalId)) {
      return Response.json({ error: "Invalid annualGoalId" }, { status: 400 });
    }
    const goal = await AnnualGoal.findById(update.annualGoalId);
    if (!goal || !isOwner(goal, userSession.userId)) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const session = await mongoose.startSession();
  let plan;
  try {
    await session.withTransaction(async () => {
      const isReparenting = "annualGoalId" in update;
      let previousAnnualGoalId: mongoose.Types.ObjectId | null = null;

      if (isReparenting) {
        const existing = await WeeklyPlan.findById(id).session(session);
        previousAnnualGoalId = existing?.annualGoalId ?? null;
      }

      plan = await WeeklyPlan.findByIdAndUpdate(id, update, { returnDocument: "after", session });

      if (isReparenting && plan) {
        const newAnnualGoalId = update.annualGoalId ?? null;
        const previousStr = previousAnnualGoalId ? previousAnnualGoalId.toString() : null;
        const newStr = newAnnualGoalId ? newAnnualGoalId.toString() : null;

        if (previousStr !== newStr) {
          if (previousStr) {
            await recalcAnnualProgress(previousStr, session);
          }
          if (newStr) {
            await recalcAnnualProgress(newStr, session);
          }
        }
      }
    });
  } finally {
    await session.endSession();
  }

  if (!plan) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(plan);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userSession = await getSession();
  if (!userSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;

  const ownershipCheck = await WeeklyPlan.findById(id);
  if (!ownershipCheck || !isOwner(ownershipCheck, userSession.userId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const session = await mongoose.startSession();
  let plan;
  try {
    await session.withTransaction(async () => {
      plan = await WeeklyPlan.findById(id).session(session);

      if (!plan) return;

      const annualGoalId = plan.annualGoalId ? plan.annualGoalId.toString() : null;

      await Task.updateMany(
        { weeklyPlanId: id },
        { weeklyPlanId: null },
        { session }
      );

      await WeeklyPlan.findByIdAndDelete(id, { session });

      if (annualGoalId) {
        await recalcAnnualProgress(annualGoalId, session);
      }
    });
  } finally {
    await session.endSession();
  }

  if (!plan) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
