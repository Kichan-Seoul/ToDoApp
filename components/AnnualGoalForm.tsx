"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { JSX } from "react";

export type AnnualGoalFormProps = {
  goal?: { _id: string; title: string; targetYear: number } | null;
  onSuccess: () => void;
  onCancel: () => void;
};

export function AnnualGoalForm({
  goal,
  onSuccess,
  onCancel,
}: AnnualGoalFormProps): JSX.Element {
  const isEdit = Boolean(goal);

  const [title, setTitle] = useState(goal?.title ?? "");
  const [targetYear, setTargetYear] = useState(
    goal?.targetYear ?? new Date().getFullYear()
  );
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
        isEdit ? `/api/annual-goals/${goal!._id}` : "/api/annual-goals",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, targetYear: Number(targetYear) }),
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
    if (!goal) return;
    if (!window.confirm("이 연간 목표를 삭제할까요? 연결된 주간 계획도 영향을 받을 수 있습니다.")) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/annual-goals/${goal._id}`, {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="annual-goal-form-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-card border border-hairline bg-canvas shadow-elevated"
      >
        <div className="p-6 sm:p-7">
          <p className="mb-1 text-sm font-medium text-muted">Annual Horizon</p>
          <h2 id="annual-goal-form-title" className="mb-6 text-xl font-semibold text-ink">
            {isEdit ? "연간 목표 수정" : "새 연간 목표"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="annual-goal-title"
                className="mb-1.5 block text-sm font-medium text-muted"
              >
                제목
              </label>
              <input
                id="annual-goal-title"
                type="text"
                required
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 건강한 습관 만들기"
                className="h-14 w-full rounded-lg border border-hairline bg-canvas px-3.5 text-base text-ink outline-none transition focus:border-2 focus:border-ink"
              />
            </div>

            <div>
              <label
                htmlFor="annual-goal-year"
                className="mb-1.5 block text-sm font-medium text-muted"
              >
                대상 연도
              </label>
              <input
                id="annual-goal-year"
                type="number"
                required
                min={1970}
                max={2100}
                step={1}
                value={targetYear}
                onChange={(event) => setTargetYear(Number(event.target.value))}
                className="h-14 w-full rounded-lg border border-hairline bg-canvas px-3.5 text-base tabular-nums text-ink outline-none transition focus:border-2 focus:border-ink"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-error/30 bg-error-soft px-3 py-2 text-sm text-error"
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
                  className="text-sm font-semibold text-error transition hover:text-error-hover disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="rounded-lg border border-ink px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary transition hover:bg-primary-active disabled:cursor-not-allowed disabled:bg-primary-disabled"
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
