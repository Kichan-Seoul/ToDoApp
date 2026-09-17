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

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("데이터를 불러오지 못했습니다.");
  }
  return res.json();
}

export default function AnnualGoalsPage(): JSX.Element {
  const [showForm, setShowForm] = useState(false);

  const {
    data: goals,
    error,
    isLoading,
    mutate,
  } = useSWR<AnnualGoal[]>("/api/annual-goals", fetcher);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Annual Horizon</p>
          <h1 className="text-[28px] font-bold text-ink">1년 목표</h1>
          <p className="mt-1.5 text-sm text-muted">
            올해의 방향을 정하고 진행률을 한눈에 확인하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex h-12 items-center gap-1.5 rounded-lg bg-primary px-6 text-base font-medium text-on-primary transition hover:bg-primary-active"
        >
          <span className="text-base leading-none">+</span> 새 1년 목표
        </button>
      </div>

      {isLoading && <p className="text-sm text-muted">불러오는 중...</p>}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error/30 bg-error-soft px-4 py-3 text-sm text-error"
        >
          1년 목표를 불러오지 못했습니다.
        </div>
      )}

      {goals && goals.length === 0 && (
        <div className="rounded-card border border-dashed border-hairline px-6 py-14 text-center">
          <p className="text-sm text-muted">
            아직 1년 목표가 없습니다. 첫 목표를 만들어보세요.
          </p>
        </div>
      )}

      {goals && goals.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <Link
              key={goal._id}
              href={`/goals/${goal._id}`}
              className="group flex flex-col justify-between rounded-card border border-hairline bg-canvas p-5 transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-elevated"
            >
              <div>
                <p className="mb-2 text-xs tabular-nums text-muted">{goal.targetYear}</p>
                <h2 className="mb-4 text-base font-semibold text-ink group-hover:text-primary">
                  {goal.title}
                </h2>
              </div>
              <ProgressBar value={goal.annualProgress} label="연간 진행률" />
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <AnnualGoalForm
          goal={null}
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
