import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getCurrentUser } from "@/lib/supabase/session"
import { isValidEmail } from "@/lib/validation"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  const roleInput = body?.role === "tl" ? "tl" : "worker"

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email and password are required" }, { status: 400 })
  }

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    )
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

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role: roleInput },
    user_metadata: { full_name: name },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // The auth trigger creates the team_members row; upsert as a fallback.
  await admin
    .from("team_members")
    .upsert(
      {
        user_id: data.user.id,
        role: roleInput,
        name,
        email,
      },
      { onConflict: "user_id" }
    )
    .select("id")
    .single()

  return NextResponse.json({ id: data.user.id, name, email, role: roleInput })
}