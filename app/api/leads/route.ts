import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { isNonNegativeNumber } from "@/lib/validation"

export const dynamic = "force-dynamic"

const LEAD_STAGES = ["new", "qualified", "proposal", "negotiation", "won"]

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || (user.role !== "team" && user.role !== "tl" && user.role !== "worker")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const company = typeof body?.company === "string" ? body.company.trim() : ""
  const contact = typeof body?.contact === "string" ? body.contact.trim() : ""
  const valueRaw = body?.value
  const value = typeof valueRaw === "number" ? valueRaw : typeof valueRaw === "string" ? Number(valueRaw) : 0
  const stage = typeof body?.stage === "string" ? body.stage : "new"
  const source = typeof body?.source === "string" ? body.source.trim() : ""
  const tags = Array.isArray(body?.tags)
    ? (body.tags as unknown[])
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim())
        .filter(Boolean)
    : []

  if (!company) {
    return NextResponse.json({ error: "company is required" }, { status: 400 })
  }
  if (!contact) {
    return NextResponse.json({ error: "contact is required" }, { status: 400 })
  }
  if (!isNonNegativeNumber(value)) {
    return NextResponse.json({ error: "Deal value must be a non-negative number" }, { status: 400 })
  }
  if (!LEAD_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Invalid lead stage" }, { status: 400 })
  }

  // Duplicate detection — warn, never block. A case-insensitive exact company
  // match against either active leads or clients surfaces a warning for the
  // dialog; the API response includes the matched names.
  const supabase = await createClient()
  let duplicateLeads: string[] = []
  let duplicateClients: string[] = []

  const { data: leadMatches } = await supabase
    .from("leads")
    .select("company")
    .ilike("company", company)
    .limit(5)
  duplicateLeads =
    leadMatches
      ?.filter((l) => l.company?.toLowerCase() === company.toLowerCase())
      .map((l) => l.company) ?? []

  const { data: clientMatches } = await supabase
    .from("clients")
    .select("company")
    .ilike("company", company)
    .limit(5)
  duplicateClients =
    clientMatches
      ?.filter((c) => c.company?.toLowerCase() === company.toLowerCase())
      .map((c) => c.company) ?? []

  // Resolve the current member's row for owner_id (workers own their own
  // leads; team/tl may leave owner null or pick explicitly).
  let owner_id: string | null = typeof body?.owner_id === "string" ? body.owner_id : null
  if (user.role === "worker") {
    const { data: me } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
    owner_id = me?.id ?? null
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      company,
      contact,
      value,
      stage,
      score: 0,
      source: source || null,
      owner_id,
      tags,
    })
    .select("id, company")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    id: data.id,
    company: data.company,
    duplicateLeads,
    duplicateClients,
  })
}
