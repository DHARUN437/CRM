import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  const body = await request.json()
  const { projectId, taskId, hours, description, loggedAt } = body

  if (!projectId || !hours) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  // Workers may only log time on projects they are assigned to. Team members
  // bypass the check (they manage all time entries via RLS).
  if (user.role !== "team") {
    const { data: teamMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!teamMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { data: assignment } = await supabase
      .from("project_assignments")
      .select("id")
      .eq("project_id", projectId)
      .eq("team_member_id", teamMember.id)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this project" },
        { status: 403 }
      )
    }
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
