import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { AddWorkerDialog } from "@/components/team/add-worker-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FolderKanban, ShieldPlus } from "lucide-react"
import type { TeamMember } from "@/lib/portal-types"

export const dynamic = "force-dynamic"

export default async function TeamPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) redirect("/login")
  if (user.role !== "team") redirect("/dashboard")

  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .order("created_at", { ascending: true })

  const teamMembers = (members as TeamMember[] | null) ?? []

  const workerIds = teamMembers
    .filter((m) => m.role === "worker")
    .map((m) => m.id)

  const { data: assignments } = workerIds.length
    ? await supabase
        .from("project_assignments")
        .select("project_id, team_member_id")
        .in("team_member_id", workerIds)
    : { data: [] }

  const counts = new Map<string, number>()
  for (const a of assignments ?? []) {
    counts.set(a.team_member_id, (counts.get(a.team_member_id) ?? 0) + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">
            Team
          </h2>
          <p className="text-sm text-muted-foreground">
            Workers get a login and will only see projects you assign them.
          </p>
        </div>
        <AddWorkerDialog />
      </div>

      {!teamMembers.length ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <ShieldPlus className="mx-auto mb-2 size-8 text-muted-foreground/50" />
            No team members yet. Add your first worker to start assigning
            projects.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-foreground/10">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-xs font-semibold">
                      {member.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-sm font-medium">{member.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                      <FolderKanban className="size-3.5" />
                      {counts.get(member.id) ?? 0} project
                      {(counts.get(member.id) ?? 0) === 1 ? "" : "s"}
                    </span>
                    <Badge variant={member.role === "team" ? "secondary" : "outline"}>
                      {member.role === "team" ? "Admin" : "Worker"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}