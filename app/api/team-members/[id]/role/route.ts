import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export const dynamic = "force-dynamic"

async function getMemberId(request: Request): Promise<string | null> {
  const url = new URL(request.url)
  const parts = url.pathname.split("/").filter(Boolean)
  return parts[parts.length - 2] ?? null
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = await getMemberId(request)
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const role = body?.role
  if (role !== "worker" && role !== "tl") {
    return NextResponse.json(
      { error: "role must be 'worker' or 'tl'" },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const { data: member, error: fetchError } = await supabase
    .from("team_members")
    .select("id, user_id, role")
    .eq("id", id)
    .single()

  if (fetchError || !member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 404 })
  }
  if (member.role === "team") {
    return NextResponse.json(
      { error: "Cannot change an admin's role" },
      { status: 400 }
    )
  }
  if (member.role === role) {
    return NextResponse.json({ error: "Role is already set" }, { status: 400 })
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

  // Update the auth role first — this is what RLS reads from the JWT on the
  // next session refresh.
  const { error: authError } = await admin.auth.admin.updateUserById(
    member.user_id,
    { app_metadata: { role } }
  )
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Update the team_members row through the admin's session so the
  // audit_role_change trigger records the real actor.
  const { error: rowError } = await supabase
    .from("team_members")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (rowError) {
    return NextResponse.json({ error: rowError.message }, { status: 400 })
  }

  // Sign out the affected user so the new role takes effect immediately
  // (their old JWT would otherwise carry the stale role until refresh).
  await admin.auth.admin.signOut(member.user_id)

  return NextResponse.json({ ok: true, id, role })
}
