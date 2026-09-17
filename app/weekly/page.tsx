"use client";

import { useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ProgressBar } from "@/components/ProgressBar";
import { WeeklyPlanForm } from "@/components/WeeklyPlanForm";

type WeeklyPlan = {
  _id: string;
  title: string;
  weekStartDate: string;
  weekEndDate: string;
  annualGoalId: string | null;
  weeklyProgress: number;
};

type AnnualGoalOption = { _id: string; title: string };

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("데이터를 불러오지 못했습니다.");
  }
  return res.json();
}

function formatDateRange(start: string, end: string): string {
  const fmt = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function WeeklyPlansPage(): JSX.Element {
  const [showForm, setShowForm] = useState(false);

  const {
    data: plans,
    error,
    isLoading,
    mutate,
  } = useSWR<WeeklyPlan[]>("/api/weekly-plans", fetcher);

  const { data: annualGoals } = useSWR<AnnualGoalOption[]>(
    "/api/annual-goals",
    fetcher
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Weekly Cadence</p>
          <h1 className="text-[28px] font-bold text-ink">주간 계획</h1>
          <p className="mt-1.5 text-sm text-muted">
            한 주의 리듬을 계획하고 진행률을 추적하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex h-12 items-center gap-1.5 rounded-lg bg-primary px-6 text-base font-medium text-on-primary transition hover:bg-primary-active"
        >
          <span className="text-base leading-none">+</span> 새 주간 계획
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted">불러오는 중...</p>}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error/30 bg-error-soft px-4 py-3 text-sm text-error"
        >
          주간 계획을 불러오지 못했습니다.
        </div>
      )}

      {plans && plans.length === 0 && (
        <div className="rounded-card border border-dashed border-hairline px-6 py-14 text-center">
          <p className="text-sm text-muted">
            아직 주간 계획이 없습니다. 첫 계획을 만들어보세요.
          </p>
        </div>
      )}

      {plans && plans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Link
              key={plan._id}
              href={`/weekly/${plan._id}`}
              className="group flex flex-col justify-between rounded-card border border-hairline bg-canvas p-5 transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-elevated"
            >
              <div>
                <p className="mb-2 text-xs tabular-nums text-muted">
                  {formatDateRange(plan.weekStartDate, plan.weekEndDate)}
                </p>
                <h2 className="mb-4 text-base font-semibold text-ink group-hover:text-primary">
                  {plan.title}
                </h2>
              </div>
              <ProgressBar value={plan.weeklyProgress} label="주간 진행률" />
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <WeeklyPlanForm
          plan={null}
          annualGoals={annualGoals ?? []}
          onSuccess={() => {
            setShowForm(false);
            mutate();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
