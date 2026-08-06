import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const projectId = formData.get("projectId") as string | null

    if (!file || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Resolve the owning client from the project. RLS scopes this select to the
    // signed-in user, so it only succeeds for projects the caller can see.
    const { data: proj } = await supabase
      .from("projects")
      .select("client_id")
      .eq("id", projectId)
      .maybeSingle()

    if (!proj?.client_id) {
      return NextResponse.json({ error: "Project not found" }, { status: 403 })
    }

    // Upload through the signed-in session: the storage RLS policy
    // (clients_bucket_insert for clients, team_bucket_all for staff) decides
    // whether this client_id folder is writable. The previous version fell back
    // to the service role and silently picked an arbitrary client.
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const filePath = `${proj.client_id}/${projectId}/${crypto.randomUUID()}-${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(filePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const docPayload = {
      project_id: projectId,
      client_id: proj.client_id,
      name: file.name,
      file_path: filePath,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      uploaded_by: user.id,
    }

    const { data: doc, error: dbError } = await supabase
      .from("project_documents")
      .insert(docPayload)
      .select()
      .single()

    if (dbError) {
      console.error("Database insert error:", dbError)
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ document: doc })
  } catch (err: unknown) {
    console.error("Document upload API error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Document upload failed" },
      { status: 500 }
    )
  }
}
