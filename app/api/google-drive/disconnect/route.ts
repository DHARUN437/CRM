import { NextResponse } from "next/server"
import { deleteGoogleDriveConnection } from "@/lib/google-drive"

export async function POST() {
  try {
    await deleteGoogleDriveConnection()
    return NextResponse.json({ success: true, message: "Google Drive disconnected successfully." })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to disconnect Google Drive." },
      { status: 500 }
    )
  }
}
