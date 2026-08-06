"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  Users,
  BarChart3,
  ChevronRight,
} from "lucide-react"

export const INACTIVE_CLIENT_THRESHOLD_DAYS = 30
export const STALLED_PROJECT_THRESHOLD_DAYS = 21
export const OVERLOADED_TEAM_MULTIPLIER = 1.5

function initials(name?: string | null) {
  if (!name) return "??"
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export interface OverdueInvoiceItem {
  id: string
  invoice_number: string
  client_name: string
  project_name?: string | null
  amount: number
  days_overdue: number
}

export interface AtRiskClientItem {
  id: string
  name: string
  company?: string | null
  risk_reason: string
  last_activity: string
}

export interface TeamMemberWorkloadItem {
  id: string
  name: string
  active_count: number
  is_overloaded?: boolean
}

export interface NeedsAttentionSectionProps {
  overdueInvoices: OverdueInvoiceItem[]
  totalOverdueAmount: number
  atRiskClients: AtRiskClientItem[]
  teamWorkload: TeamMemberWorkloadItem[]
  averageWorkload: number
}

export function NeedsAttentionSection({
  overdueInvoices,
  totalOverdueAmount,
  atRiskClients,
  teamWorkload,
  averageWorkload,
}: NeedsAttentionSectionProps) {
  const maxWorkload = Math.max(1, ...teamWorkload.map((m) => m.active_count))

  return (
    <section className="flex flex-col gap-4 animate-slide-up-fade" style={{ animationDelay: "300ms" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5 text-rose-400" />
          <h3 className="text-xl font-bold tracking-tight text-foreground/90 dark:text-[#F4F4F6]">
            Needs Your Attention
          </h3>
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 dark:text-[#9797A8]">
          At-a-Glance Admin Flags
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* WIDGET 1: OVERDUE INVOICES */}
        <Link href="/invoices" className="group block h-full">
          <Card className="h-full glass-card dark:border-[#2A2A38] dark:bg-[#17171F] p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-rose-500/40 dark:group-hover:border-rose-400/40">
            <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${
                    overdueInvoices.length > 0
                      ? "bg-rose-500/15 text-rose-400 dark:bg-[rgba(244,63,94,0.15)] dark:text-[#FB7185]"
                      : "bg-emerald-500/15 text-emerald-400 dark:bg-[rgba(52,211,153,0.12)] dark:text-[#34D399]"
                  }`}
                >
                  {overdueInvoices.length > 0 ? (
                    <Receipt className="size-5" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-base font-bold text-foreground/90 dark:text-[#F4F4F6]">
                    Overdue Invoices
                  </CardTitle>
                </div>
              </div>
              <Badge
                className={
                  overdueInvoices.length > 0
                    ? "bg-rose-500/15 text-rose-400 dark:bg-[rgba(244,63,94,0.15)] dark:text-[#FB7185] border-0"
                    : "bg-emerald-500/15 text-emerald-400 dark:bg-[rgba(52,211,153,0.12)] dark:text-[#34D399] border-0"
                }
              >
                {overdueInvoices.length}
              </Badge>
            </CardHeader>

            <CardContent className="p-0 flex flex-col gap-4">
              {overdueInvoices.length > 0 ? (
                <>
                  <div className="flex flex-col">
                    <span className="text-2xl font-bold tracking-tight text-foreground/90 dark:text-[#F4F4F6]">
                      {formatCurrency(totalOverdueAmount)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground/80 dark:text-[#9797A8]">
                      Total Outstanding Amount at Risk
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {overdueInvoices.slice(0, 3).map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-border/40 dark:border-[#2A2A38] bg-muted/20 dark:bg-[#1E1E28]/60 p-2.5 text-xs transition-colors group-hover:bg-muted/40"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate text-foreground/90 dark:text-[#F4F4F6]">
                            {inv.client_name}
                          </span>
                          <span className="truncate text-muted-foreground/80 dark:text-[#9797A8]">
                            {inv.invoice_number} {inv.project_name ? `· ${inv.project_name}` : ""}
                          </span>
                          <span className="mt-1 w-fit rounded-full bg-rose-500/12 dark:bg-[rgba(244,63,94,0.12)] px-2 py-0.5 text-[10px] font-bold text-rose-400 dark:text-[#FB7185]">
                            {inv.days_overdue} days overdue
                          </span>
                        </div>
                        <span className="shrink-0 font-bold text-foreground/90 dark:text-[#F4F4F6]">
                          {formatCurrency(inv.amount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {overdueInvoices.length > 3 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-rose-400 dark:text-[#FB7185] pt-1">
                      <span>+{overdueInvoices.length - 3} more overdue</span>
                      <ChevronRight className="size-3.5" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground dark:text-[#9797A8] gap-2">
                  <CheckCircle2 className="size-8 text-emerald-400" />
                  <span className="font-bold text-foreground/90 dark:text-[#F4F4F6]">
                    All invoices are up to date
                  </span>
                  <span>No outstanding unpaid invoices past due date.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* WIDGET 2: AT-RISK CLIENTS */}
        <Link href="/crm" className="group block h-full">
          <Card className="h-full glass-card dark:border-[#2A2A38] dark:bg-[#17171F] p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-amber-500/40 dark:group-hover:border-amber-400/40">
            <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${
                    atRiskClients.length > 0
                      ? "bg-amber-500/15 text-amber-400 dark:bg-[rgba(251,191,36,0.15)] dark:text-[#FBBF24]"
                      : "bg-emerald-500/15 text-emerald-400 dark:bg-[rgba(52,211,153,0.12)] dark:text-[#34D399]"
                  }`}
                >
                  {atRiskClients.length > 0 ? (
                    <AlertTriangle className="size-5" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-base font-bold text-foreground/90 dark:text-[#F4F4F6]">
                    At-Risk Clients
                  </CardTitle>
                </div>
              </div>
              <Badge
                className={
                  atRiskClients.length > 0
                    ? "bg-amber-500/15 text-amber-400 dark:bg-[rgba(251,191,36,0.15)] dark:text-[#FBBF24] border-0"
                    : "bg-emerald-500/15 text-emerald-400 dark:bg-[rgba(52,211,153,0.12)] dark:text-[#34D399] border-0"
                }
              >
                {atRiskClients.length}
              </Badge>
            </CardHeader>

            <CardContent className="p-0 flex flex-col gap-4">
              {atRiskClients.length > 0 ? (
                <>
                  <div className="flex flex-col gap-2.5">
                    {atRiskClients.slice(0, 3).map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border/40 dark:border-[#2A2A38] bg-muted/20 dark:bg-[#1E1E28]/60 p-2.5 text-xs transition-colors group-hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-400 dark:text-[#FBBF24]">
                            {initials(client.name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold truncate text-foreground/90 dark:text-[#F4F4F6]">
                              {client.name} {client.company ? `(${client.company})` : ""}
                            </span>
                            <span className="truncate text-muted-foreground/80 dark:text-[#9797A8]">
                              {client.risk_reason}
                            </span>
                          </div>
                        </div>
                        <span className="shrink-0 text-[10px] font-medium text-muted-foreground/60 dark:text-[#6E6E80]">
                          {client.last_activity}
                        </span>
                      </div>
                    ))}
                  </div>

                  {atRiskClients.length > 3 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400 dark:text-[#FBBF24] pt-1">
                      <span>+{atRiskClients.length - 3} more clients</span>
                      <ChevronRight className="size-3.5" />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground dark:text-[#9797A8] gap-2">
                  <CheckCircle2 className="size-8 text-emerald-400" />
                  <span className="font-bold text-foreground/90 dark:text-[#F4F4F6]">
                    No clients need attention right now
                  </span>
                  <span>All active projects and communications are moving along.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* WIDGET 3: TEAM WORKLOAD */}
        <Link href="/team" className="group block h-full">
          <Card className="h-full glass-card dark:border-[#2A2A38] dark:bg-[#17171F] p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 dark:group-hover:border-[#818CF8]/40">
            <CardHeader className="p-0 pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary dark:bg-[rgba(99,102,241,0.15)] dark:text-[#818CF8] transition-transform group-hover:scale-110">
                  <BarChart3 className="size-5" />
                </div>
                <div className="flex flex-col">
                  <CardTitle className="text-base font-bold text-foreground/90 dark:text-[#F4F4F6]">
                    Team Workload
                  </CardTitle>
                </div>
              </div>
              <Badge className="bg-primary/15 text-primary dark:bg-[rgba(99,102,241,0.15)] dark:text-[#818CF8] border-0">
                {teamWorkload.length} members
              </Badge>
            </CardHeader>

            <CardContent className="p-0 flex flex-col gap-4">
              {!teamWorkload.length ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-muted-foreground dark:text-[#9797A8] gap-2">
                  <Users className="size-8 text-muted-foreground/50" />
                  <span>No team workload recorded yet.</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {teamWorkload.slice(0, 4).map((member) => {
                    const pct = Math.min(100, Math.round((member.active_count / maxWorkload) * 100))
                    const isOverloaded =
                      member.is_overloaded ??
                      (averageWorkload > 0 && member.active_count >= averageWorkload * OVERLOADED_TEAM_MULTIPLIER)

                    return (
                      <div key={member.id} className="flex flex-col gap-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary dark:text-[#818CF8]">
                              {initials(member.name)}
                            </div>
                            <span className="font-bold truncate text-foreground/90 dark:text-[#F4F4F6]">
                              {member.name}
                            </span>
                            {isOverloaded && (
                              <span className="rounded-full bg-amber-500/12 dark:bg-[rgba(251,191,36,0.12)] px-1.5 py-0.5 text-[9px] font-bold text-amber-400 dark:text-[#FBBF24]">
                                Overloaded
                              </span>
                            )}
                          </div>
                          <span className="shrink-0 font-bold text-muted-foreground/80 dark:text-[#9797A8]">
                            {member.active_count} active
                          </span>
                        </div>

                        {/* Bar Track & Fill */}
                        <div className="h-2 w-full rounded-full bg-border/40 dark:bg-[#1E1E28] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOverloaded
                                ? "bg-amber-400 dark:bg-[#FBBF24]"
                                : "bg-primary dark:bg-[#818CF8]"
                            }`}
                            style={{ width: `${Math.max(8, pct)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}

                  {teamWorkload.length > 4 && (
                    <div className="flex items-center gap-1 text-xs font-bold text-primary dark:text-[#818CF8] pt-1">
                      <span>+{teamWorkload.length - 4} more teammates</span>
                      <ChevronRight className="size-3.5" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  )
}
