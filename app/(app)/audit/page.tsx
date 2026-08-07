import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { PageHeader } from "@/components/app/page-header"
import { AuditLogClient, type AuditLogItem } from "./audit-log-client"

export const dynamic = "force-dynamic"

export default async function AuditPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role !== "team") redirect("/dashboard")

  const supabase = await createClient()

  const { data: rows } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, before, after, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  const logs = rows ?? []

  // Resolve actor names from both team_members and clients
  const actorIds = [...new Set(logs.map((l) => l.actor_id).filter(Boolean))] as string[]
  const names = new Map<string, string>()

  if (actorIds.length) {
    const [{ data: members }, { data: clients }] = await Promise.all([
      supabase
        .from("team_members")
        .select("user_id, name")
        .in("user_id", actorIds),
      supabase
        .from("clients")
        .select("user_id, name, company")
        .in("user_id", actorIds),
    ])

    for (const m of members ?? []) {
      if (m.user_id) names.set(m.user_id, m.name)
    }

    for (const c of clients ?? []) {
      if (c.user_id) {
        names.set(c.user_id, c.company || c.name)
      }
    }
  }

  const initialLogs: AuditLogItem[] = logs.map((log) => {
    let summary = "permanently removed"

    if (log.action === "lead.stage_changed") {
      const beforeStage = (log.before as { stage?: string } | null)?.stage ?? "—"
      const afterStage = (log.after as { stage?: string } | null)?.stage ?? "—"
      summary = `${beforeStage} → ${afterStage}`
    } else if (log.action === "role.changed") {
      const beforeRole = (log.before as { role?: string } | null)?.role ?? "—"
      const afterRole = (log.after as { role?: string } | null)?.role ?? "—"
      summary = `${beforeRole} → ${afterRole}`
    } else if (log.before && typeof log.before === "object") {
      const company = (log.before as { company?: string; name?: string; title?: string }).company ||
                      (log.before as { company?: string; name?: string; title?: string }).name ||
                      (log.before as { company?: string; name?: string; title?: string }).title
      if (company) {
        summary = `"${company}" removed`
      }
    }

    // Actor name resolution:
    // If actor_id is null, it's genuinely System automated job.
    // If actor_id exists, lookup name -> fallback to User (short id) instead of masking as System.
    let actorName = "System"
    if (log.actor_id) {
      const resolvedName = names.get(log.actor_id)
      if (resolvedName) {
        actorName = resolvedName
      } else if (log.actor_id === user.id) {
        actorName = user.name || user.email || "Admin User"
      } else {
        actorName = `User (${log.actor_id.slice(0, 8)})`
      }
    }

    return {
      id: log.id,
      actorId: log.actor_id,
      actorName,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      summary,
      createdAt: log.created_at,
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit Log"
        description="Complete system audit trail — lead stage changes, deletions, role updates, and system activities."
      />

      <AuditLogClient initialLogs={initialLogs} />
    </div>
  )
}
