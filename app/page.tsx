"use client";

import { useMemo, useState, type JSX } from "react";
import useSWR from "swr";
import { TaskForm } from "@/components/TaskForm";
import { TaskBoard, type BoardTask, type TaskStatus } from "@/components/TaskBoard";

type WeeklyPlanSummary = {
  _id: string;
  title: string;
  annualGoalId: string | null;
};

type AnnualGoalSummary = {
  _id: string;
  title: string;
};

type StatusFilter = "all" | TaskStatus;
type SortOption = "createdAt" | "date" | "status";

const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "todo", label: "할 일" },
  { value: "doing", label: "진행 중" },
  { value: "done", label: "완료" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "createdAt", label: "생성순" },
  { value: "date", label: "날짜순" },
  { value: "status", label: "상태순" },
];

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("요청에 실패했습니다.");
    return res.json();
  });

export default function Home(): JSX.Element {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [weeklyPlanFilter, setWeeklyPlanFilter] = useState<string>("all");
  const [annualGoalFilter, setAnnualGoalFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("createdAt");
  const [modalTask, setModalTask] = useState<BoardTask | null | undefined>(undefined);

  const tasksKey = useMemo(() => {
    const params = new URLSearchParams({ sort });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (weeklyPlanFilter !== "all") params.set("weeklyPlanId", weeklyPlanFilter);
    return `/api/tasks?${params.toString()}`;
  }, [statusFilter, weeklyPlanFilter, sort]);

  const {
    data: tasks,
    error: tasksError,
    isLoading: tasksLoading,
    mutate: mutateTasks,
  } = useSWR<BoardTask[]>(tasksKey, fetcher);

  const { data: weeklyPlans } = useSWR<WeeklyPlanSummary[]>(
    "/api/weekly-plans",
    fetcher
  );

  const { data: annualGoals } = useSWR<AnnualGoalSummary[]>(
    "/api/annual-goals",
    fetcher
  );

  const visibleTasks = useMemo(() => {
    if (!tasks) return tasks;
    if (annualGoalFilter === "all" || !weeklyPlans) return tasks;

    const allowedWeeklyPlanIds = new Set(
      weeklyPlans
        .filter((plan) => plan.annualGoalId === annualGoalFilter)
        .map((plan) => plan._id)
    );

    return tasks.filter(
      (task) => task.weeklyPlanId != null && allowedWeeklyPlanIds.has(task.weeklyPlanId)
    );
  }, [tasks, weeklyPlans, annualGoalFilter]);

  const modalOpen = modalTask !== undefined;

  function closeModal() {
    setModalTask(undefined);
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        window.alert("상태 변경에 실패했습니다.");
        return;
      }
      mutateTasks();
    } catch {
      window.alert("네트워크 오류로 상태를 변경하지 못했습니다.");
    }
  }

  async function handleReorder(updates: { taskId: string; order: number }[]) {
    try {
      const results = await Promise.all(
        updates.map((update) =>
          fetch(`/api/tasks/${update.taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: update.order }),
          })
        )
      );
      if (results.some((res) => !res.ok)) {
        window.alert("순서 변경에 실패했습니다.");
      }
      mutateTasks();
    } catch {
      window.alert("네트워크 오류로 순서를 변경하지 못했습니다.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 rounded-card border border-hairline bg-canvas p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-muted">Today&apos;s Board</p>
          <h1 className="text-[28px] font-bold leading-tight text-ink">오늘의 할 일</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setModalTask(null)}
            className="inline-flex h-12 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-6 text-base font-medium text-on-primary transition hover:bg-primary-active"
          >
            <span aria-hidden>+</span>
            새 할 일
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-card border border-hairline bg-canvas p-5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-status" className="text-sm font-medium text-muted">
            상태
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="h-12 rounded-lg border border-hairline bg-canvas px-3.5 text-sm text-ink outline-none transition focus:border-2 focus:border-ink"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-weekly-plan" className="text-sm font-medium text-muted">
            주간 계획
          </label>
          <select
            id="filter-weekly-plan"
            value={weeklyPlanFilter}
            onChange={(event) => setWeeklyPlanFilter(event.target.value)}
            className="h-12 rounded-lg border border-hairline bg-canvas px-3.5 text-sm text-ink outline-none transition focus:border-2 focus:border-ink"
          >
            <option value="all">전체</option>
            {(weeklyPlans ?? []).map((plan) => (
              <option key={plan._id} value={plan._id}>
                {plan.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-annual-goal" className="text-sm font-medium text-muted">
            1년 목표
          </label>
          <select
            id="filter-annual-goal"
            value={annualGoalFilter}
            onChange={(event) => setAnnualGoalFilter(event.target.value)}
            className="h-12 rounded-lg border border-hairline bg-canvas px-3.5 text-sm text-ink outline-none transition focus:border-2 focus:border-ink"
          >
            <option value="all">전체</option>
            {(annualGoals ?? []).map((goal) => (
              <option key={goal._id} value={goal._id}>
                {goal.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:ml-auto">
          <label htmlFor="filter-sort" className="text-sm font-medium text-muted">
            정렬
          </label>
          <select
            id="filter-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            className="h-12 rounded-lg border border-hairline bg-canvas px-3.5 text-sm text-ink outline-none transition focus:border-2 focus:border-ink"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tasksLoading && (
        <div className="rounded-card border border-hairline bg-canvas p-10 text-center text-sm text-muted">
          불러오는 중...
        </div>
      )}

      {tasksError && (
        <div
          role="alert"
          className="rounded-card border border-error/30 bg-error-soft p-6 text-sm text-error"
        >
          할 일을 불러오지 못했습니다.
        </div>
      )}

      {visibleTasks && (
        <TaskBoard
          tasks={visibleTasks}
          onStatusChange={handleStatusChange}
          onTaskClick={(task) => setModalTask(task)}
          onReorder={handleReorder}
        />
      )}

      {modalOpen && (
        <TaskForm
          task={modalTask ?? null}
          weeklyPlans={weeklyPlans ?? []}
          onSuccess={() => {
            mutateTasks();
            closeModal();
          }}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}
