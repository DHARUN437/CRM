import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { PageHeader } from "@/components/app/page-header"
import { MonthlyTasksClient } from "./monthly-tasks-client"

export const dynamic = "force-dynamic"

type EodReportRef = { report_date: string } | { report_date: string }[] | null

interface MonthlyTaskRow {
  id: string
  assigned_to: string
  assigned_by: string
  title: string
  description: string | null
  month: string
  due_date: string
  assigned_date: string | null
  created_at: string | null
  status: string
  progress: number | null
  completed_at: string | null
  completed_via_eod_id: string | null
  eod_reports?: EodReportRef
  eod_task_updates?: {
    id: string
    work_date: string
    note: string | null
    employee_id: string
  }[]
}

export default async function MonthlyTasksPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role !== "team" && user.role !== "tl" && user.role !== "worker") {
    redirect("/portal")
  }

  const supabase = await createClient()

  // Fetch team members
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("user_id, name, email")
    .order("name", { ascending: true })

  // Fetch monthly tasks with eod_reports and eod_task_updates work history
  const { data: rawTasks } = await supabase
    .from("monthly_tasks")
    .select("*, eod_reports(report_date), eod_task_updates(id, work_date, note, employee_id)")
    .order("due_date", { ascending: true })

  const names = new Map<string, string>()
  for (const tm of teamMembers || []) {
    names.set(tm.user_id, tm.name)
  }

  const tasks = (rawTasks || []).map((t: MonthlyTaskRow) => {
    const updates = (t.eod_task_updates || []).sort(
      (a, b) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime()
    )

    const workHistory = updates.map((u) => ({
      id: u.id,
      workDate: u.work_date,
      employeeName: names.get(u.employee_id) || "Employee",
      note: u.note || null,
    }))

    const lastWorkedDate = updates.length > 0 ? updates[0].work_date : null
    const eodReports = t.eod_reports
    const completedEodDate = Array.isArray(eodReports)
      ? eodReports[0]?.report_date ?? null
      : eodReports?.report_date ?? null

    return {
      id: t.id,
      assignedTo: t.assigned_to,
      assignedToName: names.get(t.assigned_to) || "Employee",
      assignedBy: t.assigned_by,
      assignedByName: names.get(t.assigned_by) || "Admin",
      title: t.title,
      description: t.description,
      month: t.month,
      dueDate: t.due_date,
      assignedDate: t.assigned_date || t.created_at?.split("T")[0],
      status: t.status as "not_started" | "in_progress" | "completed",
      progress: typeof t.progress === "number" ? t.progress : (t.status === "completed" ? 100 : 0),
      completedAt: t.completed_at,
      completedViaEodId: t.completed_via_eod_id,
      completedEodDate,
      workHistory,
      sessionCount: workHistory.length,
      lastWorkedDate,
    }
  })

  const employees = (teamMembers || []).map((tm) => ({
    id: tm.user_id,
    name: tm.name,
    email: tm.email,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <PageHeader
        title="Monthly Tasks & Progress Tracking"
        description="Assign monthly deliverables, monitor auto-incrementing progress from daily EOD entries, and track completions."
      />

      <MonthlyTasksClient
        currentUserRole={user.role}
        currentUserId={user.id}
        initialTasks={tasks}
        employees={employees}
      />
    </div>
  )
}
