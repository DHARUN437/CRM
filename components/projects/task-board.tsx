"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  TASK_STATUS_META,
  TASK_PRIORITY_META,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/portal-types"

interface TaskBoardProps {
  tasks: ProjectTask[]
}

const TASK_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
]

export function TaskBoard({ tasks: initialTasks }: TaskBoardProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<ProjectTask[]>(initialTasks)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)

  const byStatus = useMemo(() => {
    const map: Record<TaskStatus, ProjectTask[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    }
    for (const t of tasks) map[t.status].push(t)
    return map
  }, [tasks])

  function handleDragStart(e: React.DragEvent, id: string) {
    setDragId(id)
    e.dataTransfer.effectAllowed = "move"
  }

  async function handleDrop(status: TaskStatus) {
    if (!dragId) return
    const task = tasks.find((t) => t.id === dragId)
    if (!task || task.status === status) {
      setDragId(null)
      setOverColumn(null)
      return
    }

    setTasks((prev) =>
      prev.map((t) =>
        t.id === dragId ? { ...t, status, updated_at: new Date().toISOString() } : t
      )
    )
    setDragId(null)
    setOverColumn(null)

    const supabase = createClient()
    const { error } = await supabase
      .from("project_tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", dragId)

    if (error) {
      router.refresh()
    }
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {TASK_COLUMNS.map((col) => {
        const colTasks = byStatus[col.id]
        return (
          <section
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault()
              setOverColumn(col.id)
            }}
            onDragLeave={() => setOverColumn((s) => (s === col.id ? null : s))}
            onDrop={() => handleDrop(col.id)}
            className={cn(
              "flex w-[280px] shrink-0 flex-col rounded-2xl border border-border/60 bg-muted/30 transition-colors",
              overColumn === col.id && "border-primary/50 bg-primary/5"
            )}
          >
            <header className="flex items-center gap-2 px-3.5 pt-3.5 pb-2">
              <span
                className={cn("size-2.5 rounded-full", TASK_STATUS_META[col.id].color)}
              />
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                {colTasks.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2 px-3 pb-3">
              {colTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  dragging={dragId === task.id}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function TaskCard({
  task,
  dragging,
  onDragStart,
}: {
  task: ProjectTask
  dragging: boolean
  onDragStart: (e: React.DragEvent, id: string) => void
}) {
  const priorityMeta = TASK_PRIORITY_META[task.priority]
  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      className={cn(
        "cursor-grab rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
        dragging && "opacity-40"
      )}
    >
      <p className="text-sm font-medium leading-tight">{task.title}</p>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge className={cn("h-5 text-[10px]", priorityMeta.badge)}>
          {priorityMeta.label}
        </Badge>
        {task.due_date && (
          <Badge variant="outline" className="h-5 text-[10px]">
            {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Badge>
        )}
        {task.assignee_name && (
          <Badge variant="outline" className="h-5 text-[10px]">
            {task.assignee_name}
          </Badge>
        )}
      </div>
    </article>
  )
}
