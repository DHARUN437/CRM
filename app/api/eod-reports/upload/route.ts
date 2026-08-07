import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { getOrCreateFolder, uploadFileToDrive } from "@/lib/google-drive"

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("file") as File[]
    const reportDate = (formData.get("reportDate") as string) || new Date().toISOString().split("T")[0]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Check size limit: 25MB per file
    const MAX_SIZE = 25 * 1024 * 1024
    for (const f of files) {
      if (f.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `File "${f.name}" exceeds the 25MB limit (${(f.size / 1024 / 1024).toFixed(1)}MB).` },
          { status: 400 }
        )
      }
    }

    // Resolve employee name
    const employeeName = user.name || user.email.split("@")[0] || "Employee"

    // 1. Get or create [Employee Name] folder inside Google Drive target folder
    const employeeFolderId = await getOrCreateFolder({
      folderName: employeeName,
    })

    // 2. Get or create [reportDate] folder inside Employee folder
    const dateFolderId = await getOrCreateFolder({
      folderName: reportDate,
      parentFolderId: employeeFolderId,
    })

    const uploadedFiles: {
      google_drive_file_id: string
      file_name: string
      file_url: string
      file_size: number
      mime_type: string
    }[] = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const driveFile = await uploadFileToDrive({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileContent: buffer,
        folderId: dateFolderId,
      })

      uploadedFiles.push({
        google_drive_file_id: driveFile.id,
        file_name: file.name,
        file_url: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
      })
    }

    return NextResponse.json({ files: uploadedFiles })
  } catch (err) {
    console.error("EOD Google Drive upload error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload attachments to Google Drive." },
      { status: 500 }
    )
  }
}
