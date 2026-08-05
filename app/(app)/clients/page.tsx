import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { ClientTable } from "@/components/clients/client-table"
import { computeClientStats, getClientsWithStats } from "@/lib/clients"
import { hasPermission } from "@/lib/permissions"
import type { ProjectStatus } from "@/lib/portal-types"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!hasPermission(user.role, "clients.view")) redirect("/dashboard")

  const supabase = await createClient()
  const [clients, projects] = await Promise.all([
    getClientsWithStats(),
    supabase
      .from("projects")
      .select<"status", { status: string }>("status"),
  ])

  const statuses = (projects.data ?? []).map(
    (p) => p.status as ProjectStatus
  )
  const stats = computeClientStats(clients, statuses)

  return <ClientTable clients={clients} stats={stats} />
}