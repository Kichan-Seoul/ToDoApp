"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { JSX } from "react";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
});

export type WeeklyPlanFormProps = {
  plan?: {
    _id: string;
    title: string;
    weekStartDate: string;
    weekEndDate: string;
    annualGoalId: string | null;
  } | null;
  annualGoals: { _id: string; title: string }[];
  onSuccess: () => void;
  onCancel: () => void;
};

function toDateInputValue(value: string | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function WeeklyPlanForm({
  plan,
  annualGoals,
  onSuccess,
  onCancel,
}: WeeklyPlanFormProps): JSX.Element {
  const isEdit = Boolean(plan);

  const [title, setTitle] = useState(plan?.title ?? "");
  const [weekStartDate, setWeekStartDate] = useState(
    toDateInputValue(plan?.weekStartDate)
  );
  const [weekEndDate, setWeekEndDate] = useState(
    toDateInputValue(plan?.weekEndDate)
  );
  const [annualGoalId, setAnnualGoalId] = useState(plan?.annualGoalId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  async function extractError(res: Response, fallback: string) {
    const data = await res.json().catch(() => null);
    return (data?.error as string | undefined) ?? (data?.message as string | undefined) ?? fallback;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        isEdit ? `/api/weekly-plans/${plan!._id}` : "/api/weekly-plans",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            weekStartDate,
            weekEndDate,
            annualGoalId: annualGoalId || null,
          }),
        }
      );
      if (!res.ok) {
        setError(await extractError(res, "저장에 실패했습니다."));
        return;
      }
      onSuccess();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!plan) return;
    if (!window.confirm("이 주간 계획을 삭제할까요? 연결된 할 일도 영향을 받을 수 있습니다.")) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/weekly-plans/${plan._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError(await extractError(res, "삭제에 실패했습니다."));
        return;
      }
      onSuccess();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`${sans.className} fixed inset-0 z-50 flex items-center justify-center bg-[#0c0e12]/60 p-4 backdrop-blur-sm`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekly-plan-form-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e2e4ea] bg-white shadow-2xl"
      >
        <div className="h-1.5 w-full bg-[#0f7a72]" />
        <div className="p-6 sm:p-7">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f7a72]">
            Weekly Cadence
          </p>
          <h2
            id="weekly-plan-form-title"
            className="mb-6 text-xl font-bold text-[#14161a]"
          >
            {isEdit ? "주간 계획 수정" : "새 주간 계획"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="weekly-plan-title"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#63697a]"
              >
                제목
              </label>
              <input
                id="weekly-plan-title"
                type="text"
                required
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 이번 주 운동 계획"
                className="w-full rounded-lg border border-[#e2e4ea] bg-[#f3f4f6] px-3.5 py-2.5 text-sm text-[#14161a] outline-none transition focus:border-[#0f7a72] focus:ring-2 focus:ring-[#0f7a72]/25"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="weekly-plan-start"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#63697a]"
                >
                  주 시작일
                </label>
                <input
                  id="weekly-plan-start"
                  type="date"
                  required
                  value={weekStartDate}
                  onChange={(event) => setWeekStartDate(event.target.value)}
                  className={`${mono.className} w-full rounded-lg border border-[#e2e4ea] bg-[#f3f4f6] px-3 py-2.5 text-sm text-[#14161a] outline-none transition focus:border-[#0f7a72] focus:ring-2 focus:ring-[#0f7a72]/25`}
                />
              </div>
              <div>
                <label
                  htmlFor="weekly-plan-end"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#63697a]"
                >
                  주 종료일
                </label>
                <input
                  id="weekly-plan-end"
                  type="date"
                  required
                  value={weekEndDate}
                  onChange={(event) => setWeekEndDate(event.target.value)}
                  className={`${mono.className} w-full rounded-lg border border-[#e2e4ea] bg-[#f3f4f6] px-3 py-2.5 text-sm text-[#14161a] outline-none transition focus:border-[#0f7a72] focus:ring-2 focus:ring-[#0f7a72]/25`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="weekly-plan-goal"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#63697a]"
              >
                연결할 1년 목표
              </label>
              <select
                id="weekly-plan-goal"
                value={annualGoalId ?? ""}
                onChange={(event) => setAnnualGoalId(event.target.value)}
                className="w-full rounded-lg border border-[#e2e4ea] bg-[#f3f4f6] px-3.5 py-2.5 text-sm text-[#14161a] outline-none transition focus:border-[#0f7a72] focus:ring-2 focus:ring-[#0f7a72]/25"
              >
                <option value="">연결 안 함</option>
                {annualGoals.map((goal) => (
                  <option key={goal._id} value={goal._id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[#c0293d]/40 bg-[#fbeaec] px-3 py-2 text-sm text-[#c0293d]"
              >
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-1">
              {isEdit ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="text-sm font-semibold text-[#c0293d] transition hover:text-[#96001b] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  삭제
                </button>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={submitting}
                  className="rounded-lg border border-[#e2e4ea] px-4 py-2 text-sm font-semibold text-[#14161a] transition hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0f7a72] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0c6259] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting && (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  {submitting ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
