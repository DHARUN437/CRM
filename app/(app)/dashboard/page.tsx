import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getCurrentUser } from "@/lib/supabase/session"
import { fetchRecentMessages } from "@/lib/messages"
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
} from "lucide-react"
import {
  PROJECT_STATUS_META,
  formatDate,
  formatMessageTime,
  type ProjectStatus,
} from "@/lib/portal-types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const isWorker = user.role === "worker"
  const isTL = user.role === "tl"
  const isAdmin = user.role === "team"

  // Resolve the worker/TL's team member id for filtering.
  const { data: myMember } = (isWorker || isTL)
    ? await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null }

  let projectIdsForWorker: string[] | null = null
  if (isWorker && myMember) {
    const { data: assigned } = await supabase
      .from("project_assignments")
      .select("project_id")
      .eq("team_member_id", myMember.id)
    projectIdsForWorker = (assigned ?? []).map((a) => a.project_id)
  }

  let projectsQuery = supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: true })

  if (isWorker && projectIdsForWorker) {
    projectsQuery = projectsQuery.in("id", projectIdsForWorker)
  } else if (isTL && myMember) {
    projectsQuery = projectsQuery.eq("tl_id", myMember.id)
  }

  let { data: projects } = await projectsQuery

  if ((!projects || projects.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (isAdmin) {
      const { data: adminProjects } = await admin
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true })
      if (adminProjects && adminProjects.length > 0) projects = adminProjects
    } else if (isTL && myMember) {
      const { data: adminProjects } = await admin
        .from("projects")
        .select("*")
        .eq("tl_id", myMember.id)
        .order("created_at", { ascending: true })
      if (adminProjects && adminProjects.length > 0) projects = adminProjects
    } else if (isWorker && projectIdsForWorker && projectIdsForWorker.length > 0) {
      const { data: adminProjects } = await admin
        .from("projects")
        .select("*")
        .in("id", projectIdsForWorker)
        .order("created_at", { ascending: true })
      if (adminProjects && adminProjects.length > 0) projects = adminProjects
    }
  }

  const all = (projects ?? []) as {
    id: string
    name: string
    status: string
    progress: number
    due_date: string | null
    created_at: string
  }[]
  const active = all.filter((p) => p.status !== "completed")
  const completed = all.filter((p) => p.status === "completed")
  const inProgress = all.filter((p) => p.status === "in_progress")

  const [{ data: documents }, { data: members }, recentMessages] =
    await Promise.all([
      supabase
        .from("project_documents")
        .select("id")
        .in(
          "project_id",
          all.length ? all.map((p) => p.id) : ["00000000-0000-0000-0000-000000000000"]
        ),
      (isWorker || isTL)
        ? { data: [] }
        : supabase.from("team_members").select("id"),
      fetchRecentMessages(
        supabase,
        isWorker
          ? (projectIdsForWorker ?? [])
          : isTL
          ? all.map((p) => p.id)
          : null,
        6
      ),
    ])

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

  const upcoming = [...active]
    .filter((p) => p.due_date)
    .sort((a, b) => (a.due_date! > b.due_date! ? 1 : -1))
    .slice(0, 5)

  const statusBreakdown = (Object.keys(PROJECT_STATUS_META) as ProjectStatus[])
    .map((status) => ({
      status,
      count: all.filter((p) => p.status === status).length,
    }))
    .filter((s) => s.count > 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Welcome back{isAdmin ? ", boss" : ""} — {displayName}
        </p>
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          {isWorker
            ? "Here's what's on your plate"
            : isTL
            ? "Here's what's happening on projects you lead"
            : "Here's what's happening across your projects"}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
                <stat.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold tracking-tight">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2">
          <Button render={<Link href="/projects" />}>
            <Plus className="size-4" />
            New project
          </Button>
          <Button variant="outline" render={<Link href="/team" />}>
            <Users className="size-4" />
            Manage team
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {!all.length ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-muted-foreground">
                {isWorker
                  ? "No projects assigned to you yet."
                  : isTL
                  ? "No projects assigned to you as Team Lead yet."
                  : "No projects yet — create your first one."}
              </CardContent>
            </Card>
          ) : (
            <section className="flex flex-col gap-3">
              <CardHeader className="px-0 pb-0">
                <CardTitle className="text-lg">
                  {isWorker ? "My projects" : isTL ? "Projects you lead" : "Projects by status"}
                </CardTitle>
                {!isWorker && statusBreakdown.length > 0 && (
                  <CardDescription>
                    {statusBreakdown
                      .map((s) => `${PROJECT_STATUS_META[s.status].label}: ${s.count}`)
                      .join(" · ")}
                  </CardDescription>
                )}
              </CardHeader>

              <div className="flex flex-col gap-3">
                {active.slice(0, 6).map((project) => {
                  const meta =
                    PROJECT_STATUS_META[project.status as ProjectStatus]
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex flex-col gap-3 rounded-xl border border-foreground/10 bg-background p-4 transition-colors hover:border-foreground/25"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold">
                          {project.name}
                        </p>
                        <Badge className={meta.badge}>{meta.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Progress value={project.progress} className="h-1.5 flex-1" />
                        <span className="shrink-0 font-medium">
                          {project.progress}% · due {formatDate(project.due_date)}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          <section className="flex flex-col gap-3">
            <CardHeader className="px-0 pb-0">
              <CardTitle className="text-lg">Recent messages</CardTitle>
              <CardDescription>
                Latest updates from clients and your team.
              </CardDescription>
            </CardHeader>

            {!recentMessages.length ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No messages yet — open a project to start the conversation.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
                {recentMessages.map((message, index) => (
                  <Link
                    key={message.id}
                    href={`/projects/${message.project_id}`}
                    className={`flex items-start justify-between gap-4 bg-background p-4 transition-colors hover:bg-foreground/[0.03] ${
                      index > 0 ? "border-t border-foreground/10" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        <span className="font-medium">{message.sender_name}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {message.project_name}
                        </span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {message.body}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatMessageTime(message.created_at)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <CardHeader className="px-0 pb-0">
              <CardTitle className="text-lg">Upcoming deadlines</CardTitle>
            </CardHeader>
            {!upcoming.length ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Nothing due soon.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 px-4 py-3 transition-colors hover:border-foreground/25"
                  >
                    <p className="truncate text-sm font-medium">{project.name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(project.due_date)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}