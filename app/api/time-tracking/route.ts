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
  const { projectId, taskId, hours, description, loggedAt } = body

  if (!projectId || !hours) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      project_id: projectId,
      task_id: taskId || null,
      user_id: user.id,
      hours: Number(hours),
      description: description || null,
      logged_at: loggedAt || new Date().toISOString().split("T")[0],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entry: data })
}
