import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import { recalcWeeklyProgress } from "@/lib/progress";
import { getSession } from "@/lib/session";

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
  const { status } = await request.json();

  const dbSession = await mongoose.startSession();
  let task;

  try {
    await dbSession.withTransaction(async () => {
      const existing = await Task.findById(id).session(dbSession);

      if (
        !existing ||
        existing.userId == null ||
        existing.userId.toString() !== userSession.userId
      ) {
        throw new Error("NOT_FOUND");
      }

      const updated = await Task.findByIdAndUpdate(
        id,
        { status },
        { returnDocument: "after", session: dbSession }
      );

      if (!updated) {
        throw new Error("NOT_FOUND");
      }

      task = updated;

      if (task.weeklyPlanId) {
        await recalcWeeklyProgress(task.weeklyPlanId.toString(), dbSession);
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

  return Response.json(task);
}
