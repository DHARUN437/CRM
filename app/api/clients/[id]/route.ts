import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export const dynamic = "force-dynamic"

async function getClientId(request: Request): Promise<string | null> {
  const url = new URL(request.url)
  const parts = url.pathname.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? null
}

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

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = await getClientId(request)
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : undefined
  const company = typeof body?.company === "string" ? body.company.trim() : undefined
  const phone = typeof body?.phone === "string" ? body.phone.trim() : undefined

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 })
  }

  const patch: Record<string, string | null> = {}
  if (name !== undefined) patch.name = name
  if (company !== undefined) patch.company = company || null
  if (phone !== undefined) patch.phone = phone || null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 })
  }

  const anonClient = await createClient()
  const db = getDbClient(anonClient)

  const { data, error } = await db
    .from("clients")
    .update(patch)
    .eq("id", id)
    .select("id, name, company, email, phone")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = await getClientId(request)
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  const anonClient = await createClient()
  const db = getDbClient(anonClient)

  const { data: client } = await db
    .from("clients")
    .select("user_id")
    .eq("id", id)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  const { error: deleteError } = await db
    .from("clients")
    .delete()
    .eq("id", id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  // Also delete the auth user so they can no longer sign in.
  if (client.user_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await admin.auth.admin.deleteUser(client.user_id)
  }

  return NextResponse.json({ ok: true })
}
