import { NextResponse } from "next/server"
import { deleteGoogleDriveConnection } from "@/lib/google-drive"
import { getCurrentUser } from "@/lib/supabase/session"

export async function POST() {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    await deleteGoogleDriveConnection()
    return NextResponse.json({ success: true, message: "Google Drive disconnected successfully." })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to disconnect Google Drive." },
      { status: 500 }
    )
  }
}
