import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getCurrentUser } from "@/lib/supabase/session"
import { CreateProjectDialog } from "@/components/projects/create-project-dialog"
import { getClientsForSelect } from "@/lib/clients"
import { ProjectCard } from "@/components/projects/project-card"
import { Card, CardContent } from "@/components/ui/card"
import { FolderKanban, LoaderPinwheel, CheckCircle2, Users } from "lucide-react"
import { PROJECT_STATUS_META, formatDate, type ProjectStatus } from "@/lib/portal-types"

export const dynamic = "force-dynamic"

export default async function ProjectsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const isWorker = user.role === "worker"
  const isTL = user.role === "tl"
  const isAdmin = user.role === "team"

  // Resolve the current worker/TL's team_members row for filtering.
  const { data: myMember } = (isWorker || isTL)
    ? await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null }

  let projectQuery = supabase
    .from("projects")
    .select("*, clients(name, company)")
    .order("created_at", { ascending: false })

  if (isWorker && myMember) {
    projectQuery = supabase
      .from("projects")
      .select(
        "*, clients(name, company), project_assignments!inner(team_member_id)"
      )
      .eq("project_assignments.team_member_id", myMember.id)
      .order("created_at", { ascending: false })
  }

  if (isTL && myMember) {
    // TL sees projects where they are the TL
    projectQuery = supabase
      .from("projects")
      .select("*, clients(name, company)")
      .eq("tl_id", myMember.id)
      .order("created_at", { ascending: false })
  }

  let { data: projects } = await projectQuery

  if ((!projects || projects.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (isAdmin) {
      const { data: adminProjects } = await admin
        .from("projects")
        .select("*, clients(name, company)")
        .order("created_at", { ascending: false })
      if (adminProjects && adminProjects.length > 0) {
        projects = adminProjects
      }
    } else if (isTL && myMember) {
      const { data: adminProjects } = await admin
        .from("projects")
        .select("*, clients(name, company)")
        .eq("tl_id", myMember.id)
        .order("created_at", { ascending: false })
      if (adminProjects && adminProjects.length > 0) {
        projects = adminProjects
      }
    }
  }

  const projectIds = (projects ?? []).map((p) => p.id)
  const [{ data: assignments }, { data: teamLeads }, clientList] = await Promise.all([
    isAdmin
      ? supabase
          .from("project_assignments")
          .select("project_id, team_members(name, role)")
      : { data: [] },
    isAdmin
      ? supabase
          .from("team_members")
          .select("id, name")
          .eq("role", "tl")
          .order("name", { ascending: true })
      : { data: [] },
    isAdmin ? getClientsForSelect() : Promise.resolve([]),
  ])

  const assignmentCounts = new Map<string, number>()
  for (const a of assignments ?? []) {
    assignmentCounts.set(a.project_id, (assignmentCounts.get(a.project_id) ?? 0) + 1)
  }

  const stats = [
    {
      label: (isWorker || isTL) ? "Assigned projects" : "Total projects",
      value: projects?.length ?? 0,
      icon: FolderKanban,
    },
    {
      label: "In progress",
      value:
        projects?.filter((p) => p.status === "in_progress").length ?? 0,
      icon: LoaderPinwheel,
    },
    {
      label: "Completed",
      value: projects?.filter((p) => p.status === "completed").length ?? 0,
      icon: CheckCircle2,
    },
    {
      label: "On hold / Kickoff",
      value: projects?.filter((p) => p.status === "kickoff" || p.status === "on_hold").length ?? 0,
      icon: Users,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">
            {isTL ? "My Projects" : isWorker ? "My Projects" : "Projects"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isTL
              ? "Projects you lead — assign teammates and track their progress."
              : isWorker
              ? "Projects assigned to you — update their status as you work."
              : "Every engagement, its team and progress in one place."}
          </p>
        </div>
        {isAdmin && (
          <CreateProjectDialog
            clients={clientList}
            teamLeads={(teamLeads ?? []) as { id: string; name: string }[]}
          />
        )}
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

      {!projects?.length ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {isTL
              ? "No projects assigned to you as Team Lead yet."
              : isWorker
              ? "You haven't been assigned to any projects yet."
              : "No projects yet — create your first one."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const meta =
              PROJECT_STATUS_META[project.status as ProjectStatus]
            return (
              <ProjectCard
                key={project.id}
                id={project.id}
                name={project.name}
                client={project.clients?.company ?? project.clients?.name ?? "Client"}
                statusLabel={meta.label}
                statusBadge={meta.badge}
                progress={project.progress}
                dueDate={formatDate(project.due_date)}
                workers={assignmentCounts.get(project.id) ?? 0}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}