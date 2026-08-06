import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  // RLS (team_clients_all) gates this read to staff only.
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  // Generate portal setup URL
  const origin = request.headers.get("origin") || "http://localhost:3000"
  const inviteUrl = `${origin}/portal/login?email=${encodeURIComponent(client.email)}`

  return NextResponse.json({
    success: true,
    inviteUrl,
    email: client.email,
    message: `Invitation generated for ${client.email}`,
  })
}
