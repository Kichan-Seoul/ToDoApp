import { connectDB } from "@/lib/mongodb";
import AnnualGoal from "@/models/AnnualGoal";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const goals = await AnnualGoal.find({ userId: session.userId }).sort({ createdAt: -1 });
  return Response.json(goals);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await request.json();
  const { title, targetYear } = body;

  if (!title || !targetYear) {
    return Response.json(
      { error: "title and targetYear are required" },
      { status: 400 }
    );
  }

  const goal = await AnnualGoal.create({ title, targetYear, userId: session.userId });
  return Response.json(goal, { status: 201 });
}
