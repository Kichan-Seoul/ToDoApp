import { AnnualGoalDetail } from "./AnnualGoalDetail";

export default async function AnnualGoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AnnualGoalDetail id={id} />;
}
