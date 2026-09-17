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

type TaskStatus = "todo" | "doing" | "done";

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "할 일",
  doing: "진행 중",
  done: "완료",
};

export type TaskFormProps = {
  task?: {
    _id: string;
    title: string;
    date: string;
    status: TaskStatus;
    weeklyPlanId: string | null;
  } | null;
  weeklyPlans: { _id: string; title: string }[];
  onSuccess: () => void;
  onCancel: () => void;
};

function toDateInputValue(value: string | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function TaskForm({
  task,
  weeklyPlans,
  onSuccess,
  onCancel,
}: TaskFormProps): JSX.Element {
  const isEdit = Boolean(task);

  const [title, setTitle] = useState(task?.title ?? "");
  const [date, setDate] = useState(toDateInputValue(task?.date));
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [weeklyPlanId, setWeeklyPlanId] = useState(task?.weeklyPlanId ?? "");
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
      const body: Record<string, unknown> = {
        title,
        date,
        weeklyPlanId: weeklyPlanId || null,
      };
      if (isEdit) body.status = status;

      const res = await fetch(
        isEdit ? `/api/tasks/${task!._id}` : "/api/tasks",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
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
    if (!task) return;
    if (!window.confirm("이 할 일을 삭제할까요?")) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, { method: "DELETE" });
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
        aria-labelledby="task-form-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e2e4ea] bg-white shadow-2xl"
      >
        <div className="h-1.5 w-full bg-[#b45309]" />
        <div className="p-6 sm:p-7">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b45309]">
            Today&apos;s Action
          </p>
          <h2 id="task-form-title" className="mb-6 text-xl font-bold text-[#14161a]">
            {isEdit ? "할 일 수정" : "새 할 일"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="task-title"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#63697a]"
              >
                제목
              </label>
              <input
                id="task-title"
                type="text"
                required
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 보고서 초안 작성"
                className="w-full rounded-lg border border-[#e2e4ea] bg-[#f3f4f6] px-3.5 py-2.5 text-sm text-[#14161a] outline-none transition focus:border-[#b45309] focus:ring-2 focus:ring-[#b45309]/25"
              />
            </div>

            <div>
              <label
                htmlFor="task-date"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#63697a]"
              >
                날짜
              </label>
              <input
                id="task-date"
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={`${mono.className} w-full rounded-lg border border-[#e2e4ea] bg-[#f3f4f6] px-3 py-2.5 text-sm text-[#14161a] outline-none transition focus:border-[#b45309] focus:ring-2 focus:ring-[#b45309]/25`}
              />
            </div>

            {isEdit && (
              <div>
                <label
                  htmlFor="task-status"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#63697a]"
                >
                  상태
                </label>
                <select
                  id="task-status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as TaskStatus)}
                  className="w-full rounded-lg border border-[#e2e4ea] bg-[#f3f4f6] px-3.5 py-2.5 text-sm text-[#14161a] outline-none transition focus:border-[#b45309] focus:ring-2 focus:ring-[#b45309]/25"
                >
                  {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABEL[value]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="task-weekly-plan"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#63697a]"
              >
                연결할 주간 계획
              </label>
              <select
                id="task-weekly-plan"
                value={weeklyPlanId ?? ""}
                onChange={(event) => setWeeklyPlanId(event.target.value)}
                className="w-full rounded-lg border border-[#e2e4ea] bg-[#f3f4f6] px-3.5 py-2.5 text-sm text-[#14161a] outline-none transition focus:border-[#b45309] focus:ring-2 focus:ring-[#b45309]/25"
              >
                <option value="">연결 안 함</option>
                {weeklyPlans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.title}
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
                  className="inline-flex items-center gap-2 rounded-lg bg-[#b45309] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#93440a] disabled:cursor-not-allowed disabled:opacity-60"
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
