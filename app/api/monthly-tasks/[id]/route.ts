import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status, progress } = body

  const updateData: any = { updated_at: new Date().toISOString() }

  if (status) {
    updateData.status = status
    if (status === "completed") {
      updateData.progress = 100
      updateData.completed_at = new Date().toISOString()
    }
  }

  if (typeof progress === "number") {
    updateData.progress = Math.min(100, Math.max(0, progress))
  }

  const { data: task, error } = await supabase
    .from("monthly_tasks")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Monthly task patch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task })
}
