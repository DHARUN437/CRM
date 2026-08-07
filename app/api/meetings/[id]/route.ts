import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function PATCH(
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

  const body = await request.json()
  const { status, adminNotes, confirmedDate, confirmedTime } = body

  const updateData: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  if (status) updateData.status = status
  if (adminNotes !== undefined) updateData.admin_notes = adminNotes
  if (confirmedDate !== undefined) updateData.confirmed_date = confirmedDate
  if (confirmedTime !== undefined) updateData.confirmed_time = confirmedTime

  const { data: meeting, error } = await supabase
    .from("meetings")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating meeting:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ meeting })
}
