import { connectDB } from "@/lib/mongodb";
import AnnualGoal from "@/models/AnnualGoal";
import WeeklyPlan from "@/models/WeeklyPlan";
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
  const goal = await AnnualGoal.findById(id);

  if (!goal || !isOwner(goal, session.userId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(goal);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;
  const existing = await AnnualGoal.findById(id);

  if (!existing || !isOwner(existing, session.userId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const update: { title?: string; targetYear?: number } = {};

  if (body.title !== undefined) update.title = body.title;
  if (body.targetYear !== undefined) update.targetYear = body.targetYear;

  const goal = await AnnualGoal.findByIdAndUpdate(id, update, { returnDocument: "after" });

  if (!goal) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(goal);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { id } = await params;
  const existing = await AnnualGoal.findById(id);

  if (!existing || !isOwner(existing, session.userId)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const goal = await AnnualGoal.findByIdAndDelete(id);

  if (!goal) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await WeeklyPlan.updateMany({ annualGoalId: id }, { annualGoalId: null });

  return Response.json({ success: true });
}
