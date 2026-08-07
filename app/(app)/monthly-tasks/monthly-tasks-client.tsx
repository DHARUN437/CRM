"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CircularProgress } from "@/components/ui/circular-progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  Loader2,
  AlertCircle,
  ShieldAlert,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react"

export interface WorkHistorySession {
  id: string
  workDate: string
  employeeName: string
  note?: string | null
}

export interface MonthlyTaskItem {
  id: string
  assignedTo: string
  assignedToName: string
  assignedBy: string
  assignedByName: string
  title: string
  description?: string | null
  month: string
  dueDate: string
  assignedDate?: string
  status: "not_started" | "in_progress" | "completed"
  progress: number
  completedAt?: string | null
  completedViaEodId?: string | null
  completedEodDate?: string | null
  workHistory?: WorkHistorySession[]
  sessionCount?: number
  lastWorkedDate?: string | null
}

interface MonthlyTasksClientProps {
  currentUserRole: string | null
  currentUserId: string
  initialTasks: MonthlyTaskItem[]
  employees: { id: string; name: string; email: string }[]
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  not_started: { label: "Not Started", badge: "bg-[var(--background)] text-[var(--text-secondary)] font-semibold border border-[var(--border)]/60" },
  in_progress: { label: "In Progress", badge: "bg-info/15 text-info font-semibold" },
  completed: { label: "Completed", badge: "bg-success/15 text-success font-semibold" },
}

export function MonthlyTasksClient({
  currentUserRole,
  currentUserId,
  initialTasks,
  employees,
}: MonthlyTasksClientProps) {
  const router = useRouter()
  const isAdmin = currentUserRole === "team"
  const currentMonthStr = new Date().toISOString().slice(0, 7)

  const [monthFilter, setMonthFilter] = useState<string>(currentMonthStr)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [employeeFilter, setEmployeeFilter] = useState<string>(isAdmin ? "all" : currentUserId)

  // Expandable work history tracking
  const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([])
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null)

  // Task assignment dialog state
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTo, setAssignTo] = useState<string>(employees[0]?.id || "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleHistoryExpand(taskId: string) {
    if (expandedTaskIds.includes(taskId)) {
      setExpandedTaskIds(expandedTaskIds.filter((id) => id !== taskId))
    } else {
      setExpandedTaskIds([...expandedTaskIds, taskId])
    }
  }

  async function handleMarkComplete(taskId: string) {
    setCompletingTaskId(taskId)
    try {
      const res = await fetch(`/api/monthly-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed", progress: 100 }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to mark task as completed.")
      }

      router.refresh()
    } catch (err) {
      console.error("Mark complete error:", err)
    } finally {
      setCompletingTaskId(null)
    }
  }

  const filteredTasks = initialTasks.filter((t) => {
    const monthMatch = !monthFilter || t.month === monthFilter
    const statusMatch = statusFilter === "all" || t.status === statusFilter
    const empMatch = employeeFilter === "all" || t.assignedTo === employeeFilter
    return monthMatch && statusMatch && empMatch
  })

  async function handleAssignTask() {
    if (!assignTo || !title.trim() || !dueDate) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/monthly-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedTo: assignTo,
          title: title.trim(),
          description: description.trim() || undefined,
          month: monthFilter || currentMonthStr,
          dueDate,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to assign monthly task.")
      }

      setAssignOpen(false)
      setTitle("")
      setDescription("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign monthly task.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Action Bar & Scoping Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface)] p-4 rounded-2xl border border-[var(--border)] shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <Calendar className="size-4 text-[var(--accent)]" />
            Month:
          </div>
          <Input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-36 text-xs h-9 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)]"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs h-9 px-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          >
            <option value="all">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          {isAdmin && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="text-xs h-9 px-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="all">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {isAdmin ? (
          <Button
            onClick={() => setAssignOpen(true)}
            className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] text-xs h-9 px-4 font-semibold rounded-xl shrink-0 shadow-sm transition-all"
          >
            <Plus className="size-4 mr-1.5" />
            Assign Monthly Task
          </Button>
        ) : (
          <div className="text-xs font-medium text-[var(--text-muted)] flex items-center gap-1.5">
            <ShieldAlert className="size-3.5 text-warning" />
            Team Lead task-assignment scoping is pending team-hierarchy schema. Admin assignment active.
          </div>
        )}
      </div>

      {/* Task List Overview */}
      {filteredTasks.length === 0 ? (
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-2xl">
          <CardContent className="p-10 text-center text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="mx-auto mb-2 size-8 text-[var(--text-muted)]" />
            No monthly tasks found for the selected month/filters.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredTasks.map((task) => {
            const meta = STATUS_META[task.status] || STATUS_META.not_started
            const isBehind = task.status !== "completed" && new Date(task.dueDate) < new Date()
            const isExpanded = expandedTaskIds.includes(task.id)
            const sessions = task.workHistory || []
            const sessionCount = task.sessionCount || sessions.length

            return (
              <Card key={task.id} className="bg-[var(--surface)] border-[var(--border)] rounded-2xl shadow-sm transition-all">
                <CardContent className="p-5 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Orange / Green SVG Circular Progress Indicator */}
                      <CircularProgress
                        progress={task.progress}
                        size={52}
                        strokeWidth={4.5}
                      />

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            {task.title}
                          </h3>
                          <Badge className={meta.badge}>{meta.label}</Badge>
                          {isBehind && (
                            <Badge className="bg-destructive/15 text-destructive font-semibold">
                              Overdue
                            </Badge>
                          )}

                          {/* Lightweight Work Session Indicators */}
                          {sessionCount > 0 ? (
                            <Badge variant="outline" className="bg-[var(--accent-tint)]/60 text-[var(--accent)] border-[var(--accent)]/30 text-xs font-semibold">
                              <History className="size-3 mr-1" />
                              {sessionCount} work session{sessionCount > 1 ? "s" : ""} logged · Last: {task.lastWorkedDate}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-[var(--background)] text-[var(--text-muted)] border-[var(--border)] text-xs font-medium">
                              No work logged yet
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-[var(--text-secondary)]">
                          Assigned To: <span className="font-semibold text-[var(--text-primary)]">{task.assignedToName}</span> · Assigned By: <span className="font-semibold text-[var(--text-primary)]">{task.assignedByName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 sm:self-center">
                      <span className="flex items-center gap-1.5 bg-[var(--background)] px-3 py-1.5 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)]">
                        <Clock className="size-3.5 text-[var(--accent)]" />
                        Due: {task.dueDate}
                      </span>

                      {task.status !== "completed" && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkComplete(task.id)}
                          disabled={completingTaskId === task.id}
                          className="bg-[#15803D] hover:bg-[#166534] text-white text-xs h-8 px-3 rounded-xl font-semibold shadow-xs transition-all"
                        >
                          {completingTaskId === task.id ? (
                            <Loader2 className="size-3.5 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="size-3.5 mr-1" />
                          )}
                          Mark Complete (100%)
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleHistoryExpand(task.id)}
                        className="text-xs font-semibold h-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl"
                      >
                        <History className="size-3.5 mr-1 text-[var(--accent)]" />
                        Work History
                        {isExpanded ? <ChevronUp className="size-3.5 ml-1" /> : <ChevronDown className="size-3.5 ml-1" />}
                      </Button>
                    </div>
                  </div>

                  {task.description && (
                    <p className="text-xs text-[var(--text-secondary)] bg-[var(--background)] p-3.5 rounded-xl border border-[var(--border)] leading-relaxed">
                      {task.description}
                    </p>
                  )}

                  {task.status === "completed" && (
                    <div className="flex items-center gap-2 text-xs text-success font-semibold pt-2 border-t border-[var(--border)]">
                      <CheckCircle2 className="size-3.5" />
                      Closed at 100% Progress {task.completedEodDate ? `via EOD Report on ${task.completedEodDate}` : "via explicit completion"}
                    </div>
                  )}

                  {/* Expandable Work History Section */}
                  {isExpanded && (
                    <div className="mt-2 pt-3 border-t border-[var(--border)] flex flex-col gap-2 bg-[var(--background)]/60 p-4 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-2">
                          <History className="size-4 text-[var(--accent)]" />
                          Logged Work Sessions ({sessions.length})
                        </span>
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          Current Auto-Progress: <strong className="text-[var(--accent)]">{task.progress}%</strong>
                        </span>
                      </div>

                      {sessions.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)] italic py-2">
                          No work logged yet. Select this task on your daily EOD report to record a work session.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2 mt-1">
                          {sessions.map((session) => (
                            <div
                              key={session.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-[var(--accent-tint)]/40 text-[var(--accent)] border-[var(--accent)]/30 font-semibold">
                                  {session.workDate}
                                </Badge>
                                <span className="font-semibold text-[var(--text-primary)]">
                                  {session.employeeName}
                                </span>
                                {session.note && (
                                  <span className="text-[var(--text-secondary)] italic">
                                    — &quot;{session.note}&quot;
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                                <FileText className="size-3" />
                                Linked to EOD Entry
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Task Assignment Modal */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
              <Plus className="size-5 text-[var(--accent)]" />
              Assign Monthly Task
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--text-secondary)]">
              Assign a deliverable to an employee for month {monthFilter}.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-semibold text-[var(--text-primary)]">Assign To Employee *</Label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="w-full text-xs p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-title" className="text-xs font-semibold text-[var(--text-primary)]">Task Title *</Label>
              <Input
                id="task-title"
                placeholder="e.g. Complete Q3 Client Portal Security Audit"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="task-desc" className="text-xs font-semibold text-[var(--text-primary)]">Description / Target Criteria (Optional)</Label>
              <Textarea
                id="task-desc"
                placeholder="Describe key requirements or acceptance criteria..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="task-month" className="text-xs font-semibold text-[var(--text-primary)]">Month *</Label>
                <Input
                  id="task-month"
                  type="month"
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="task-due" className="text-xs font-semibold text-[var(--text-primary)]">Due Date *</Label>
                <Input
                  id="task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="mt-2">
            <Button
              onClick={handleAssignTask}
              disabled={!title.trim() || saving}
              className="w-full sm:w-auto bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-semibold shadow-sm rounded-xl px-5 py-2.5 text-xs transition-all"
            >
              {saving && <Loader2 className="size-4 animate-spin mr-2" />}
              Assign Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
