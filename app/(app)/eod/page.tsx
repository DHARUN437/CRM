import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { PageHeader } from "@/components/app/page-header"
import { EODFormClient } from "./eod-form-client"

export const dynamic = "force-dynamic"

export default async function EODReportPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const supabase = await createClient()
  const todayStr = new Date().toISOString().split("T")[0]
  const currentMonthStr = todayStr.slice(0, 7)

  // Fetch existing report for today (if any)
  const { data: existingReport } = await supabase
    .from("eod_reports")
    .select("*, eod_report_attachments(*)")
    .eq("employee_id", user.id)
    .eq("report_date", todayStr)
    .maybeSingle()

  // Fetch active monthly tasks for employee
  const { data: activeTasks } = await supabase
    .from("monthly_tasks")
    .select("*")
    .eq("assigned_to", user.id)
    .eq("month", currentMonthStr)
    .in("status", ["not_started", "in_progress"])
    .order("due_date", { ascending: true })

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <PageHeader
        title="Daily EOD Report"
        description="Submit your daily work summary, blockers, Google Drive attachments, and update assigned monthly tasks."
      />

      <EODFormClient
        userId={user.id}
        initialReport={existingReport || null}
        initialTasks={activeTasks || []}
      />
    </div>
  )
}
