import type { SupabaseClient } from "@supabase/supabase-js"
import type { Project, ProjectDocument, Invoice } from "@/lib/portal-types"

/**
 * Fetch the current client's projects. RLS scopes rows to the signed-in user,
 * so the caller's session is the only access boundary.
 */
export async function getPortalProjects(
  supabase: SupabaseClient,
  clientId: string
): Promise<Project[]> {
  try {
    const { data: projects } = await supabase
      .from("projects")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })
    return (projects ?? []) as Project[]
  } catch (err) {
    console.error("Error in getPortalProjects:", err)
    return []
  }
}

/**
 * Fetch the current client's documents. RLS scopes rows to the signed-in user.
 */
export async function getPortalDocuments(
  supabase: SupabaseClient,
  clientId: string
): Promise<ProjectDocument[]> {
  try {
    const { data: documents } = await supabase
      .from("project_documents")
      .select("*, projects(name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
    return (documents ?? []) as unknown as ProjectDocument[]
  } catch (err) {
    console.error("Error in getPortalDocuments:", err)
    return []
  }
}

/**
 * Fetch project team assignments. RLS scopes rows to the signed-in user.
 */
export async function getPortalAssignments(
  supabase: SupabaseClient,
  projectIds: string[]
): Promise<Map<string, { name: string }[]>> {
  const teams = new Map<string, { name: string }[]>()
  if (!projectIds.length) return teams

  try {
    const { data: assignments } = await supabase
      .from("project_assignments")
      .select("project_id, team_members(name)")
      .in("project_id", projectIds)

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
  } catch (err) {
    console.error("Error in getPortalAssignments:", err)
  }

  return teams
}

/**
 * Fetch the current client's invoices. RLS scopes rows to the signed-in user.
 */
export async function getPortalInvoices(
  supabase: SupabaseClient,
  clientId: string
): Promise<Invoice[]> {
  try {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
    return (invoices ?? []) as Invoice[]
  } catch (err) {
    console.error("Error in getPortalInvoices:", err)
    return []
  }
}
