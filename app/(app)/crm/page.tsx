import { CrmDashboard } from "@/components/crm/crm-dashboard"
import { PageHeader } from "@/components/app/page-header"
import { NewLeadDialog } from "@/components/crm/new-lead-dialog"
import { ExportLeadsButton } from "@/components/crm/export-leads-button"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import {
  avatarColor,
  initials,
  type Lead,
} from "@/lib/crm"

import { getCurrentUser } from "@/lib/supabase/session"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function CrmPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role !== "team") {
    redirect("/projects")
  }

  const { data: sessionData } = await supabase.auth.getUser()
  const userId = sessionData.user?.id ?? null
  let teamMemberId: string | null = null
  if (userId) {
    const { data: member } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle()
    teamMemberId = member?.id ?? null
  }
  const currentUser = {
    role: (sessionData.user?.app_metadata?.role as string) ?? "worker",
    teamMemberId,
  }

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
    ownerId: row.owner_id,
    updated_at: row.updated_at,
    tags: row.tags ?? [],
  }))

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

      <CrmDashboard initialLeads={leads} currentUser={currentUser} />
    </div>
  )
}
