import { CrmBoard } from "@/components/crm/crm-board"
import { CrmFunnel } from "@/components/crm/crm-funnel"
import { PageHeader } from "@/components/app/page-header"
import { NewLeadDialog } from "@/components/crm/new-lead-dialog"
import { ExportLeadsButton } from "@/components/crm/export-leads-button"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@/lib/supabase/server"
import {
  avatarColor,
  currency,
  initials,
  type Lead,
} from "@/lib/crm"

export const dynamic = "force-dynamic"

export default async function CrmPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from("leads")
    .select("id, company, contact, value, stage, score, source, tags, updated_at, owner_id, team_members(name)")
    .order("updated_at", { ascending: false })

  const leads: Lead[] = (rows ?? []).map((row) => ({
    id: row.id,
    company: row.company,
    contact: row.contact,
    initials: initials(row.company),
    color: avatarColor(row.company),
    value: row.value,
    stage: row.stage as Lead["stage"],
    score: row.score,
    source: row.source,
    owner: (row.team_members as unknown as { name: string } | null)?.name ?? null,
    updated_at: row.updated_at,
    tags: row.tags ?? [],
  }))

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
    { label: "Won this quarter", value: currency(wonValue) },
    { label: "Avg. lead score", value: `${avgScore}` },
    { label: "Win rate", value: `${winRate}%` },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Pipeline"
        description="Track deals across every stage and forecast revenue."
        actions={
          <>
            <ExportLeadsButton leads={leads} />
            <NewLeadDialog trigger={<Button size="sm">New lead</Button>} />
          </>
        }
      />

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
          <CrmBoard leads={leads} />
        </TabsContent>
        <TabsContent value="funnel" className="mt-4">
          <CrmFunnel leads={leads} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
