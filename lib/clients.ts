import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import type { ClientPaymentRow, ClientProfile, ProjectStatus } from "@/lib/portal-types"

export interface ClientProjectSummary {
  id: string
  name: string
  status: string
  progress: number
}

export interface ClientWithStats extends ClientProfile {
  projectCount: number
  projects: ClientProjectSummary[]
}

export interface ClientStats {
  totalClients: number
  activeProjects: number
  newThisMonth: number
}

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

/**
 * Fetch simplified client list for dropdown select boxes (with admin fallback).
 */
export async function getClientsForSelect(): Promise<{ id: string; name: string; company: string | null }[]> {
  const supabase = await createClient()

  let { data: clients } = await supabase
    .from("clients")
    .select("id, name, company")
    .order("name", { ascending: true })

  if ((!clients || clients.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = getAdminClient()
    if (admin) {
      const { data: adminClients } = await admin
        .from("clients")
        .select("id, name, company")
        .order("name", { ascending: true })
      if (adminClients && adminClients.length > 0) {
        clients = adminClients
      }
    }
  }

  return (clients ?? []) as { id: string; name: string; company: string | null }[]
}

/**
 * Fetch clients with their project counts in one place.
 * Pages and components should call this instead of querying Supabase directly.
 */
export async function getClientsWithStats(): Promise<ClientWithStats[]> {
  const supabase = await createClient()

  let { data: clients } = await supabase
    .from("clients")
    .select("id, user_id, name, company, email, phone, created_at")
    .order("created_at", { ascending: false })

  // If RLS returns empty data, try admin client as a fallback
  if ((!clients || clients.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = getAdminClient()
    if (admin) {
      const { data: adminClients } = await admin
        .from("clients")
        .select("id, user_id, name, company, email, phone, created_at")
        .order("created_at", { ascending: false })
      if (adminClients && adminClients.length > 0) {
        clients = adminClients
      }
    }
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, client_id, name, status, progress")

  const projectCounts = new Map<string, number>()
  const projectsByClient = new Map<string, ClientProjectSummary[]>()
  for (const p of projects ?? []) {
    projectCounts.set(p.client_id, (projectCounts.get(p.client_id) ?? 0) + 1)
    const list = projectsByClient.get(p.client_id) ?? []
    list.push({
      id: p.id,
      name: p.name,
      status: p.status,
      progress: Number(p.progress ?? 0),
    })
    projectsByClient.set(p.client_id, list)
  }

  return (clients ?? []).map((client) => ({
    ...client,
    projectCount: projectCounts.get(client.id) ?? 0,
    projects: projectsByClient.get(client.id) ?? [],
  }))
}

export function computeClientStats(
  clients: ClientWithStats[],
  projectStatuses: ProjectStatus[]
): ClientStats {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const activeProjects = projectStatuses.filter((s) => s !== "completed").length
  const newThisMonth = clients.filter((c) => new Date(c.created_at) >= monthStart).length

  return {
    totalClients: clients.length,
    activeProjects,
    newThisMonth,
  }
}

export interface RichClientProfile {
  client: ClientProfile
  projects: {
    id: string
    name: string
    description: string | null
    status: string
    progress: number
    tech_stack: string[]
    start_date: string | null
    due_date: string | null
    created_at: string
  }[]
  documents: {
    id: string
    name: string
    file_type: string
    file_size: number
    created_at: string
    project_id: string
    project_name?: string
    file_path?: string
  }[]
  notes: {
    id: string
    client_id: string
    author_id: string
    body: string
    created_at: string
    author_name?: string
  }[]
  payments: ClientPaymentRow[]
  openTasksCount: number
}

/**
 * Service function returning a rich client object (client info, counts, related projects, docs, notes, open tasks).
 */
export async function getClientProfileDetails(id: string): Promise<RichClientProfile | null> {
  const supabase = await createClient()

  let clientRes = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  let client = clientRes.data

  if (!client && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = getAdminClient()
    if (admin) {
      const { data: adminClient } = await admin
        .from("clients")
        .select("*")
        .eq("id", id)
        .single()
      client = adminClient
    }
  }

  if (!client) return null

  const [{ data: projects }, { data: documents }, { data: notes }, { data: paymentRows }] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          "id, name, description, status, progress, tech_stack, start_date, due_date, created_at"
        )
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_documents")
        .select("id, name, file_type, file_size, created_at, project_id, file_path")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("client_notes")
        .select("*, team_members(name)")
        .eq("client_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoice_payments")
        .select("*, invoices!inner(invoice_number, project_id, projects(name))")
        .eq("invoices.client_id", id)
        .order("created_at", { ascending: false }),
    ])

  const projectRows = (projects ?? []) as RichClientProfile["projects"]
  const projectIds = projectRows.map((p) => p.id)

  let openTasksCount = 0
  if (projectIds.length > 0) {
    const { count } = await supabase
      .from("project_tasks")
      .select("*", { count: "exact", head: true })
      .in("project_id", projectIds)
      .neq("status", "done")
    openTasksCount = count ?? 0
  }

  const projectMap = new Map(projectRows.map((p) => [p.id, p.name]))
  const documentRows = (documents ?? []).map((d: Record<string, unknown>) => ({
    id: d.id as string,
    name: d.name as string,
    file_type: d.file_type as string,
    file_size: Number(d.file_size ?? 0),
    created_at: d.created_at as string,
    project_id: d.project_id as string,
    project_name: projectMap.get(d.project_id as string),
    file_path: d.file_path as string | undefined,
  }))

  const noteRows = (notes ?? []).map((n: Record<string, unknown>) => ({
    id: n.id as string,
    client_id: n.client_id as string,
    author_id: n.author_id as string,
    body: n.body as string,
    created_at: n.created_at as string,
    author_name: (n.team_members as { name: string } | null)?.name ?? undefined,
  }))

  const paymentRowsMapped = (paymentRows ?? []).map((p: Record<string, unknown>) => {
    const inv = p.invoices as
      | { invoice_number: string; projects: { name: string } | null }
      | null
    return {
      id: p.id as string,
      invoice_id: p.invoice_id as string,
      amount: Number(p.amount),
      method: p.method as ClientPaymentRow["method"],
      notes: (p.notes as string) || null,
      created_at: p.created_at as string,
      invoice_number: inv?.invoice_number ?? "—",
      project_name: inv?.projects?.name ?? undefined,
    }
  })

  return {
    client: client as ClientProfile,
    projects: projectRows,
    documents: documentRows,
    notes: noteRows,
    payments: paymentRowsMapped,
    openTasksCount,
  }
}