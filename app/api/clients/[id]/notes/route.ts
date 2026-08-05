import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export const dynamic = "force-dynamic"

function getClientId(request: Request): string | null {
  const parts = new URL(request.url).pathname.split("/").filter(Boolean)
  return parts[parts.length - 2] ?? null
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const clientId = getClientId(request)
  if (!clientId) {
    return NextResponse.json({ error: "missing client id" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("client_notes")
    .select("*, team_members(name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const notes = (data ?? []).map((n: Record<string, unknown>) => ({
    ...(n as { id: string; client_id: string; author_id: string; body: string; created_at: string }),
    author_name: (n.team_members as { name: string } | null)?.name ?? null,
  }))

  return NextResponse.json(notes)
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "team" && user.role !== "worker") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const clientId = getClientId(request)
  if (!clientId) {
    return NextResponse.json({ error: "missing client id" }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const noteBody = typeof body?.body === "string" ? body.body.trim() : ""
  if (!noteBody) {
    return NextResponse.json({ error: "body is required" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("client_notes")
    .insert({
      client_id: clientId,
      author_id: user.id,
      body: noteBody,
    })
    .select("id, client_id, author_id, body, created_at")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ...data, author_name: user.name })
}