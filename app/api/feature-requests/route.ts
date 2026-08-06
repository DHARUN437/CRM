import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { projectId, title, description, priority = "medium" } = body

  if (!projectId || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Resolve the owning client from the project. This select is RLS-scoped to
  // the signed-in user, so it only succeeds for projects the caller can see.
  const { data: proj } = await supabase
    .from("projects")
    .select("client_id")
    .eq("id", projectId)
    .maybeSingle()

  if (!proj?.client_id) {
    return NextResponse.json({ error: "Project not found" }, { status: 403 })
  }

  // RLS (feature_requests_client_insert / feature_requests_team_all) still
  // verifies the caller may write to this project. The service-role fallback
  // that previously bypassed those checks is removed.
  const { data, error } = await supabase
    .from("feature_requests")
    .insert({
      project_id: projectId,
      client_id: proj.client_id,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      priority,
      status: "open",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ feature: data })
}
