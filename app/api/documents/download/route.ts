import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get("path")
    const fileName = searchParams.get("name") || "document"
    const isDownload = searchParams.get("download") === "true"

    if (!filePath) {
      return NextResponse.json({ error: "Missing path parameter" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Uses the signed-in user's session, so the storage RLS policies
    // (team_bucket_all / clients_bucket_select / worker_bucket_select) decide
    // whether this path is actually readable. The old version fell back to the
    // service-role client, letting any authenticated user mint signed URLs for
    // ANY file.
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(filePath, 3600, isDownload ? { download: fileName } : undefined)

    if (error || !data?.signedUrl) {
      console.error("Signed URL error:", error)
      return NextResponse.json({ error: error?.message || "Failed to generate file link" }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (err: unknown) {
    console.error("Download API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Download failed" },
      { status: 500 }
    )
  }
}
