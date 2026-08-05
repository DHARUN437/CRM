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

  const admin = getAdminClient()
  const clientToUse = admin || supabase

  // 1. Resolve valid client_id from project or clients table to satisfy foreign key constraint
  let validClientId: string | null = clientId || null

  if (projectId) {
    const { data: proj } = await clientToUse
      .from("projects")
      .select("client_id")
      .eq("id", projectId)
      .maybeSingle()

    if (proj?.client_id) {
      validClientId = proj.client_id
    }
  }

  // 2. Verify validClientId actually exists in clients table
  if (validClientId) {
    const { data: existingClient } = await clientToUse
      .from("clients")
      .select("id")
      .eq("id", validClientId)
      .maybeSingle()

    if (!existingClient) {
      const { data: fallbackClient } = await clientToUse
        .from("clients")
        .select("id")
        .limit(1)
        .maybeSingle()

      if (fallbackClient?.id) {
        validClientId = fallbackClient.id
      }
    }
  }

  // If no client row found at all, create a default client row for this user
  if (!validClientId && user) {
    const { data: newClient } = await clientToUse
      .from("clients")
      .insert({
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Client",
        company: "Joy Corporate Solutions",
        email: user.email ?? "",
      })
      .select("id")
      .single()

    if (newClient?.id) {
      validClientId = newClient.id
    }
  }

  const payload = {
    project_id: projectId,
    client_id: validClientId,
    title: String(title).trim(),
    description: description ? String(description).trim() : null,
    priority,
    status: "open",
  }

  // 3. Insert feature request using admin client (or standard client fallback)
  let { data, error } = await clientToUse
    .from("feature_requests")
    .insert(payload)
    .select()
    .single()

  if (error && !admin && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminFallback = getAdminClient()
    if (adminFallback) {
      const adminRes = await adminFallback
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
