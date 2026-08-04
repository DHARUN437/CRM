import type { SupabaseClient } from "@supabase/supabase-js"
import type { ProjectMessage } from "@/lib/portal-types"

/**
 * Fetch chat messages for one project, enriched with sender names/roles.
 */
export async function fetchMessages(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectMessage[]> {
  const { data: messages } = await supabase
    .from("project_messages")
    .select("id, project_id, sender_id, body, created_at, attachment_url, attachment_name, attachment_type, attachment_size")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })

  if (!messages?.length) return []

  const [{ data: members }, { data: clients }] = await Promise.all([
    supabase.from("team_members").select("user_id, name, role"),
    supabase.from("clients").select("user_id, name, company"),
  ])

  const memberMap = new Map(
    (members ?? []).map((m) => [m.user_id, { name: m.name, role: m.role }])
  )
  const clientMap = new Map(
    (clients ?? []).map((c) => [
      c.user_id,
      { name: c.company ?? c.name, role: "client" as const },
    ])
  )

  return messages.map((m) => {
    const sender = memberMap.get(m.sender_id) ?? clientMap.get(m.sender_id)
    return {
      ...m,
      sender_name: sender?.name,
      sender_role: sender?.role,
    }
  })
}

/**
 * Message counts per project, for list views.
 */
export async function fetchMessageCounts(
  supabase: SupabaseClient,
  projectIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (!projectIds.length) return counts

  const { data } = await supabase
    .from("project_messages")
    .select("project_id")
    .in("project_id", projectIds)

  for (const row of data ?? []) {
    counts.set(row.project_id, (counts.get(row.project_id) ?? 0) + 1)
  }
  return counts
}

/**
 * Count of chat messages within the last 7 days for the given projects.
 * Server-only; the cutoff is computed inside the helper so page renders stay pure.
 */
export async function fetchWeekMessageCount(
  supabase: SupabaseClient,
  projectIds: string[]
): Promise<number> {
  if (!projectIds.length) return 0
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from("project_messages")
    .select("id", { count: "exact", head: true })
    .in("project_id", projectIds)
    .gt("created_at", since)
  return count ?? 0
}

interface RecentMessage {
  id: string
  project_id: string
  project_name: string
  sender_id: string
  sender_name: string
  sender_role: "team" | "worker" | "client"
  body: string
  created_at: string
}

/**
 * Latest chat messages (optionally scoped to given projects) with sender
 * and project names resolved.
 */
export async function fetchRecentMessages(
  supabase: SupabaseClient,
  projectIds: string[] | null,
  limit = 8
): Promise<RecentMessage[]> {
  let query = supabase
    .from("project_messages")
    .select("id, project_id, projects(name), sender_id, body, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (projectIds?.length) query = query.in("project_id", projectIds)

  const { data } = await query
  if (!data?.length) return []

  const [{ data: members }, { data: clients }] = await Promise.all([
    supabase.from("team_members").select("user_id, name, role"),
    supabase.from("clients").select("user_id, name, company"),
  ])

  const memberMap = new Map(
    (members ?? []).map((m) => [m.user_id, { name: m.name, role: m.role }])
  )
  const clientMap = new Map(
    (clients ?? []).map((c) => [
      c.user_id,
      { name: c.company ?? c.name, role: "client" as const },
    ])
  )

  return data.map((m) => {
    const sender = memberMap.get(m.sender_id) ?? clientMap.get(m.sender_id)
    return {
      id: m.id,
      project_id: m.project_id,
      project_name:
        (m.projects as unknown as { name: string } | null)?.name ?? "Project",
      sender_id: m.sender_id,
      sender_name: sender?.name ?? "Unknown",
      sender_role: sender?.role ?? "team",
      body: m.body,
      created_at: m.created_at,
    }
  })
}