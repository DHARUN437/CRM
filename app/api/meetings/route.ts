import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if user is team/admin member
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle()

  const isTeam = Boolean(teamMember)

  if (isTeam) {
    const { data: meetings, error } = await supabase
      .from("meetings")
      .select("*, clients(name, company), projects(name)")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ meetings: meetings || [] })
  }

  // Client user query
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!client) {
    return NextResponse.json({ meetings: [] })
  }

  const { data: meetings, error } = await supabase
    .from("meetings")
    .select("*, projects(name)")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ meetings: meetings || [] })
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
  const {
    title,
    description,
    projectId,
    requestedDate,
    requestedTime,
    durationMinutes = 30,
  } = body

  if (!title || !requestedDate || !requestedTime) {
    return NextResponse.json({ error: "Missing required fields (title, date, time)" }, { status: 400 })
  }

  // Resolve owning client for the user
  let clientId: string | null = null

  const { data: clientRow } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (clientRow) {
    clientId = clientRow.id
  } else if (user.email) {
    const { data: clientByEmail } = await supabase
      .from("clients")
      .select("id")
      .eq("email", user.email)
      .maybeSingle()
    if (clientByEmail) clientId = clientByEmail.id
  }

  if (!clientId) {
    // If no client row exists, create or fallback to user.id
    clientId = user.id
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      client_id: clientId,
      project_id: projectId || null,
      requested_by: user.id,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      requested_date: requestedDate,
      requested_time: requestedTime,
      duration_minutes: Number(durationMinutes) || 30,
      status: "requested",
    })
    .select()
    .single()

  if (error) {
    console.error("Meeting creation error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ meeting })
}
