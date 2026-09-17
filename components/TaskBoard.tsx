"use client";

import { useMemo, useState, type CSSProperties, type JSX } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type TaskStatus = "todo" | "doing" | "done";

export type BoardTask = {
  _id: string;
  title: string;
  date: string;
  status: TaskStatus;
  order: number;
  weeklyPlanId: string | null;
};

type TaskBoardProps = {
  tasks: BoardTask[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick: (task: BoardTask) => void;
  onReorder: (updates: { taskId: string; order: number }[]) => void;
};

const COLUMNS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: "todo", label: "할 일", accent: "#6a6a6a" },
  { status: "doing", label: "진행 중", accent: "#ff385c" },
  { status: "done", label: "완료", accent: "#0f7a72" },
];

const STATUSES = COLUMNS.map((column) => column.status);

function accentForStatus(status: TaskStatus): string {
  return COLUMNS.find((column) => column.status === status)?.accent ?? "#6a6a6a";
}

function formatCardDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${year.slice(2)}.${month}.${day}`;
}

export function TaskBoard({
  tasks,
  onStatusChange,
  onTaskClick,
  onReorder,
}: TaskBoardProps): JSX.Element {
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const byStatus = useMemo(() => {
    const grouped: Record<TaskStatus, BoardTask[]> = {
      todo: [],
      doing: [],
      done: [],
    };
    for (const task of tasks) grouped[task.status].push(task);
    return grouped;
  }, [tasks]);

  function findTask(id: string): BoardTask | undefined {
    return tasks.find((task) => task._id === id);
  }

  function findStatusForDroppableId(id: string): TaskStatus | undefined {
    if ((STATUSES as string[]).includes(id)) return id as TaskStatus;
    return findTask(id)?.status;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(findTask(String(event.active.id)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const sourceStatus = findTask(String(active.id))?.status;
    const targetStatus = findStatusForDroppableId(String(over.id));

    if (!sourceStatus || !targetStatus) return;

    if (sourceStatus === targetStatus) {
      if (active.id === over.id) return;

      const columnTasks = byStatus[sourceStatus];
      const oldIndex = columnTasks.findIndex((task) => task._id === active.id);
      const newIndex = columnTasks.findIndex((task) => task._id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(columnTasks, oldIndex, newIndex);
      const updates = reordered
        .map((task, index) => ({ taskId: task._id, order: index, changed: task.order !== index }))
        .filter((update) => update.changed)
        .map(({ taskId, order }) => ({ taskId, order }));

      if (updates.length > 0) onReorder(updates);
      return;
    }

    onStatusChange(String(active.id), targetStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COLUMNS.map((column) => (
          <BoardColumn
            key={column.status}
            status={column.status}
            label={column.label}
            accent={column.accent}
            tasks={byStatus[column.status]}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div
            className="w-full max-w-xs rotate-1 rounded-lg border border-hairline border-l-[3px] bg-canvas px-3 py-2.5 shadow-2xl"
            style={{ borderLeftColor: accentForStatus(activeTask.status) }}
          >
            <TaskCardBody task={activeTask} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  status,
  label,
  accent,
  tasks,
  onTaskClick,
}: {
  status: TaskStatus;
  label: string;
  accent: string;
  tasks: BoardTask[];
  onTaskClick: (task: BoardTask) => void;
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border bg-canvas p-3 transition-colors ${
        isOver ? "border-primary bg-primary-soft" : "border-hairline"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <h3 className="text-sm font-semibold text-ink">{label}</h3>
        </div>
        <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-muted">
          {tasks.length}
        </span>
      </div>

      <SortableContext
        items={tasks.map((task) => task._id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex min-h-[140px] flex-1 flex-col gap-2">
          {tasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-hairline py-8 text-center text-xs text-muted-soft">
              카드를 이곳에 놓으세요
            </div>
          )}
          {tasks.map((task) => (
            <SortableTaskCard
              key={task._id}
              task={task}
              accent={accent}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableTaskCard({
  task,
  accent,
  onTaskClick,
}: {
  task: BoardTask;
  accent: string;
  onTaskClick: (task: BoardTask) => void;
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    borderLeftColor: accent,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onTaskClick(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTaskClick(task);
        }
      }}
      className="flex cursor-grab flex-col gap-1.5 rounded-card border border-hairline border-l-[3px] bg-canvas px-3 py-2.5 text-left outline-none transition hover:border-border-strong hover:shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink active:cursor-grabbing"
    >
      <TaskCardBody task={task} />
    </div>
  );
}

function TaskCardBody({ task }: { task: BoardTask }): JSX.Element {
  return (
    <>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{task.title}</p>
      <p className="text-xs tabular-nums text-muted-soft">{formatCardDate(task.date)}</p>
    </>
  );
}
