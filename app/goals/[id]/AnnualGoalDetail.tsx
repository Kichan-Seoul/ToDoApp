"use client";

import { useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { ProgressBar } from "@/components/ProgressBar";
import { AnnualGoalForm } from "@/components/AnnualGoalForm";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
});

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
      <div className={sans.className}>
        <p className="text-sm text-[#63697a]">불러오는 중...</p>
      </div>
    );
  }

  if (error instanceof FetchError && error.status === 404) {
    return (
      <div className={sans.className}>
        <Link
          href="/goals"
          className="mb-6 inline-block text-sm font-semibold text-[#3730a9] hover:text-[#2d2790]"
        >
          ← 1년 목표 목록으로
        </Link>
        <div className="rounded-2xl border border-dashed border-[#e2e4ea] bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-[#63697a]">
            해당 1년 목표를 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className={sans.className}>
        <div
          role="alert"
          className="rounded-lg border border-[#c0293d]/40 bg-[#fbeaec] px-4 py-3 text-sm text-[#c0293d]"
        >
          1년 목표를 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={sans.className}>
      <Link
        href="/goals"
        className="mb-6 inline-block text-sm font-semibold text-[#3730a9] hover:text-[#2d2790]"
      >
        ← 1년 목표 목록으로
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3730a9]">
            Annual Horizon
          </p>
          <h1 className="text-2xl font-bold text-[#14161a] sm:text-3xl">
            {goal.title}
          </h1>
          <p className={`${mono.className} mt-1.5 text-sm text-[#63697a]`}>
            {goal.targetYear}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="rounded-lg border border-[#e2e4ea] px-4 py-2.5 text-sm font-semibold text-[#14161a] transition hover:bg-[#f3f4f6]"
        >
          수정
        </button>
      </div>

      <div className="mb-6 rounded-2xl border border-[#e2e4ea] bg-white p-5">
        <ProgressBar value={goal.annualProgress} label="연간 진행률" />
      </div>

      <div className="rounded-2xl border border-[#e2e4ea] bg-white p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#63697a]">
          연결된 주간 계획
        </p>
        {weeklyPlans && weeklyPlans.length > 0 ? (
          <ul className="space-y-3">
            {weeklyPlans.map((plan) => (
              <li key={plan._id}>
                <Link
                  href={`/weekly/${plan._id}`}
                  className="block rounded-xl border border-[#e2e4ea] px-4 py-3 transition hover:border-[#0f7a72]/40 hover:bg-[#f8faf9]"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-[#14161a]">
                      {plan.title}
                    </span>
                    <span className={`${mono.className} text-xs text-[#63697a]`}>
                      {formatDateRange(plan.weekStartDate, plan.weekEndDate)}
                    </span>
                  </div>
                  <ProgressBar value={plan.weeklyProgress} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#63697a]">연결된 주간 계획이 없습니다.</p>
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
