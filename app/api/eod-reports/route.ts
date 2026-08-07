import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export async function GET(request: Request) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0]
  const mode = searchParams.get("mode")

  if (mode === "single") {
    const { data: report } = await supabase
      .from("eod_reports")
      .select("*, eod_report_attachments(*), eod_report_tasks(*), eod_task_updates(*)")
      .eq("employee_id", user.id)
      .eq("report_date", date)
      .maybeSingle()

    return NextResponse.json({ report: report || null })
  }

  // Admin / Team view
  const { data: rawReports, error } = await supabase
    .from("eod_reports")
    .select("*, eod_report_attachments(*), eod_task_updates(*)")
    .order("report_date", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const employeeIds = [...new Set((rawReports || []).map((r) => r.employee_id))]
  const names = new Map<string, { name: string; email: string }>()

  if (employeeIds.length) {
    const { data: members } = await supabase
      .from("team_members")
      .select("user_id, name, email")
      .in("user_id", employeeIds)
    for (const m of members || []) {
      names.set(m.user_id, { name: m.name, email: m.email })
    }
  }

  const reports = (rawReports || []).map((r) => {
    const emp = names.get(r.employee_id)
    return {
      ...r,
      employeeName: emp?.name || "Team Member",
      employeeEmail: emp?.email || "",
    }
  })

  return NextResponse.json({ reports })
}

/**
 * Calculates per-task daily increment based on (due_date - assigned_date)
 * and updates monthly_tasks progress (capped at 95% for EODs, 100% for explicit completion).
 */
async function syncTaskProgress(
  supabase: any,
  taskId: string,
  forceCompleted: boolean = false,
  reportId?: string
) {
  const { data: task } = await supabase
    .from("monthly_tasks")
    .select("id, status, assigned_date, due_date, created_at")
    .eq("id", taskId)
    .single()

  if (!task) return

  if (forceCompleted || task.status === "completed") {
    await supabase
      .from("monthly_tasks")
      .update({
        status: "completed",
        progress: 100,
        completed_at: new Date().toISOString(),
        completed_via_eod_id: reportId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
    return
  }

  // Calculate pacing window total_days
  const startDateStr = task.assigned_date || task.created_at?.split("T")[0] || new Date().toISOString().split("T")[0]
  const start = new Date(startDateStr)
  const end = new Date(task.due_date)
  const diffMs = Math.max(0, end.getTime() - start.getTime())
  const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  const dailyIncrement = 95 / totalDays

  // Count unique work dates logged for this task
  const { data: updates } = await supabase
    .from("eod_task_updates")
    .select("work_date")
    .eq("monthly_task_id", taskId)

  const uniqueDates = new Set((updates || []).map((u: any) => u.work_date))
  const newProgress = Math.min(95, Math.round(uniqueDates.size * dailyIncrement))

  await supabase
    .from("monthly_tasks")
    .update({
      progress: newProgress,
      status: task.status === "not_started" && uniqueDates.size > 0 ? "in_progress" : task.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    reportDate,
    workSummary,
    blockers,
    attachments = [],
    taskUpdates = [], // array of { taskId: string, markedCompleted: boolean, note?: string }
  } = body

  if (!workSummary || !workSummary.trim()) {
    return NextResponse.json({ error: "Work summary is required." }, { status: 400 })
  }

  const date = reportDate || new Date().toISOString().split("T")[0]

  // 1. Fetch previous eod_task_updates before modification to find all affected task IDs
  const { data: existingReport } = await supabase
    .from("eod_reports")
    .select("id")
    .eq("employee_id", user.id)
    .eq("report_date", date)
    .maybeSingle()

  const affectedTaskIds = new Set<string>()

  if (existingReport) {
    const { data: prevUpdates } = await supabase
      .from("eod_task_updates")
      .select("monthly_task_id")
      .eq("eod_entry_id", existingReport.id)

    for (const u of prevUpdates || []) {
      affectedTaskIds.add(u.monthly_task_id)
    }
  }

  // 2. Upsert EOD Report record
  const { data: report, error: reportError } = await supabase
    .from("eod_reports")
    .upsert(
      {
        employee_id: user.id,
        report_date: date,
        work_summary: workSummary.trim(),
        blockers: blockers ? blockers.trim() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "employee_id, report_date" }
    )
    .select()
    .single()

  if (reportError) {
    console.error("EOD report upsert error:", reportError)
    return NextResponse.json({ error: reportError.message }, { status: 500 })
  }

  // 3. Insert Attachments
  if (attachments && attachments.length > 0) {
    const attachmentRows = attachments.map((att: any) => ({
      eod_report_id: report.id,
      google_drive_file_id: att.google_drive_file_id,
      file_name: att.file_name,
      file_url: att.file_url,
      file_size: att.file_size,
      mime_type: att.mime_type,
    }))

    await supabase.from("eod_report_attachments").insert(attachmentRows)
  }

  // 4. Process Task Updates & Sync Work History Sessions
  await supabase.from("eod_task_updates").delete().eq("eod_entry_id", report.id)

  if (taskUpdates && taskUpdates.length > 0) {
    const workSessionRows: any[] = []

    for (const update of taskUpdates as { taskId: string; markedCompleted: boolean; note?: string }[]) {
      affectedTaskIds.add(update.taskId)

      await supabase.from("eod_report_tasks").upsert(
        {
          eod_report_id: report.id,
          task_id: update.taskId,
          marked_completed: update.markedCompleted,
        },
        { onConflict: "eod_report_id, task_id" }
      )

      workSessionRows.push({
        eod_entry_id: report.id,
        monthly_task_id: update.taskId,
        employee_id: user.id,
        work_date: date,
        note: update.note ? update.note.trim() : null,
      })
    }

    if (workSessionRows.length > 0) {
      await supabase.from("eod_task_updates").insert(workSessionRows)
    }
  }

  // 5. Recalculate auto-incrementing progress & status for all affected tasks
  for (const taskId of affectedTaskIds) {
    const updateItem = (taskUpdates as any[]).find((t) => t.taskId === taskId)
    await syncTaskProgress(supabase, taskId, Boolean(updateItem?.markedCompleted), report.id)
  }

  return NextResponse.json({ report })
}
