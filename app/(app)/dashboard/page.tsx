import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { fetchLiveDashboardData } from "@/lib/dashboard-data"
import { DashboardView } from "@/components/dashboard/dashboard-view"
import { DashboardRealtimeSync } from "@/components/dashboard/dashboard-live"
import { relativeTime } from "@/lib/crm"
import {
  NeedsAttentionSection,
  type OverdueInvoiceItem,
  type AtRiskClientItem,
  type TeamMemberWorkloadItem,
} from "@/components/dashboard/needs-attention-section"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }
  if (user.role !== "team") {
    redirect("/projects")
  }

  // Fetch live dashboard data
  const liveData = await fetchLiveDashboardData()

  // Needs Attention calculations
  let overdueInvoiceList: OverdueInvoiceItem[] = []
  let totalOverdueAmount = 0
  let atRiskClientList: AtRiskClientItem[] = []
  let teamWorkloadList: TeamMemberWorkloadItem[] = []
  let averageWorkload = 0

  const todayStr = new Date().toISOString().split("T")[0]

  try {
    const [
      { data: rawInvoices },
      { data: rawClients },
      { data: teamMembersList },
      { data: rawUnfinishedTasks },
    ] = await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, amount, due_date, status, clients(name, company), projects(name)")
        .neq("status", "paid")
        .lt("due_date", todayStr)
        .order("due_date", { ascending: true }),
      supabase
        .from("clients")
        .select("id, name, company, created_at, projects(id, name, status, updated_at)"),
      supabase
        .from("team_members")
        .select("id, name, role"),
      supabase
        .from("project_tasks")
        .select("id, assignee_id, status")
        .neq("status", "done"),
    ])

    if (rawInvoices) {
      const todayMs = new Date().getTime()
      overdueInvoiceList = rawInvoices.map((inv: any) => {
        const amt = Number(inv.amount ?? 0)
        totalOverdueAmount += amt
        const dueMs = new Date(inv.due_date).getTime()
        const daysOverdue = Math.max(1, Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24)))
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          client_name: inv.clients?.company || inv.clients?.name || "Client",
          project_name: inv.projects?.name || "Project",
          amount: amt,
          due_date: inv.due_date,
          days_overdue: daysOverdue,
        }
      })
    }

    if (rawClients) {
      const twentyOneDaysAgoIso = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
      atRiskClientList = rawClients
        .map((client: any) => {
          const clientProjects = client.projects ?? []
          const activeProjects = clientProjects.filter((p: any) => p.status !== "completed")
          if (activeProjects.length === 0) return null

          let latestUpdate = client.created_at
          for (const p of clientProjects) {
            if (p.updated_at && p.updated_at > latestUpdate) {
              latestUpdate = p.updated_at
            }
          }

          const isStagnant = latestUpdate < twentyOneDaysAgoIso
          if (!isStagnant) return null

          return {
            id: client.id,
            name: client.name,
            company: client.company,
            risk_reason: `No activity for 21+ days (${activeProjects.length} active projects)`,
            last_activity: relativeTime(latestUpdate),
          }
        })
        .filter(Boolean) as AtRiskClientItem[]
    }

    if (teamMembersList) {
      const unfinishedTasks = rawUnfinishedTasks ?? []
      const taskCountMap = new Map<string, number>()
      for (const t of unfinishedTasks) {
        if (t.assignee_id) {
          taskCountMap.set(t.assignee_id, (taskCountMap.get(t.assignee_id) ?? 0) + 1)
        }
      }

      let totalTasks = 0
      teamWorkloadList = teamMembersList.map((m: any) => {
        const count = taskCountMap.get(m.id) ?? 0
        totalTasks += count
        return {
          id: m.id,
          name: m.name,
          active_count: count,
          is_overloaded: count > 10,
        }
      })

      if (teamMembersList.length > 0) {
        averageWorkload = Math.round(totalTasks / teamMembersList.length)
      }
    }
  } catch {
    // fallback gracefully
  }

  const hasNeedsAttention =
    overdueInvoiceList.length > 0 ||
    atRiskClientList.length > 0 ||
    teamWorkloadList.some((t) => t.active_count > 10)

  return (
    <div>
      <DashboardRealtimeSync />
      <DashboardView
        metrics={liveData.metrics}
        pipelineStages={liveData.pipelineStages}
        revenueChartData={liveData.revenueChartData}
        activities={liveData.activities}
        deals={liveData.deals}
        needsAttentionSection={
          hasNeedsAttention ? (
            <NeedsAttentionSection
              overdueInvoices={overdueInvoiceList}
              totalOverdueAmount={totalOverdueAmount}
              atRiskClients={atRiskClientList}
              teamWorkload={teamWorkloadList}
              averageWorkload={averageWorkload}
            />
          ) : undefined
        }
      />
    </div>
  )
}