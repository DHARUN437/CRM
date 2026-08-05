"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CrmBoard } from "@/components/crm/crm-board"
import { CrmFunnel } from "@/components/crm/crm-funnel"
import { currency, type Lead, type LeadStage } from "@/lib/crm"

export function CrmDashboard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)

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
    { label: "Open pipeline", value: currency(openValue) },
    { label: "Total won", value: currency(wonValue) },
    { label: "Avg. lead score", value: `${avgScore}` },
    { label: "Win rate", value: `${winRate}%` },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1 text-xl font-semibold tracking-tight">
                {s.value}
              </p>
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
          <CrmBoard leads={leads} onStageChange={handleStageChange} />
        </TabsContent>
        <TabsContent value="funnel" className="mt-4">
          <CrmFunnel leads={leads} />
        </TabsContent>
      </Tabs>
    </>
  )
}
