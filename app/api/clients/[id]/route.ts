import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { isValidPhone } from "@/lib/validation"

export const dynamic = "force-dynamic"

async function getClientId(request: Request): Promise<string | null> {
  const url = new URL(request.url)
  const parts = url.pathname.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? null
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

  if (phone !== undefined && phone && !isValidPhone(phone)) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 })
  }

  const patch: Record<string, string | null> = {}
  if (name !== undefined) patch.name = name
  if (company !== undefined) patch.company = company || null
  if (phone !== undefined) patch.phone = phone || null

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 })
  }

  // Uses the signed-in user's session — RLS (team_clients_all) gates the write.
  const supabase = await createClient()

  const { data, error } = await supabase
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

  // Uses the signed-in user's session — RLS (team_clients_all) gates the write.
  const supabase = await createClient()

  const { data: client } = await supabase
    .from("clients")
    .select("user_id")
    .eq("id", id)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  // Soft-delete: mark the row deleted instead of removing it. RLS hides
  // deleted rows from everyone, so the client disappears from the CRM while
  // the record (and its projects/documents) is preserved for audit/recovery.
  // A direct UPDATE is impossible (RLS checks the new row against SELECT
  // policies, and those require deleted_at is null), so this runs through a
  // SECURITY DEFINER RPC that enforces the team role itself.
  const { data: deleted, error: updateError } = await supabase.rpc(
    "soft_delete_client",
    { p_client_id: id }
  )

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  if (!deleted) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  // Permanently revoke portal login. GoTrue's soft-delete (shouldSoftDelete =
  // true) sets auth.users.deleted_at, which blocks sign-in WITHOUT firing the
  // clients.user_id ON DELETE CASCADE — so the soft-deleted clients row above
  // survives. auth.admin is a legitimate service-role use (not a data bypass).
  if (client.user_id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await admin.auth.admin.deleteUser(client.user_id, true)
  }

  return NextResponse.json({ ok: true })
}
