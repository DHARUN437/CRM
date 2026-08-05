import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export const dynamic = "force-dynamic"

async function getWorkerId(request: Request): Promise<string | null> {
  const url = new URL(request.url)
  const parts = url.pathname.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? null
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = await getWorkerId(request)
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim() : undefined
  const password = typeof body?.password === "string" ? body.password : undefined

  if (email !== undefined && !email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 })
  }
  if (password !== undefined && !password) {
    return NextResponse.json({ error: "password cannot be empty" }, { status: 400 })
  }
  if (!email && !password) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: member } = await supabase
    .from("team_members")
    .select("id, user_id, role")
    .eq("id", id)
    .single()

  if (!member || member.role !== "worker") {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    )
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const authPatch: Record<string, string | boolean> = {}
  if (email !== undefined) authPatch.email = email
  if (password !== undefined) authPatch.password = password
  if (email !== undefined) authPatch.email_confirm = true

  const { error: updateError } = await admin.auth.admin.updateUserById(
    member.user_id,
    authPatch
  )
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  if (email !== undefined) {
    const { error: rowError } = await supabase
      .from("team_members")
      .update({ email })
      .eq("id", id)
    if (rowError) {
      return NextResponse.json({ error: rowError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ ok: true, email: email ?? undefined })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = await getWorkerId(request)
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: member } = await supabase
    .from("team_members")
    .select("id, user_id, role")
    .eq("id", id)
    .single()

  if (!member || member.role !== "worker") {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Server is missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    )
  }

  // Deleting the auth user cascades: team_members row, project assignments,
  // their messages/chat, time entries and notifications are all removed.
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { error: deleteError } = await admin.auth.admin.deleteUser(member.user_id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
