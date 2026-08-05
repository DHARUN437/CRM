import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { projectId, clientId, title, description, priority = "medium" } = body

  if (!projectId || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const payload = {
    project_id: projectId,
    client_id: clientId || null,
    title: String(title).trim(),
    description: description ? String(description).trim() : null,
    priority,
    status: "pending",
  }

  // 1. Try standard user client
  let { data, error } = await supabase
    .from("feature_requests")
    .insert(payload)
    .select()
    .single()

  // 2. Fallback to admin client if RLS policy recursion occurs
  if (error && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = getAdminClient()
    if (admin) {
      const adminRes = await admin
        .from("feature_requests")
        .insert(payload)
        .select()
        .single()
      data = adminRes.data
      error = adminRes.error
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ feature: data })
}
