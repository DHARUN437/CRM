import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { PageHeader } from "@/components/app/page-header"
import { AdminEODClient } from "./admin-eod-client"

export const dynamic = "force-dynamic"

export default async function AdminEODReportsPage() {
  const user = await getCurrentUser()
  if (!user || (user.role !== "team" && user.role !== "tl")) {
    redirect("/projects")
  }

  const supabase = await createClient()
  const isTL = user.role === "tl"

  let allowedUserIds: string[] | null = null
  let teamMembersList: { user_id: string; name: string; email: string }[] = []

  if (isTL) {
    // 1. Resolve TL's team_members row
    const { data: myMember } = await supabase
      .from("team_members")
      .select("id, user_id, name, email")
      .eq("user_id", user.id)
      .maybeSingle()

    if (myMember) {
      // 2. Fetch project IDs assigned to this TL
      const [{ data: tlProjects }, { data: tlAssignments }] = await Promise.all([
        supabase.from("projects").select("id").eq("tl_id", myMember.id),
        supabase.from("project_assignments").select("project_id").eq("team_member_id", myMember.id),
      ])

      const myProjectIds = Array.from(
        new Set([
          ...(tlProjects ?? []).map((p) => p.id),
          ...(tlAssignments ?? []).map((a) => a.project_id),
        ])
      )

      // 3. Fetch all teammates on those projects
      const { data: projectTeammates } = myProjectIds.length > 0
        ? await supabase
            .from("project_assignments")
            .select("team_members(id, user_id, name, email)")
            .in("project_id", myProjectIds)
        : { data: [] }

      const userMap = new Map<string, { user_id: string; name: string; email: string }>()
      userMap.set(myMember.user_id, { user_id: myMember.user_id, name: myMember.name, email: myMember.email })

      for (const pt of projectTeammates ?? []) {
        const tm = pt.team_members as unknown as { id: string; user_id: string; name: string; email: string } | null
        if (tm) {
          userMap.set(tm.user_id, { user_id: tm.user_id, name: tm.name, email: tm.email })
        }
      }

      teamMembersList = Array.from(userMap.values())
      allowedUserIds = Array.from(userMap.keys())
    }
  } else {
    // Admin sees all team members
    const { data: allMembers } = await supabase
      .from("team_members")
      .select("user_id, name, email")
      .order("name", { ascending: true })

    teamMembersList = (allMembers ?? []) as { user_id: string; name: string; email: string }[]
  }

  // Fetch EOD reports (scoped by allowedUserIds for TL, or all for Admin)
  let eodQuery = supabase
    .from("eod_reports")
    .select("*, eod_report_attachments(*)")
    .order("report_date", { ascending: false })

  if (allowedUserIds && allowedUserIds.length > 0) {
    eodQuery = eodQuery.in("employee_id", allowedUserIds)
  } else if (isTL) {
    // Fallback if TL has no projects assigned
    eodQuery = eodQuery.eq("employee_id", user.id)
  }

  const { data: rawReports } = await eodQuery

  const names = new Map<string, string>()
  for (const tm of teamMembersList) {
    names.set(tm.user_id, tm.name)
  }

  const reports = (rawReports || []).map((r) => ({
    id: r.id,
    employeeId: r.employee_id,
    employeeName: names.get(r.employee_id) || "Team Member",
    reportDate: r.report_date,
    workSummary: r.work_summary,
    blockers: r.blockers,
    attachments: r.eod_report_attachments || [],
    createdAt: r.created_at,
  }))

  const employees = teamMembersList.map((tm) => ({
    id: tm.user_id,
    name: tm.name,
    email: tm.email,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <PageHeader
        title={isTL ? "Team EOD Reports (My Projects)" : "Team EOD Reports"}
        description={
          isTL
            ? "Review daily end-of-day submissions and Google Drive attachments for workers on your assigned projects."
            : "Review daily end-of-day submissions, Google Drive attachments, and track non-submitting team members."
        }
      />

      <AdminEODClient initialReports={reports} employees={employees} />
    </div>
  )
}
