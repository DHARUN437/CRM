import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export const dynamic = "force-dynamic"

function getIdFromRequest(request: Request): string | null {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? null
}

// ── PATCH /api/projects/[id] — update project fields ────────────────────────
export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = getIdFromRequest(request)
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 })

  const patch: Record<string, unknown> = {}

  if (typeof body.name === "string") {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })
    patch.name = name
  }
  if (typeof body.description === "string") patch.description = body.description.trim() || null
  if (typeof body.status === "string") patch.status = body.status
  if (typeof body.progress === "number") patch.progress = Math.min(100, Math.max(0, body.progress))
  if (Array.isArray(body.tech_stack)) patch.tech_stack = body.tech_stack
  if (typeof body.start_date === "string") patch.start_date = body.start_date || null
  if (typeof body.due_date === "string") patch.due_date = body.due_date || null
  // Admin-only fields
  if (typeof body.tl_id === "string") patch.tl_id = body.tl_id || null
  else if (body.tl_id === null) patch.tl_id = null
  if (typeof body.budget === "number") patch.budget = body.budget >= 0 ? body.budget : null
  else if (body.budget === null) patch.budget = null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  // Uses the signed-in user's session — RLS (team_projects_all) gates the write.
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", id)
    .select("id, name, status, progress")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json(data)
}

// ── DELETE /api/projects/[id] — permanently remove a project ────────────────
export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = getIdFromRequest(request)
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from("projects").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
