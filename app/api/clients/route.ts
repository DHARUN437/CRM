import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
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
  const company = typeof body?.company === "string" ? body.company.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "name, email and password are required" },
      { status: 400 }
    )
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

  // Duplicate detection — warn, never block. Team RLS lets admins see every
  // (non-deleted) client, so a case-insensitive exact company match is found
  // here. The response includes the matched company for the dialog to surface.
  let duplicateCompany: string | null = null
  if (company) {
    const supabase = await createClient()
    const { data: existing } = await supabase
      .from("clients")
      .select("company")
      .ilike("company", company)
      .limit(1)
    const match = existing?.find((c) => c.company?.toLowerCase() === company.toLowerCase())
    duplicateCompany = match?.company ?? null
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

  // Pass full_name + company in app_metadata so the DB trigger
  // (which reads raw_app_meta_data) creates the clients row correctly.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role: "client",
      full_name: name,
      company: company || undefined,
    },
    user_metadata: { full_name: name, company: company || undefined },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Upsert with DO UPDATE so the correct name/company is always written,
  // even if the trigger already inserted a row with fallback values.
  await admin
    .from("clients")
    .upsert(
      {
        user_id: data.user.id,
        name,
        company: company || null,
        email,
      },
      { onConflict: "user_id", ignoreDuplicates: false }
    )
    .select("id")
    .single()

  return NextResponse.json({ id: data.user.id, name, company, email, duplicateCompany })
}
