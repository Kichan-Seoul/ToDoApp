"use client";

import { useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ProgressBar } from "@/components/ProgressBar";
import { AnnualGoalForm } from "@/components/AnnualGoalForm";

type AnnualGoal = {
  _id: string;
  title: string;
  targetYear: number;
  annualProgress: number;
};

type WeeklyPlan = {
  _id: string;
  title: string;
  weekStartDate: string;
  weekEndDate: string;
  annualGoalId: string | null;
  weeklyProgress: number;
};

class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new FetchError("요청에 실패했습니다.", res.status);
  }
  return res.json();
}

function formatDateRange(start: string, end: string): string {
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function AnnualGoalDetail({ id }: { id: string }): JSX.Element {
  const [showForm, setShowForm] = useState(false);

  const {
    data: goal,
    error,
    isLoading,
    mutate,
  } = useSWR<AnnualGoal>(`/api/annual-goals/${id}`, fetcher);

  const { data: weeklyPlans } = useSWR<WeeklyPlan[]>(
    `/api/weekly-plans?annualGoalId=${id}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div>
        <p className="text-sm text-muted">불러오는 중...</p>
      </div>
    );
  }

  if (error instanceof FetchError && error.status === 404) {
    return (
      <div>
        <Link href="/goals" className="mb-6 inline-block text-sm font-semibold text-ink hover:text-primary">
          ← 1년 목표 목록으로
        </Link>
        <div className="rounded-card border border-dashed border-hairline px-6 py-14 text-center">
          <p className="text-sm text-muted">해당 1년 목표를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div>
        <div
          role="alert"
          className="rounded-lg border border-error/30 bg-error-soft px-4 py-3 text-sm text-error"
        >
          1년 목표를 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link href="/goals" className="mb-6 inline-block text-sm font-semibold text-ink hover:text-primary">
        ← 1년 목표 목록으로
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Annual Horizon</p>
          <h1 className="text-[28px] font-bold text-ink">{goal.title}</h1>
          <p className="mt-1.5 text-sm tabular-nums text-muted">{goal.targetYear}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg border border-ink px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft"
        >
          수정
        </button>
      </div>

      <div className="mb-6 rounded-card border border-hairline bg-canvas p-5">
        <ProgressBar value={goal.annualProgress} label="연간 진행률" />
      </div>

      <div className="rounded-card border border-hairline bg-canvas p-5">
        <p className="mb-3 text-sm font-medium text-muted">연결된 주간 계획</p>
        {weeklyPlans && weeklyPlans.length > 0 ? (
          <ul className="space-y-3">
            {weeklyPlans.map((plan) => (
              <li key={plan._id}>
                <Link
                  href={`/weekly/${plan._id}`}
                  className="block rounded-lg border border-hairline px-4 py-3 transition hover:border-border-strong hover:bg-surface-soft"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{plan.title}</span>
                    <span className="text-xs tabular-nums text-muted">
                      {formatDateRange(plan.weekStartDate, plan.weekEndDate)}
                    </span>
                  </div>
                  <ProgressBar value={plan.weeklyProgress} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">연결된 주간 계획이 없습니다.</p>
        )}
      </div>

      {showForm && (
        <AnnualGoalForm
          goal={goal}
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
