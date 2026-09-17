import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Task, { type TaskStatus } from "@/models/Task";
import WeeklyPlan from "@/models/WeeklyPlan";
import { recalcWeeklyProgress } from "@/lib/progress";
import { getSession } from "@/lib/session";
import { isOwner } from "@/lib/ownership";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;
  const task = await Task.findById(id);

  if (!task || !isOwner(task, session.userId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(task);
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

  const dbSession = await mongoose.startSession();
  let task;

  try {
    await dbSession.withTransaction(async () => {
      const existing = await Task.findById(id).session(dbSession);

      if (!existing || !isOwner(existing, userSession.userId)) {
        throw new Error("NOT_FOUND");
      }

      const update: Partial<{
        title: string;
        date: Date;
        status: TaskStatus;
        order: number;
        weeklyPlanId: string | null;
      }> = {};

      if (body.title !== undefined) update.title = body.title;
      if (body.date !== undefined) update.date = body.date;
      if (body.status !== undefined) update.status = body.status;
      if (body.order !== undefined) update.order = body.order;
      if (body.weeklyPlanId !== undefined) update.weeklyPlanId = body.weeklyPlanId;

      const oldWeeklyPlanId = existing.weeklyPlanId
        ? existing.weeklyPlanId.toString()
        : null;
      const weeklyPlanIdChanged =
        "weeklyPlanId" in body && (body.weeklyPlanId ?? null) !== oldWeeklyPlanId;

      if (weeklyPlanIdChanged && body.weeklyPlanId) {
        if (!mongoose.isValidObjectId(body.weeklyPlanId)) {
          throw new Error("INVALID_ID");
        }
        const plan = await WeeklyPlan.findById(body.weeklyPlanId).session(dbSession);
        if (!plan || !isOwner(plan, userSession.userId)) {
          throw new Error("NOT_FOUND");
        }
      }

      task = await Task.findByIdAndUpdate(id, update, { returnDocument: "after", session: dbSession });

      if (weeklyPlanIdChanged) {
        const newWeeklyPlanId = body.weeklyPlanId ?? null;
        if (oldWeeklyPlanId) {
          await recalcWeeklyProgress(oldWeeklyPlanId, dbSession);
        }
        if (newWeeklyPlanId) {
          await recalcWeeklyProgress(newWeeklyPlanId, dbSession);
        }
      } else if (body.status !== undefined && task?.weeklyPlanId) {
        await recalcWeeklyProgress(task.weeklyPlanId.toString(), dbSession);
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (err instanceof Error && err.message === "INVALID_ID") {
      return Response.json({ error: "Invalid weeklyPlanId" }, { status: 400 });
    }
    throw err;
  } finally {
    await dbSession.endSession();
  }

  return Response.json(task);
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

  const dbSession = await mongoose.startSession();

  try {
    await dbSession.withTransaction(async () => {
      const existing = await Task.findById(id).session(dbSession);

      if (!existing || !isOwner(existing, userSession.userId)) {
        throw new Error("NOT_FOUND");
      }

      const weeklyPlanId = existing.weeklyPlanId
        ? existing.weeklyPlanId.toString()
        : null;

      await Task.findByIdAndDelete(id, { session: dbSession });

      if (weeklyPlanId) {
        await recalcWeeklyProgress(weeklyPlanId, dbSession);
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  } finally {
    await dbSession.endSession();
  }

  return Response.json({ success: true });
}
