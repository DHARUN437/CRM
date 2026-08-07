import { NextResponse } from "next/server"
import { uploadFileToDrive } from "@/lib/google-drive"

export async function POST() {
  try {
    const timestamp = new Date().toISOString()
    const fileName = `test-drive-connection-${Date.now()}.txt`
    const fileContent = `JoyCRM Google Drive Connection Verification Test\nUploaded at: ${timestamp}\nFolder ID: ${process.env.GOOGLE_DRIVE_FOLDER_ID || "Root"}`

    const result = await uploadFileToDrive({
      fileName,
      mimeType: "text/plain",
      fileContent,
    })

    return NextResponse.json({
      success: true,
      fileId: result.id,
      fileName: result.name,
      webViewLink: result.webViewLink,
      message: `Test file successfully uploaded to Google Drive folder! (ID: ${result.id})`,
    })
  } catch (err: any) {
    console.error("Test upload error:", err)
    return NextResponse.json(
      { error: err.message || "Google Drive test upload failed." },
      { status: 500 }
    )
  }
}
