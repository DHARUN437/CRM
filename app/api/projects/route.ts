import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export const dynamic = "force-dynamic"

function getDbClient(anonClient: any) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return anonClient
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : ""
  const name = typeof body.name === "string" ? body.name.trim() : ""

  if (!clientId || !name) {
    return NextResponse.json({ error: "client_id and name are required" }, { status: 400 })
  }

  const payload: Record<string, unknown> = {
    client_id: clientId,
    name,
    description: typeof body.description === "string" ? body.description.trim() || null : null,
    tech_stack: Array.isArray(body.tech_stack) ? body.tech_stack : [],
    start_date: typeof body.start_date === "string" ? body.start_date || null : null,
    due_date: typeof body.due_date === "string" ? body.due_date || null : null,
    status: typeof body.status === "string" ? body.status : "kickoff",
    progress: typeof body.progress === "number" ? body.progress : 0,
    tl_id: typeof body.tl_id === "string" ? body.tl_id || null : null,
    budget: typeof body.budget === "number" ? body.budget : null,
  }

  const anonClient = await createClient()
  const db = getDbClient(anonClient)

  const { data, error } = await db
    .from("projects")
    .insert(payload)
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ id: data.id })
}
