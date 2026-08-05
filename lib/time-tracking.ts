import { createClient } from "@/lib/supabase/server"
import type { TimeEntry } from "@/lib/portal-types"

export async function getProjectTimeEntries(projectId: string): Promise<TimeEntry[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("time_entries")
    .select("*, project_tasks(title), team_members(name)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  return (data ?? []).map((entry: Record<string, unknown>) => ({
    id: entry.id as string,
    project_id: entry.project_id as string,
    task_id: (entry.task_id as string) || null,
    user_id: entry.user_id as string,
    hours: Number(entry.hours),
    description: (entry.description as string) || null,
    logged_at: entry.logged_at as string,
    created_at: entry.created_at as string,
    task_title: (entry.project_tasks as { title: string } | null)?.title,
    user_name: (entry.team_members as { name: string } | null)?.name || "Team Member",
  }))
}
