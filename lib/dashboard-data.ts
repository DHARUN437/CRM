import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { getAllInvoicesWithData } from "@/lib/invoices"
import { relativeTime } from "@/lib/crm"

export interface MetricCardData {
  id: string
  label: string
  value: string
  trend: string
  trendDirection: 'up' | 'down'
}

export interface StageData {
  id: string
  name: string
  count: number
  amount: string
  statusColor: 'accent' | 'warning' | 'success' | 'danger' | 'neutral'
}

export interface MonthlyRevenueData {
  month: string
  revenue: number
  target: number
}

export interface ActivityData {
  id: string
  type: string
  description: string
  timestamp: string
  user: {
    name: string
    avatar?: string
  }
}

export interface DealTableData {
  id: string
  company: string
  contact: string
  value: string
  stage: 'won' | 'lost' | 'pending' | 'archived'
  owner: {
    name: string
    avatar?: string
  }
  lastActivity: string
}

export interface DashboardLiveData {
  metrics: MetricCardData[]
  pipelineStages: StageData[]
  revenueChartData: MonthlyRevenueData[]
  activities: ActivityData[]
  deals: DealTableData[]
}

export async function fetchLiveDashboardData(): Promise<DashboardLiveData> {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    throw new Error("Unauthenticated")
  }

  // 1. Fetch Projects & Clients
  const { data: rawProjects } = await supabase
    .from("projects")
    .select("*, clients(name, company), team_members(name)")
    .order("updated_at", { ascending: false })

  const projects = rawProjects ?? []

  // 2. Fetch Invoices & Revenue with explicit error logging
  const { invoices } = await getAllInvoicesWithData().catch((err) => {
    console.error("Dashboard error fetching invoices via getAllInvoicesWithData:", err)
    return { invoices: [], paymentsByClient: new Map() }
  })

  const totalPaidRevenue = invoices.reduce((acc, inv) => acc + (inv.amount_paid || 0), 0)
  const activeProjects = projects.filter((p) => p.status !== "completed")
  const completedProjects = projects.filter((p) => p.status === "completed")

  const totalProjectsCount = projects.length || 1
  const winRatePercent = Math.round((completedProjects.length / totalProjectsCount) * 100)

  const totalBudgetSum = projects.reduce((acc, p) => acc + Number(p.budget || 0), 0)
  const avgDealSizeVal = projects.length > 0 ? Math.round(totalBudgetSum / projects.length) : 0

  // Month-over-Month historical comparison calculations
  const now = new Date()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const calculateTrend = (curr: number, prev: number): { trend: string; trendDirection: 'up' | 'down' } => {
    if (prev > 0) {
      const diff = Math.round(((curr - prev) / prev) * 100)
      return {
        trend: `${diff >= 0 ? '+' : ''}${diff}%`,
        trendDirection: diff >= 0 ? 'up' : 'down',
      }
    }
    if (curr > 0) {
      return { trend: `+${curr * 100}%`, trendDirection: 'up' }
    }
    return { trend: '+0%', trendDirection: 'up' }
  }

  // 1. Revenue trend
  const revenueThisMonth = invoices
    .filter((i) => i.created_at && i.created_at >= startOfThisMonth)
    .reduce((acc, i) => acc + (i.amount_paid || 0), 0)
  const revenueLastMonth = invoices
    .filter((i) => i.created_at && i.created_at >= startOfLastMonth && i.created_at < startOfThisMonth)
    .reduce((acc, i) => acc + (i.amount_paid || 0), 0)
  const revenueTrendMeta = calculateTrend(revenueThisMonth, revenueLastMonth)

  // 2. Active deals trend
  const projectsThisMonth = projects.filter((p) => p.created_at >= startOfThisMonth).length
  const projectsLastMonth = projects.filter((p) => p.created_at >= startOfLastMonth && p.created_at < startOfThisMonth).length
  const projectsTrendMeta = calculateTrend(projectsThisMonth, projectsLastMonth)

  // 3. Win rate trend
  const totalProjectsThisMonth = projectsThisMonth || 1
  const completedThisMonth = projects.filter((p) => p.created_at >= startOfThisMonth && p.status === 'completed').length
  const winRateThisMonth = Math.round((completedThisMonth / totalProjectsThisMonth) * 100)

  const totalProjectsLastMonth = projectsLastMonth || 1
  const completedLastMonth = projects.filter((p) => p.created_at >= startOfLastMonth && p.created_at < startOfThisMonth && p.status === 'completed').length
  const winRateLastMonth = Math.round((completedLastMonth / totalProjectsLastMonth) * 100)
  const winRateTrendMeta = calculateTrend(winRateThisMonth, winRateLastMonth)

  // 4. Avg deal size trend
  const projectsThisMonthList = projects.filter((p) => p.created_at >= startOfThisMonth)
  const avgDealThisMonth = projectsThisMonthList.length > 0
    ? projectsThisMonthList.reduce((acc, p) => acc + Number(p.budget || 0), 0) / projectsThisMonthList.length
    : 0

  const projectsLastMonthList = projects.filter((p) => p.created_at >= startOfLastMonth && p.created_at < startOfThisMonth)
  const avgDealLastMonth = projectsLastMonthList.length > 0
    ? projectsLastMonthList.reduce((acc, p) => acc + Number(p.budget || 0), 0) / projectsLastMonthList.length
    : 0
  const avgDealTrendMeta = calculateTrend(avgDealThisMonth, avgDealLastMonth)

  const metrics: MetricCardData[] = [
    {
      id: 'm1',
      label: 'total revenue',
      value: `$${totalPaidRevenue.toLocaleString()}`,
      trend: revenueTrendMeta.trend,
      trendDirection: revenueTrendMeta.trendDirection,
    },
    {
      id: 'm2',
      label: 'active leads & deals',
      value: activeProjects.length.toLocaleString(),
      trend: projectsTrendMeta.trend,
      trendDirection: projectsTrendMeta.trendDirection,
    },
    {
      id: 'm3',
      label: 'win rate',
      value: `${winRatePercent}%`,
      trend: winRateTrendMeta.trend,
      trendDirection: winRateTrendMeta.trendDirection,
    },
    {
      id: 'm4',
      label: 'avg deal size',
      value: `$${avgDealSizeVal.toLocaleString()}`,
      trend: avgDealTrendMeta.trend,
      trendDirection: avgDealTrendMeta.trendDirection,
    },
  ]

  // 3. Pipeline Stages Breakdown
  const stagesMap: Record<string, { count: number; total: number }> = {
    kickoff: { count: 0, total: 0 },
    in_progress: { count: 0, total: 0 },
    in_review: { count: 0, total: 0 },
    on_hold: { count: 0, total: 0 },
    completed: { count: 0, total: 0 },
  }

  for (const p of projects) {
    const statusKey = p.status || 'kickoff'
    if (!stagesMap[statusKey]) {
      stagesMap[statusKey] = { count: 0, total: 0 }
    }
    stagesMap[statusKey].count += 1
    stagesMap[statusKey].total += Number(p.budget || 0)
  }

  const pipelineStages: StageData[] = [
    { id: 's1', name: 'new lead', count: stagesMap.kickoff.count, amount: `$${stagesMap.kickoff.total.toLocaleString()}`, statusColor: 'accent' },
    { id: 's2', name: 'in progress', count: stagesMap.in_progress.count, amount: `$${stagesMap.in_progress.total.toLocaleString()}`, statusColor: 'accent' },
    { id: 's3', name: 'in review', count: stagesMap.in_review.count, amount: `$${stagesMap.in_review.total.toLocaleString()}`, statusColor: 'warning' },
    { id: 's4', name: 'on hold', count: stagesMap.on_hold.count, amount: `$${stagesMap.on_hold.total.toLocaleString()}`, statusColor: 'warning' },
    { id: 's5', name: 'won', count: stagesMap.completed.count, amount: `$${stagesMap.completed.total.toLocaleString()}`, statusColor: 'success' },
  ]

  // 4. Revenue Chart (Past 6 Months) & Target Line based on Trailing Monthly Average
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyRevenueMap = new Map<string, number>()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${monthNames[d.getMonth()]}`
    monthlyRevenueMap.set(key, 0)
  }

  for (const inv of invoices) {
    if (inv.created_at) {
      const d = new Date(inv.created_at)
      const key = monthNames[d.getMonth()]
      if (monthlyRevenueMap.has(key)) {
        monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) || 0) + (inv.amount_paid || inv.total || 0))
      }
    }
  }

  const monthlyValues = Array.from(monthlyRevenueMap.values())
  const activeRevenues = monthlyValues.filter((v) => v > 0)
  const trailingAvgRevenue = activeRevenues.length > 0
    ? Math.round(activeRevenues.reduce((a, b) => a + b, 0) / activeRevenues.length)
    : Math.round(avgDealSizeVal) || 50000

  const revenueChartData: MonthlyRevenueData[] = Array.from(monthlyRevenueMap.entries()).map(([month, revenue]) => ({
    month,
    revenue,
    target: trailingAvgRevenue,
  }))

  // 5. Activity Feed
  const { data: rawActivities } = await supabase
    .from("activity_logs")
    .select("id, title, details, created_at, action")
    .order("created_at", { ascending: false })
    .limit(6)

  let activities: ActivityData[] = []

  if (rawActivities && rawActivities.length > 0) {
    activities = rawActivities.map((act) => ({
      id: act.id,
      type: act.action || 'deal',
      description: `${act.title}${act.details ? ` - ${act.details}` : ''}`,
      timestamp: relativeTime(act.created_at),
      user: { name: user.name || 'Team Member' },
    }))
  } else {
    // Fallback synthesize from projects & tasks
    activities = projects.slice(0, 5).map((p) => ({
      id: p.id,
      type: 'deal',
      description: `project status updated to ${p.status?.replace('_', ' ')} (${p.name})`,
      timestamp: relativeTime(p.updated_at || p.created_at),
      user: { name: p.team_members?.name || user.name || 'System' },
    }))
  }

  // 6. Deals Table Data
  const mapProjectStatusToStage = (status: string): 'won' | 'lost' | 'pending' | 'archived' => {
    if (status === 'completed') return 'won'
    if (status === 'on_hold') return 'archived'
    if (status === 'cancelled') return 'lost'
    return 'pending'
  }

  const deals: DealTableData[] = projects.slice(0, 5).map((p) => ({
    id: p.id,
    company: p.clients?.company || p.clients?.name || p.name,
    contact: p.clients?.name || 'Primary Contact',
    value: `$${Number(p.budget || 0).toLocaleString()}`,
    stage: mapProjectStatusToStage(p.status),
    owner: {
      name: p.team_members?.name || user.name || 'Manager',
    },
    lastActivity: relativeTime(p.updated_at || p.created_at),
  }))

  return {
    metrics,
    pipelineStages,
    revenueChartData,
    activities,
    deals,
  }
}
