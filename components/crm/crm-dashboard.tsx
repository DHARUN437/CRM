"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CrmBoard } from "@/components/crm/crm-board"
import { CrmFunnel } from "@/components/crm/crm-funnel"
import { currency, type Lead, type LeadStage } from "@/lib/crm"
import { TrendingUp, Trophy, Target, Percent } from "lucide-react"

interface CrmDashboardProps {
  initialLeads: Lead[]
  currentUser: { role: string; teamMemberId: string | null }
}

export function CrmDashboard({ initialLeads, currentUser }: CrmDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [prevInitialLeads, setPrevInitialLeads] = useState(initialLeads)
  if (prevInitialLeads !== initialLeads) {
    setPrevInitialLeads(initialLeads)
    setLeads(initialLeads)
  }

  // Instant WebSocket real-time subscription for leads table updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("crm-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newLead = payload.new as unknown as Lead
            setLeads((prev) => {
              if (prev.some((l) => l.id === newLead.id)) return prev
              return [newLead, ...prev]
            })
          } else if (payload.eventType === "UPDATE") {
            const updatedLead = payload.new as unknown as Lead
            setLeads((prev) =>
              prev.map((l) => (l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
            )
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setLeads((prev) => prev.filter((l) => l.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const canDeleteLead = (lead: Lead) =>
    currentUser.role !== "worker" ||
    (currentUser.teamMemberId != null && lead.ownerId === currentUser.teamMemberId)

  async function handleStageChange(id: string, stage: LeadStage) {
    const previous = leads.find((l) => l.id === id)
    if (!previous || previous.stage === stage) return

    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, stage, updated_at: new Date().toISOString() }
          : l
      )
    )

    const supabase = createClient()
    const { error } = await supabase
      .from("leads")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, stage: previous.stage } : l))
      )
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/leads/${id}`, { method: "DELETE" })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(json.error ?? "Could not delete lead.")
    }
    setLeads((prev) => prev.filter((l) => l.id !== id))
  }

  const openValue = leads
    .filter((l) => l.stage !== "won")
    .reduce((sum, l) => sum + l.value, 0)
  const wonValue = leads
    .filter((l) => l.stage === "won")
    .reduce((sum, l) => sum + l.value, 0)
  const avgScore = leads.length
    ? Math.round(leads.reduce((sum, l) => sum + l.score, 0) / leads.length)
    : 0
  const winRate = leads.length
    ? Math.round(
        (leads.filter((l) => l.stage === "won").length / leads.length) * 100,
      )
    : 0

  const stats = [
    { label: "Open pipeline", value: currency(openValue), icon: TrendingUp },
    { label: "Total won", value: currency(wonValue), icon: Trophy },
    { label: "Avg. lead score", value: `${avgScore}`, icon: Target },
    { label: "Win rate", value: `${winRate}%`, icon: Percent },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-[var(--surface)] border border-[var(--border)]/60 shadow-sm p-4 rounded-2xl">
            <CardContent className="flex items-center gap-3.5 p-0">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent)] font-semibold shadow-xs">
                <s.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">{s.value}</span>
                <span className="text-xs text-[var(--text-secondary)] font-medium">{s.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="board" className="w-full">
        <TabsList>
          <TabsTrigger value="board">Pipeline</TabsTrigger>
          <TabsTrigger value="funnel">Funnel</TabsTrigger>
        </TabsList>
        <TabsContent value="board" className="mt-4">
          <CrmBoard
            leads={leads}
            onStageChange={handleStageChange}
            onDelete={handleDelete}
            canDeleteLead={canDeleteLead}
          />
        </TabsContent>
        <TabsContent value="funnel" className="mt-4">
          <CrmFunnel leads={leads} />
        </TabsContent>
      </Tabs>
    </>
  )
}
