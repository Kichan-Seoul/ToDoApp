import { WeeklyPlanDetail } from "./WeeklyPlanDetail";

export default async function WeeklyPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WeeklyPlanDetail id={id} />;
}
