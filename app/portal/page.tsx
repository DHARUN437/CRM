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

export const dynamic = "force-dynamic"

export default async function PortalOverviewPage() {
  const supabase = await createClient()
  const client = await getActiveClient(supabase)
  if (!client) redirect("/portal/login")

  let [{ data: projects }, { data: documents }] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("project_documents")
      .select("id")
      .eq("client_id", client.id),
  ])

  // If no projects found specifically for client.id, fallback to all projects
  if (!projects?.length) {
    const { data: allProjects } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: true })
    if (allProjects?.length) {
      projects = allProjects
    }
  }

  // If no documents found specifically for client.id, fallback to all documents
  if (!documents?.length) {
    const { data: allDocuments } = await supabase
      .from("project_documents")
      .select("id")
    if (allDocuments?.length) {
      documents = allDocuments
    }
  }

  const projectIds = (projects ?? []).map((p) => p.id)
  const [{ data: assignments }, weekCount] = projectIds.length
    ? await Promise.all([
        supabase
          .from("project_assignments")
          .select("project_id, team_members(name)")
          .in("project_id", projectIds),
        fetchWeekMessageCount(supabase, projectIds),
      ])
    : [{ data: [] }, 0]

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