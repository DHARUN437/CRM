import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export const dynamic = "force-dynamic"

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user || (user.role !== "team" && user.role !== "tl" && user.role !== "worker")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(request.url)
  const id = url.pathname.split("/").filter(Boolean).pop() ?? null
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  // Soft-delete: mark deleted_at. RLS (leads_team_all / leads_worker_own)
  // both filter on deleted_at is null, so the row disappears from the
  // pipeline while the record (and its audit trail) is preserved.
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from("leads")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  if (user.role === "worker") {
    const { data: me } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!me || lead.owner_id !== me.id) {
      return NextResponse.json({ error: "You can only delete your own leads" }, { status: 403 })
    }
  }

  // Soft-delete: mark deleted_at. A direct UPDATE is impossible (RLS checks
  // the new row against SELECT policies, and those require deleted_at is null),
  // so this runs through a SECURITY DEFINER RPC that re-checks the role and,
  // for workers, that they own the lead.
  const { data: deleted, error } = await supabase.rpc("soft_delete_lead", {
    p_lead_id: id,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!deleted) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
