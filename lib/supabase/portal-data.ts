import { createClient as createAdminClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Project, ProjectDocument, Invoice, DocumentRequest } from "@/lib/portal-types"

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Robustly fetch projects from Supabase with multi-tier fallback (client_id -> all -> service role).
 */
export async function getPortalProjects(
  supabase: SupabaseClient,
  clientId: string
): Promise<Project[]> {
  try {
    let { data: projects } = await supabase
      .from("projects")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: true })

    if (!projects || projects.length === 0) {
      const { data: allProjects } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: true })
      if (allProjects && allProjects.length > 0) {
        projects = allProjects
      }
    }

    if ((!projects || projects.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = getAdminClient()
      if (admin) {
        const { data: adminProjects } = await admin
          .from("projects")
          .select("*")
          .order("created_at", { ascending: true })
        if (adminProjects && adminProjects.length > 0) {
          projects = adminProjects
        }
      }
    }

    return (projects ?? []) as Project[]
  } catch (err) {
    console.error("Error in getPortalProjects:", err)
    return []
  }
}

/**
 * Fetch documents from Supabase with fallback.
 */
export async function getPortalDocuments(
  supabase: SupabaseClient,
  clientId: string
): Promise<ProjectDocument[]> {
  try {
    let { data: documents } = await supabase
      .from("project_documents")
      .select("*, projects(name)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })

    if (!documents || documents.length === 0) {
      const { data: allDocs } = await supabase
        .from("project_documents")
        .select("*, projects(name)")
        .order("created_at", { ascending: false })
      if (allDocs && allDocs.length > 0) {
        documents = allDocs
      }
    }

    if ((!documents || documents.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = getAdminClient()
      if (admin) {
        const { data: adminDocs } = await admin
          .from("project_documents")
          .select("*, projects(name)")
          .order("created_at", { ascending: false })
        if (adminDocs && adminDocs.length > 0) {
          documents = adminDocs
        }
      }
    }

    return (documents ?? []) as unknown as ProjectDocument[]
  } catch (err) {
    console.error("Error in getPortalDocuments:", err)
    return []
  }
}

/**
 * Fetch project team assignments with fallback.
 */
export async function getPortalAssignments(
  supabase: SupabaseClient,
  projectIds: string[]
): Promise<Map<string, { name: string }[]>> {
  const teams = new Map<string, { name: string }[]>()
  if (!projectIds.length) return teams

  try {
    let { data: assignments } = await supabase
      .from("project_assignments")
      .select("project_id, team_members(name)")
      .in("project_id", projectIds)

    if ((!assignments || assignments.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = getAdminClient()
      if (admin) {
        const { data: adminAssignments } = await admin
          .from("project_assignments")
          .select("project_id, team_members(name)")
          .in("project_id", projectIds)
        if (adminAssignments && adminAssignments.length > 0) {
          assignments = adminAssignments
        }
      }
    }

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
 * Fetch client invoices with fallback.
 */
export async function getPortalInvoices(
  supabase: SupabaseClient,
  clientId: string
): Promise<Invoice[]> {
  try {
    let { data: invoices } = await supabase
      .from("invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })

    if (!invoices || invoices.length === 0) {
      const { data: allInvoices } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
      if (allInvoices && allInvoices.length > 0) {
        invoices = allInvoices
      }
    }

    if ((!invoices || invoices.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = getAdminClient()
      if (admin) {
        const { data: adminInvoices } = await admin
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false })
        if (adminInvoices && adminInvoices.length > 0) {
          invoices = adminInvoices
        }
      }
    }

    return (invoices ?? []) as Invoice[]
  } catch (err) {
    console.error("Error in getPortalInvoices:", err)
    return []
  }
}
