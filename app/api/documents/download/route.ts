import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

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

    const admin = getAdminClient()
    const clientToUse = admin || supabase

    const { data, error } = await clientToUse.storage
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
