import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Task from "@/models/Task";
import WeeklyPlan from "@/models/WeeklyPlan";
import { recalcWeeklyProgress } from "@/lib/progress";
import { getSession } from "@/lib/session";
import { isOwner } from "@/lib/ownership";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");
  const weeklyPlanId = searchParams.get("weeklyPlanId");
  const sort = searchParams.get("sort") ?? "createdAt";

  const filter: Record<string, unknown> = { userId: session.userId };

  if (date) {
    const start = new Date(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.date = { $gte: start, $lt: end };
  }

  if (status) filter.status = status;
  if (weeklyPlanId) filter.weeklyPlanId = weeklyPlanId;

  let sortSpec: Record<string, 1 | -1>;
  if (sort === "date") {
    sortSpec = { date: 1, order: 1, createdAt: -1 };
  } else if (sort === "status") {
    sortSpec = { status: 1, order: 1, createdAt: -1 };
  } else {
    sortSpec = { order: 1, createdAt: -1 };
  }

  const tasks = await Task.find(filter).sort(sortSpec);
  return Response.json(tasks);
}

export async function POST(request: Request) {
  const userSession = await getSession();
  if (!userSession) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await request.json();
  const { title, date, status, weeklyPlanId } = body;

  if (!title || !date) {
    return Response.json(
      { error: "title and date are required" },
      { status: 400 }
    );
  }

  if (weeklyPlanId) {
    if (!mongoose.isValidObjectId(weeklyPlanId)) {
      return Response.json({ error: "Invalid weeklyPlanId" }, { status: 400 });
    }
    const plan = await WeeklyPlan.findById(weeklyPlanId);
    if (!plan || !isOwner(plan, userSession.userId)) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
  }

  const dbSession = await mongoose.startSession();
  let task;

  try {
    await dbSession.withTransaction(async () => {
      const created = await Task.create(
        [
          {
            title,
            date,
            status: status ?? "todo",
            weeklyPlanId: weeklyPlanId ?? null,
            userId: userSession.userId,
          },
        ],
        { session: dbSession }
      );
      task = created[0];

      if (weeklyPlanId) {
        await recalcWeeklyProgress(weeklyPlanId, dbSession);
      }
    });
  } finally {
    await dbSession.endSession();
  }

  return Response.json(task, { status: 201 });
}
