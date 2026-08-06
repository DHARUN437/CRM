import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { fetchRecentMessages } from "@/lib/messages"
import { DashboardRealtimeSync } from "@/components/dashboard/dashboard-live"
import {
  NeedsAttentionSection,
  type OverdueInvoiceItem,
  type AtRiskClientItem,
  type TeamMemberWorkloadItem,
} from "@/components/dashboard/needs-attention-section"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  FolderKanban,
  FolderCheck,
  FolderClock,
  MessageSquareText,
  Plus,
  Users,
  FileUp,
  Activity,
  CheckCircle2,
} from "lucide-react"
import {
  PROJECT_STATUS_META,
  formatDate,
  formatMessageTime,
  type ProjectStatus,
} from "@/lib/portal-types"

export const dynamic = "force-dynamic"

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Recently"
  const now = new Date().getTime()
  const past = new Date(iso).getTime()
  const diffSec = Math.floor((now - past) / 1000)

  if (diffSec < 60) return "Just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return formatDate(iso)
}

function initials(name?: string | null) {
  if (!name) return "??"
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const isWorker = user.role === "worker"
  const isTL = user.role === "tl"
  const isAdmin = user.role === "team"

  // Resolve the worker/TL's team member id for filtering.
  let myMember: { id: string; name: string } | null = null
  try {
    if (isWorker || isTL) {
      const { data } = await supabase
        .from("team_members")
        .select("id, name")
        .eq("user_id", user.id)
        .maybeSingle()
      myMember = data
    }
  } catch {
    // fallback
  }

  let projectIdsForWorker: string[] | null = null
  if (isWorker && myMember) {
    try {
      const { data: assigned } = await supabase
        .from("project_assignments")
        .select("project_id")
        .eq("team_member_id", myMember.id)
      projectIdsForWorker = (assigned ?? []).map((a) => a.project_id)
    } catch {
      projectIdsForWorker = []
    }
  }

  let projectsQuery = supabase
    .from("projects")
    .select("*, clients(name, company)")
    .order("created_at", { ascending: false })

  if (isWorker && projectIdsForWorker) {
    projectsQuery = projectsQuery.in("id", projectIdsForWorker.length ? projectIdsForWorker : ["00000000-0000-0000-0000-000000000000"])
  } else if (isTL && myMember) {
    projectsQuery = projectsQuery.eq("tl_id", myMember.id)
  }

  let projects: any[] | null = null
  try {
    const { data } = await projectsQuery
    projects = data
  } catch {
    projects = []
  }

  const all = (projects ?? []) as {
    id: string
    name: string
    status: string
    progress: number
    due_date: string | null
    created_at: string
    tl_id?: string | null
    clients?: { name: string; company: string | null } | null
  }[]

  const active = all.filter((p) => p.status !== "completed")
  const completed = all.filter((p) => p.status === "completed")
  const inProgress = all.filter((p) => p.status === "in_progress")

  // Real Month-over-Month Trend Calculation
  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const projectsThisMonth = all.filter((p) => p.created_at >= startOfThisMonth).length
  const projectsLastMonth = all.filter(
    (p) => p.created_at >= startOfLastMonth && p.created_at < startOfThisMonth
  ).length

  let momTrendPercent: number | null = null
  if (projectsLastMonth > 0) {
    momTrendPercent = Math.round(((projectsThisMonth - projectsLastMonth) / projectsLastMonth) * 100)
  } else if (projectsThisMonth > 0) {
    momTrendPercent = projectsThisMonth * 100
  }

  const projectIds = all.map((p) => p.id)

  let documents: { id: string }[] = []
  let members: { id: string }[] = []
  let recentMessages: any[] = []
  let projectAssignmentsMap = new Map<string, { name: string }[]>()
  let activityFeed: { id: string; title: string; details: string | null; time: string; created_at: string; type?: string }[] = []
  let taskDeadlines: { id: string; title: string; project_name: string; due_date: string }[] = []

  // ---------------------------------------------------------------------------
  // Needs Attention Section Data Variables
  // ---------------------------------------------------------------------------
  let overdueInvoiceList: OverdueInvoiceItem[] = []
  let totalOverdueAmount = 0
  let atRiskClientList: AtRiskClientItem[] = []
  let teamWorkloadList: TeamMemberWorkloadItem[] = []
  let averageWorkload = 0

  const todayStr = new Date().toISOString().split("T")[0]
  const todayMs = new Date().getTime()
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const twentyOneDaysAgoIso = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const [
      { data: docsData },
      { data: membersData },
      messagesRes,
      { data: assignData },
      { data: rawActivities },
      { data: upcomingTasks },
      { data: rawInvoices },
      { data: rawClients },
      { data: teamMembersList },
      { data: rawUnfinishedTasks },
    ] = await Promise.all([
      supabase
        .from("project_documents")
        .select("id")
        .in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]),
      isAdmin
        ? supabase.from("team_members").select("id")
        : Promise.resolve({ data: [] }),
      fetchRecentMessages(
        supabase,
        isWorker
          ? (projectIdsForWorker ?? [])
          : isTL
          ? projectIds
          : null,
        6
      ),
      supabase
        .from("project_assignments")
        .select("project_id, team_members(name)"),
      supabase
        .from("activity_logs")
        .select("id, title, details, created_at, action")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("project_tasks")
        .select("id, title, due_date, project_id, projects(name)")
        .in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"])
        .not("due_date", "is", null)
        .gte("due_date", todayStr)
        .order("due_date", { ascending: true })
        .limit(5),
      supabase
        .from("invoices")
        .select("id, invoice_number, amount, due_date, status, clients(name, company), projects(name)")
        .neq("status", "paid")
        .lt("due_date", todayStr)
        .order("due_date", { ascending: true }),
      supabase
        .from("clients")
        .select("id, name, company, created_at, projects(id, name, status, updated_at)"),
      supabase
        .from("team_members")
        .select("id, name, role"),
      supabase
        .from("project_tasks")
        .select("id, assignee_id, status")
        .neq("status", "done"),
    ])

    documents = docsData ?? []
    members = membersData ?? []
    recentMessages = messagesRes ?? []

    for (const a of (assignData ?? []) as any[]) {
      if (!a.project_id || !a.team_members?.name) continue
      const list = projectAssignmentsMap.get(a.project_id) ?? []
      list.push({ name: a.team_members.name })
      projectAssignmentsMap.set(a.project_id, list)
    }

    if (rawActivities && rawActivities.length > 0) {
      activityFeed = rawActivities.map((act) => ({
        id: act.id,
        title: act.title,
        details: act.details ?? null,
        time: formatRelativeTime(act.created_at),
        created_at: act.created_at,
        type: act.action,
      }))
    } else {
      const [{ data: docsList }, { data: tasksList }] = await Promise.all([
        supabase
          .from("project_documents")
          .select("id, name, created_at, project_id, projects(name)")
          .in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"])
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("project_tasks")
          .select("id, title, status, updated_at, project_id, projects(name)")
          .in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"])
          .order("updated_at", { ascending: false })
          .limit(4),
      ])

      const synthesized = [
        ...(docsList ?? []).map((d: any) => ({
          id: d.id,
          title: "Document Uploaded",
          details: `${d.name} ${d.projects?.name ? `in ${d.projects.name}` : ""}`,
          time: formatRelativeTime(d.created_at),
          created_at: d.created_at,
          type: "upload",
        })),
        ...(tasksList ?? []).map((t: any) => ({
          id: t.id,
          title: `Task Update: ${t.title}`,
          details: `Status: ${t.status.replace("_", " ")} ${t.projects?.name ? `(${t.projects.name})` : ""}`,
          time: formatRelativeTime(t.updated_at),
          created_at: t.updated_at,
          type: "task",
        })),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 5)

      activityFeed = synthesized
    }

    if (upcomingTasks && upcomingTasks.length > 0) {
      taskDeadlines = upcomingTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        project_name: t.projects?.name ?? "Project Task",
        due_date: t.due_date,
      }))
    }

    // 1. Overdue Invoices
    if (rawInvoices && rawInvoices.length > 0) {
      overdueInvoiceList = rawInvoices.map((inv: any) => {
        const dueMs = new Date(inv.due_date).getTime()
        const daysOverdue = Math.max(1, Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24)))
        totalOverdueAmount += Number(inv.amount || 0)
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: inv.clients?.company ?? inv.clients?.name ?? "Client",
          project_name: inv.projects?.name ?? null,
          amount: Number(inv.amount || 0),
          days_overdue: daysOverdue,
        }
      }).sort((a, b) => b.days_overdue - a.days_overdue)
    }

    // 2. At-Risk Clients
    const overdueClientNames = new Set(overdueInvoiceList.map((i) => i.client_name))
    for (const c of (rawClients ?? []) as any[]) {
      let riskReason: string | null = null
      const clientProjects = (c.projects ?? []) as any[]

      if (overdueClientNames.has(c.name) || (c.company && overdueClientNames.has(c.company))) {
        riskReason = "Overdue invoice outstanding"
      } else {
        const stalledProj = clientProjects.find(
          (p) => p.status !== "completed" && p.updated_at && p.updated_at < twentyOneDaysAgoIso
        )
        if (stalledProj) {
          riskReason = `Project stalled (21+ days)`
        } else if (c.created_at < thirtyDaysAgoIso && clientProjects.length === 0) {
          riskReason = "No activity in 30+ days"
        }
      }

      if (riskReason) {
        atRiskClientList.push({
          id: c.id,
          name: c.name,
          company: c.company ?? null,
          risk_reason: riskReason,
          last_activity: formatRelativeTime(c.created_at),
        })
      }
    }

    // 3. Team Workload
    const taskCountByMember = new Map<string, number>()
    for (const t of (rawUnfinishedTasks ?? []) as any[]) {
      if (t.assignee_id) {
        taskCountByMember.set(t.assignee_id, (taskCountByMember.get(t.assignee_id) ?? 0) + 1)
      }
    }

    const projCountByMember = new Map<string, number>()
    for (const p of active) {
      if (p.tl_id) {
        projCountByMember.set(p.tl_id, (projCountByMember.get(p.tl_id) ?? 0) + 1)
      }
    }

    const memberList = (teamMembersList ?? []) as any[]
    let totalWorkload = 0
    teamWorkloadList = memberList.map((m) => {
      const activeTasks = taskCountByMember.get(m.id) ?? 0
      const activeProjs = projCountByMember.get(m.id) ?? 0
      const activeCount = activeTasks + activeProjs
      totalWorkload += activeCount
      return {
        id: m.id,
        name: m.name,
        active_count: activeCount,
      }
    }).sort((a, b) => b.active_count - a.active_count)

    if (teamWorkloadList.length > 0) {
      averageWorkload = Math.round(totalWorkload / teamWorkloadList.length)
      teamWorkloadList = teamWorkloadList.map((m) => ({
        ...m,
        is_overloaded: averageWorkload > 0 && m.active_count >= averageWorkload * 1.5,
      }))
    }
  } catch {
    // Graceful query catch
  }

  const displayName = user.name ?? user.email.split("@")[0]

  const stats = isWorker
    ? [
        { label: "Assigned projects", value: all.length, icon: FolderKanban },
        { label: "In progress", value: inProgress.length, icon: FolderClock },
        { label: "Completed", value: completed.length, icon: FolderCheck },
        { label: "Messages", value: recentMessages.length, icon: MessageSquareText },
      ]
    : isTL
    ? [
        { label: "Led projects", value: all.length, icon: FolderKanban },
        { label: "Active projects", value: active.length, icon: FolderClock },
        { label: "Completed", value: completed.length, icon: FolderCheck },
        { label: "Messages", value: recentMessages.length, icon: MessageSquareText },
      ]
    : [
        { label: "Total projects", value: all.length, icon: FolderKanban },
        { label: "Active projects", value: active.length, icon: FolderClock },
        { label: "Documents shared", value: documents?.length ?? 0, icon: FileUp },
        { label: "Team size", value: members?.length ?? 0, icon: Users },
      ]

  const projectDeadlines = active
    .filter((p) => p.due_date && p.due_date >= todayStr)
    .map((p) => ({ id: p.id, title: p.name, project_name: p.clients?.company ?? p.clients?.name ?? "Project", due_date: p.due_date! }))

  const combinedDeadlines = [...taskDeadlines, ...projectDeadlines]
    .sort((a, b) => (a.due_date > b.due_date ? 1 : -1))
    .slice(0, 5)

  const statusBreakdown = (Object.keys(PROJECT_STATUS_META) as ProjectStatus[])
    .map((status) => ({
      status,
      count: all.filter((p) => p.status === status).length,
    }))
    .filter((s) => s.count > 0)

  return (
    <div className="flex flex-col gap-6">
      {/* Realtime Postgres Changes Sync */}
      <DashboardRealtimeSync />

      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Welcome back{isAdmin ? ", boss" : ""} — {displayName}
        </p>
        <h2 className="text-balance text-3xl font-bold tracking-tight mt-1 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {isWorker
            ? "Here's what's on your plate"
            : isTL
            ? "Here's what's happening on projects you lead"
            : "Here's what's happening across your projects"}
        </h2>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} className="group overflow-hidden glass-card glass-card-hover animate-slide-up-fade" style={{ animationDelay: `${i * 100}ms` }}>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-primary/20 to-primary/5 dark:bg-[rgba(99,102,241,0.15)] text-primary dark:text-[#818CF8] shadow-[inset_0_0_10px_rgba(79,124,255,0.1)] transition-transform duration-300 group-hover:scale-110">
                  <stat.icon className="size-5" />
                </span>
                {momTrendPercent !== null && (
                  <span className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                    momTrendPercent >= 0
                      ? "bg-success/10 dark:bg-[rgba(52,211,153,0.12)] text-success dark:text-[#34D399]"
                      : "bg-destructive/10 dark:bg-[rgba(248,113,113,0.12)] text-destructive dark:text-[#F87171]"
                  )}>
                    {momTrendPercent >= 0 ? `+${momTrendPercent}%` : `${momTrendPercent}%`}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold tracking-tight text-foreground/90 dark:text-[#F4F4F6] group-hover:text-primary dark:group-hover:text-[#818CF8] transition-colors duration-300">
                  {stat.value}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 dark:text-[#9797A8] mt-1">{stat.label}</span>
              </div>
              
              <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground/60 dark:text-[#6E6E80]">
                <span>Live sync active</span>
                <span>This Month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col gap-3 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80 dark:text-[#9797A8]">Quick Actions</h3>
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <>
              <Button render={<Link href="/projects" />} className="gap-2">
                <Plus className="size-4" />
                New project
              </Button>
              <Button variant="outline" render={<Link href="/team" />} className="gap-2">
                <Users className="size-4" />
                Manage team
              </Button>
            </>
          )}
          <Button variant="secondary" render={<Link href="/documents" />} className="gap-2 text-foreground/80 hover:text-foreground">
            <FileUp className="size-4 text-primary" />
            Upload Document
          </Button>
          <Button variant="secondary" render={<Link href="/projects" />} className="gap-2 text-foreground/80 hover:text-foreground">
            <FolderClock className="size-4 text-warning" />
            View Schedule
          </Button>
        </div>
      </div>

      {/* NEW SECTION: NEEDS YOUR ATTENTION (Full-width 3-Widget Grid) */}
      <NeedsAttentionSection
        overdueInvoices={overdueInvoiceList}
        totalOverdueAmount={totalOverdueAmount}
        atRiskClients={atRiskClientList}
        teamWorkload={teamWorkloadList}
        averageWorkload={averageWorkload}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Projects Section */}
          {!all.length ? (
            <Card className="glass-card dark:border-[#2A2A38]">
              <CardContent className="p-10 text-center text-sm text-muted-foreground dark:text-[#9797A8] flex flex-col items-center gap-2">
                <FolderKanban className="size-8 text-muted-foreground/50" />
                {isWorker
                  ? "No projects assigned to you yet."
                  : isTL
                  ? "No projects assigned to you as Team Lead yet."
                  : "No projects created yet — click New Project above to get started."}
              </CardContent>
            </Card>
          ) : (
            <section className="flex flex-col gap-3">
              <CardHeader className="px-0 pb-0">
                <CardTitle className="text-lg">
                  {isWorker ? "My assigned projects" : isTL ? "Projects you lead" : "Projects by status"}
                </CardTitle>
                {!isWorker && statusBreakdown.length > 0 && (
                  <CardDescription className="dark:text-[#9797A8]">
                    {statusBreakdown
                      .map((s) => `${PROJECT_STATUS_META[s.status].label}: ${s.count}`)
                      .join(" · ")}
                  </CardDescription>
                )}
              </CardHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {active.slice(0, 6).map((project, i) => {
                  const meta =
                    PROJECT_STATUS_META[project.status as ProjectStatus] ?? PROJECT_STATUS_META.kickoff
                  const assignedMembers = projectAssignmentsMap.get(project.id) ?? []
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="group flex flex-col gap-4 rounded-[24px] border border-border/40 dark:border-[#2A2A38] glass-card glass-card-hover p-6 animate-slide-up-fade"
                      style={{ animationDelay: `${(i + 4) * 100}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1">
                          <Badge className={cn(meta.badge, "w-fit shadow-sm border-0 text-[10px] px-2 py-0.5")}>{meta.label}</Badge>
                          <p className="truncate text-base font-bold text-foreground/90 dark:text-[#F4F4F6] group-hover:text-primary dark:group-hover:text-[#818CF8] transition-colors mt-1">
                            {project.name}
                          </p>
                        </div>
                        {assignedMembers.length > 0 ? (
                          <div className="flex -space-x-2">
                            {assignedMembers.slice(0, 3).map((m, idx) => (
                              <div
                                key={idx}
                                title={m.name}
                                className="flex size-6 items-center justify-center rounded-full border-2 border-white dark:border-[#2A2A38] bg-primary/20 text-[9px] font-bold text-primary dark:text-[#818CF8] shadow-sm"
                              >
                                {initials(m.name)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 dark:text-[#6E6E80]">No team</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground/80 dark:text-[#9797A8]">
                          <span>{meta.label}</span>
                          <span>{project.progress}%</span>
                        </div>
                        <Progress value={project.progress} className="h-2 w-full bg-border/40 dark:bg-[#2A2A38]" />
                      </div>

                      <div className="mt-2 flex items-center justify-between border-t border-border/40 dark:border-[#2A2A38] pt-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/60 dark:text-[#6E6E80]">
                        <span className="flex items-center gap-1.5">
                          <FolderClock className="size-3.5" />
                          Due {formatDate(project.due_date)}
                        </span>
                        <span>{formatRelativeTime(project.created_at)}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Recent Messages Section */}
          <section className="flex flex-col gap-3">
            <CardHeader className="px-0 pb-0">
              <CardTitle className="text-lg">Recent messages</CardTitle>
              <CardDescription className="dark:text-[#9797A8]">
                Latest updates from clients and your team.
              </CardDescription>
            </CardHeader>

            {!recentMessages.length ? (
              <Card className="glass-card dark:border-[#2A2A38]">
                <CardContent className="p-8 text-center text-sm text-muted-foreground dark:text-[#9797A8] flex flex-col items-center gap-2">
                  <MessageSquareText className="size-8 text-muted-foreground/50" />
                  No messages yet — open a project to start communicating.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col overflow-hidden rounded-[24px] border border-border/40 dark:border-[#2A2A38] glass-card animate-slide-up-fade" style={{ animationDelay: '400ms' }}>
                {recentMessages.map((message, index) => (
                  <Link
                    key={message.id}
                    href={`/projects/${message.project_id}`}
                    className={`group flex items-start justify-between gap-4 p-5 transition-all hover:bg-[#1E1E28] ${
                      index > 0 ? "border-t border-border/40 dark:border-[#2A2A38]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold">
                        <span className="text-foreground/90 dark:text-[#F4F4F6]">{message.sender_name}</span>
                        <span className="text-muted-foreground/60 dark:text-[#9797A8] font-medium">
                          {" "}
                          on {message.project_name}
                        </span>
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground dark:text-[#9797A8] group-hover:text-foreground/80 dark:group-hover:text-[#F4F4F6] transition-colors">
                        {message.body}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/50 dark:text-[#6E6E80]">
                      {formatMessageTime(message.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {/* Upcoming Deadlines */}
          <section className="flex flex-col gap-3">
            <CardHeader className="px-0 pb-0">
              <CardTitle className="text-lg">Upcoming deadlines</CardTitle>
            </CardHeader>
            {!combinedDeadlines.length ? (
              <Card className="glass-card dark:border-[#2A2A38]">
                <CardContent className="p-8 text-center text-sm text-muted-foreground dark:text-[#9797A8] flex flex-col items-center gap-2">
                  <CheckCircle2 className="size-8 text-muted-foreground/50" />
                  No upcoming deadlines — everything is up to date!
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3 animate-slide-up-fade" style={{ animationDelay: '500ms' }}>
                {combinedDeadlines.map((item) => (
                  <div
                    key={item.id}
                    className="group flex flex-col gap-2 rounded-[20px] border border-border/40 dark:border-[#2A2A38] glass-card glass-card-hover p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-bold text-foreground/90 dark:text-[#F4F4F6]">
                        {item.title}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 dark:text-[#9797A8]">
                      <span className="truncate text-muted-foreground/60 dark:text-[#6E6E80]">{item.project_name}</span>
                      <div className="flex items-center gap-1.5 text-warning dark:text-[#FBBF24]">
                        <FolderClock className="size-3.5" />
                        <span>{formatDate(item.due_date)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
          
          {/* Today's Activity */}
          <section className="flex flex-col gap-3">
            <CardHeader className="px-0 pb-0">
              <CardTitle className="text-lg">Today&apos;s Activity</CardTitle>
            </CardHeader>
            {!activityFeed.length ? (
              <Card className="glass-card dark:border-[#2A2A38]">
                <CardContent className="p-8 text-center text-sm text-muted-foreground dark:text-[#9797A8] flex flex-col items-center gap-2">
                  <Activity className="size-8 text-muted-foreground/50" />
                  No activity recorded today yet.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-5 rounded-[24px] border border-border/40 dark:border-[#2A2A38] glass-card p-6 animate-slide-up-fade" style={{ animationDelay: '600ms' }}>
                {activityFeed.map((item, idx) => (
                  <div key={item.id || idx} className="flex gap-4">
                    <div className="relative mt-1 flex size-3 shrink-0 items-center justify-center">
                      <span className="absolute size-full animate-ping rounded-full bg-primary opacity-20"></span>
                      <span className="relative size-2 rounded-full bg-primary dark:bg-[#818CF8]"></span>
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="text-sm font-bold text-foreground/90 dark:text-[#F4F4F6] truncate">{item.title}</p>
                      {item.details && (
                        <p className="text-xs font-medium text-muted-foreground/80 dark:text-[#9797A8] truncate">{item.details}</p>
                      )}
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 dark:text-[#6E6E80]">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}