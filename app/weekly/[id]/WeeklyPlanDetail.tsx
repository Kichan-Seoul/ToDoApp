"use client";

import { useState } from "react";
import type { JSX } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import { ProgressBar } from "@/components/ProgressBar";
import { WeeklyPlanForm } from "@/components/WeeklyPlanForm";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
});

type WeeklyPlan = {
  _id: string;
  title: string;
  weekStartDate: string;
  weekEndDate: string;
  annualGoalId: string | null;
  weeklyProgress: number;
};

type AnnualGoal = { _id: string; title: string; targetYear: number };

type Task = {
  _id: string;
  title: string;
  date: string;
  status: "todo" | "doing" | "done";
  weeklyPlanId: string | null;
};

type AnnualGoalOption = { _id: string; title: string };

const STATUS_LABEL: Record<Task["status"], string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};

const STATUS_STYLE: Record<Task["status"], string> = {
  todo: "bg-[#f3f4f6] text-[#63697a]",
  doing: "bg-[#fdf1e2] text-[#b45309]",
  done: "bg-[#e8f5f2] text-[#0f7a72]",
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

export function WeeklyPlanDetail({ id }: { id: string }): JSX.Element {
  const [showForm, setShowForm] = useState(false);

  const {
    data: plan,
    error,
    isLoading,
    mutate,
  } = useSWR<WeeklyPlan>(`/api/weekly-plans/${id}`, fetcher);

  const { data: tasks } = useSWR<Task[]>(
    `/api/tasks?weeklyPlanId=${id}`,
    fetcher
  );

  const { data: annualGoal } = useSWR<AnnualGoal>(
    plan?.annualGoalId ? `/api/annual-goals/${plan.annualGoalId}` : null,
    fetcher
  );

  const { data: annualGoals } = useSWR<AnnualGoalOption[]>(
    "/api/annual-goals",
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
          href="/weekly"
          className="mb-6 inline-block text-sm font-semibold text-[#0f7a72] hover:text-[#0c6259]"
        >
          ← 주간 계획 목록으로
        </Link>
        <div className="rounded-2xl border border-dashed border-[#e2e4ea] bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-[#63697a]">
            해당 주간 계획을 찾을 수 없습니다.
          </p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className={sans.className}>
        <div
          role="alert"
          className="rounded-lg border border-[#c0293d]/40 bg-[#fbeaec] px-4 py-3 text-sm text-[#c0293d]"
        >
          주간 계획을 불러오지 못했습니다.
        </div>
      </div>
    );
  }

  const total = tasks?.length ?? 0;
  const done = tasks?.filter((task) => task.status === "done").length ?? 0;
  const remaining = total - done;

  return (
    <div className={sans.className}>
      <Link
        href="/weekly"
        className="mb-6 inline-block text-sm font-semibold text-[#0f7a72] hover:text-[#0c6259]"
      >
        ← 주간 계획 목록으로
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f7a72]">
            Weekly Cadence
          </p>
          <h1 className="text-2xl font-bold text-[#14161a] sm:text-3xl">
            {plan.title}
          </h1>
          <p className={`${mono.className} mt-1.5 text-sm text-[#63697a]`}>
            {formatDateRange(plan.weekStartDate, plan.weekEndDate)}
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

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[#e2e4ea] bg-white px-4 py-3 text-center">
          <p className={`${mono.className} text-xl font-bold text-[#14161a]`}>
            {total}
          </p>
          <p className="mt-0.5 text-xs text-[#63697a]">전체</p>
        </div>
        <div className="rounded-xl border border-[#e2e4ea] bg-white px-4 py-3 text-center">
          <p className={`${mono.className} text-xl font-bold text-[#0f7a72]`}>
            {done}
          </p>
          <p className="mt-0.5 text-xs text-[#63697a]">완료</p>
        </div>
        <div className="rounded-xl border border-[#e2e4ea] bg-white px-4 py-3 text-center">
          <p className={`${mono.className} text-xl font-bold text-[#b45309]`}>
            {remaining}
          </p>
          <p className="mt-0.5 text-xs text-[#63697a]">미완료</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#e2e4ea] bg-white p-5">
        <ProgressBar value={plan.weeklyProgress} label="주간 진행률" />
      </div>

      <div className="mb-6 rounded-2xl border border-[#e2e4ea] bg-white p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#63697a]">
          연결된 1년 목표
        </p>
        {plan.annualGoalId && annualGoal ? (
          <Link
            href={`/goals/${plan.annualGoalId}`}
            className="text-sm font-semibold text-[#3730a9] hover:text-[#2d2790]"
          >
            {annualGoal.title} →
          </Link>
        ) : (
          <p className="text-sm text-[#63697a]">연결된 1년 목표 없음</p>
        )}
      </div>

      <div className="rounded-2xl border border-[#e2e4ea] bg-white p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#63697a]">
          할 일
        </p>
        {tasks && tasks.length > 0 ? (
          <ul className="divide-y divide-[#e2e4ea]">
            {tasks.map((task) => (
              <li
                key={task._id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <span className="text-[#14161a]">{task.title}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[task.status]}`}
                >
                  {STATUS_LABEL[task.status]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[#63697a]">연결된 할 일이 없습니다.</p>
        )}
      </div>

      {showForm && (
        <WeeklyPlanForm
          plan={plan}
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
