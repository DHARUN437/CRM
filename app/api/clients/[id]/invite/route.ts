import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
