import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
import { fetchWeekMessageCount } from "@/lib/messages"
import { ProjectCard } from "@/components/portal/project-card"
import { FolderKanban, FileUp, MessageSquareText, CheckCircle2 } from "lucide-react"
import {
  getPortalProjects,
  getPortalDocuments,
  getPortalAssignments,
} from "@/lib/supabase/portal-data"

import { KPICards } from "@/components/portal/kpi-cards"
import { QuickActions } from "@/components/portal/quick-actions"
import { ActivityFeed } from "@/components/portal/activity-feed"
import { EmptyState } from "@/components/portal/empty-state"

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
      label: "Active Projects",
      value: projects?.length ?? 0,
      icon: <FolderKanban className="size-6" />,
      trend: "up" as const,
      trendValue: "12%",
    },
    {
      label: "Shared Documents",
      value: documents?.length ?? 0,
      icon: <FileUp className="size-6" />,
      trend: "up" as const,
      trendValue: "4%",
    },
    {
      label: "Pending Approvals",
      value: 1, // Mocked for design
      icon: <CheckCircle2 className="size-6" />,
      trend: "down" as const,
      trendValue: "2",
    },
    {
      label: "New Messages",
      value: myMessages,
      icon: <MessageSquareText className="size-6" />,
      trend: "neutral" as const,
      trendValue: "0",
    },
  ]

  return (
    <div className="flex flex-col gap-10 pb-20 sm:pb-0">
      {/* Welcome Section */}
      <section className="flex flex-col gap-2 pt-4">
        <hr className="w-12 border-t-2 border-primary/20 mb-4" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Good Afternoon, <br className="sm:hidden" />
          <span className="text-primary">{client.company || client.name}</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Here's your project workspace.
        </p>
        <hr className="w-full border-t border-border mt-6 mb-2" />
      </section>

      {/* KPI Cards & Quick Actions */}
      <section className="flex flex-col gap-4">
        <KPICards stats={stats} />
        <QuickActions />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <section className="xl:col-span-2 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Active Projects</h2>
          </div>

          {!projects?.length ? (
            <EmptyState 
              title="No active projects"
              description="You don't have any projects currently in progress. Start a new one to get going!"
              icon={<FolderKanban className="size-8" />}
              action={{ label: "Start Project", href: "#" }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

        <section className="flex flex-col gap-6">
          <ActivityFeed />
        </section>
      </div>
    </div>
  )
}