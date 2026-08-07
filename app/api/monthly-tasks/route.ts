import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

type EodTaskUpdateRow = {
  id: string
  work_date: string
  note: string | null
  employee_id: string
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7)
  const scope = searchParams.get("scope")

  let query = supabase
    .from("monthly_tasks")
    .select("*, eod_reports(report_date), eod_task_updates(id, work_date, note, employee_id)")
    .eq("month", month)
    .order("due_date", { ascending: true })

  if (scope === "mine" || user.role === "worker") {
    query = query.eq("assigned_to", user.id)
  }

  const { data: rawTasks, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch employee names
  const userIds = [...new Set((rawTasks || []).flatMap((t) => [
    t.assigned_to,
    t.assigned_by,
    ...(t.eod_task_updates || []).map((u: EodTaskUpdateRow) => u.employee_id)
  ]))]
  const names = new Map<string, string>()

  if (userIds.length) {
    const { data: members } = await supabase
      .from("team_members")
      .select("user_id, name")
      .in("user_id", userIds)
    for (const m of members || []) {
      names.set(m.user_id, m.name)
    }
  }

  const tasks = (rawTasks || []).map((t) => {
    const updates = ((t.eod_task_updates || []) as EodTaskUpdateRow[]).sort(
      (a, b) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime()
    )

    const workHistory = updates.map((u) => ({
      id: u.id,
      workDate: u.work_date,
      employeeName: names.get(u.employee_id) || "Employee",
      note: u.note || null,
    }))

    const lastWorkedDate = updates.length > 0 ? updates[0].work_date : null

    return {
      ...t,
      assignedToName: names.get(t.assigned_to) || "Employee",
      assignedByName: names.get(t.assigned_by) || "Admin",
      workHistory,
      sessionCount: workHistory.length,
      lastWorkedDate,
    }
  })

  return NextResponse.json({ tasks })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden. Only Admins can assign monthly tasks." }, { status: 403 })
  }

  const body = await request.json()
  const { assignedTo, title, description, month, dueDate } = body

  if (!assignedTo || !title || !month || !dueDate) {
    return NextResponse.json({ error: "Missing required fields (assignedTo, title, month, dueDate)" }, { status: 400 })
  }

  const { data: task, error } = await supabase
    .from("monthly_tasks")
    .insert({
      assigned_to: assignedTo,
      assigned_by: user.id,
      title: title.trim(),
      description: description ? description.trim() : null,
      month,
      due_date: dueDate,
      status: "not_started",
    })
    .select()
    .single()

  if (error) {
    console.error("Monthly task assignment error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task })
}
