import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
import { fetchWeekMessageCount } from "@/lib/messages"
import { NoClientNotice } from "@/components/portal/no-client-notice"
import { ProjectCard } from "@/components/portal/project-card"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderKanban, FileUp, MessageSquareText, CheckCircle2 } from "lucide-react"

import {
  getPortalProjects,
  getPortalDocuments,
  getPortalAssignments,
} from "@/lib/supabase/portal-data"

export const dynamic = "force-dynamic"

export default async function PortalOverviewPage() {
  const supabase = await createClient()
  const client = await getActiveClient(supabase)
  if (!client) redirect("/portal/login")

  const [projects, documents] = await Promise.all([
    getPortalProjects(supabase, client.id),
    getPortalDocuments(supabase, client.id),
  ])

  const projectIds = projects.map((p) => p.id)
  const [teams, weekCount] = await Promise.all([
    getPortalAssignments(supabase, projectIds),
    fetchWeekMessageCount(supabase, projectIds),
  ])

  const myMessages = weekCount

  const stats = [
    {
      label: "Active projects",
      value: projects?.length ?? 0,
      icon: FolderKanban,
    },
    {
      label: "Documents shared",
      value: documents?.length ?? 0,
      icon: FileUp,
    },
    {
      label: "Messages this week",
      value: myMessages,
      icon: MessageSquareText,
    },
    {
      label: "Completed projects",
      value: projects?.filter((p) => p.status === "completed").length ?? 0,
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Welcome back{client?.company ? `, ${client.company}` : ""}
        </p>
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          Here&apos;s what&apos;s happening with your projects
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

      <section className="flex flex-col gap-4">
        <CardHeader className="px-0 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Your projects</CardTitle>
            <Badge variant="outline" className="text-xs">
              Updated in real time
            </Badge>
          </div>
          <CardDescription>
            Status, progress and messages for your ongoing engagements.
          </CardDescription>
        </CardHeader>

        {!projects?.length ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No projects yet — check back soon.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                team={teams.get(project.id) ?? []}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}