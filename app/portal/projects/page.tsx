import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
import { NoClientNotice } from "@/components/portal/no-client-notice"
import { ProjectCard } from "@/components/portal/project-card"
import { ProjectStatusLegend } from "@/components/portal/project-status-legend"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FolderKanban } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function PortalProjectsPage() {
  const supabase = await createClient()
  const client = await getActiveClient(supabase)

  if (!client) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/portal/login")
    return <NoClientNotice email={user.email} />
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", client.id)
    .order("created_at", { ascending: true })

  const projectIds = (projects ?? []).map((p) => p.id)

  const { data: assignments } = projectIds.length
    ? await supabase
        .from("project_assignments")
        .select("project_id, team_members(name)")
        .in("project_id", projectIds)
    : { data: [] }

  const teams = new Map<string, { name: string }[]>()
  for (const a of assignments ?? []) {
    const raw = (a as unknown as { project_id: string; team_members: { name: string } | { name: string }[] | null }).team_members
    if (!raw) continue
    const members = Array.isArray(raw) ? raw : [raw]
    const list = teams.get(a.project_id) ?? []
    for (const m of members) {
      if (m && typeof m === "object" && "name" in m && m.name) {
        list.push({ name: String(m.name) })
      }
    }
    teams.set(a.project_id, list)
  }

  const active = (projects ?? []).filter((p) => p.status !== "completed").length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          Your projects
        </h2>
        <p className="text-sm text-muted-foreground">
          {active} active project{active === 1 ? "" : "s"} — track progress, your
          team and delivery dates.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-4">
          <p className="text-sm font-medium">Status guide</p>
          <ProjectStatusLegend />
        </CardContent>
      </Card>

      {!projects?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <FolderKanban className="size-10 text-muted-foreground/50" />
            No projects yet — check back soon.
          </CardContent>
        </Card>
      ) : (
        <section className="flex flex-col gap-4">
          <CardHeader className="px-0 pb-0">
            <CardTitle className="text-lg">All engagements</CardTitle>
            <CardDescription>
              Click any project to see its status, your team, chat and
              documents.
            </CardDescription>
          </CardHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                team={teams.get(project.id) ?? []}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
