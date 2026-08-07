import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
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

import {
  getPortalProjects,
  getPortalAssignments,
} from "@/lib/supabase/portal-data"

export const dynamic = "force-dynamic"

export default async function PortalProjectsPage() {
  const supabase = await createClient()
  const client = await getActiveClient(supabase)
  if (!client) redirect("/portal/login")

  const projects = await getPortalProjects(supabase, client.id)
  const projectIds = projects.map((p) => p.id)
  const teams = await getPortalAssignments(supabase, projectIds)

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
