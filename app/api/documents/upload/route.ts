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
    let clientId = formData.get("clientId") as string | null

    if (!file || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const admin = getAdminClient()
    const clientToUse = admin || supabase

    // 1. Resolve valid client_id from projects or clients table
    if (projectId) {
      const { data: proj } = await clientToUse
        .from("projects")
        .select("client_id")
        .eq("id", projectId)
        .maybeSingle()

      if (proj?.client_id) {
        clientId = proj.client_id
      }
    }

    if (clientId) {
      const { data: existingClient } = await clientToUse
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .maybeSingle()

      if (!existingClient) {
        const { data: fallbackClient } = await clientToUse
          .from("clients")
          .select("id")
          .limit(1)
          .maybeSingle()

        if (fallbackClient?.id) {
          clientId = fallbackClient.id
        }
      }
    }

    // 2. Ensure bucket exists using admin client
    const bucketName = "client-documents"
    if (admin) {
      const { data: buckets } = await admin.storage.listBuckets()
      const exists = buckets?.some((b) => b.name === bucketName)
      if (!exists) {
        await admin.storage.createBucket(bucketName, { public: true })
      }
    }

    // 3. Upload file to Supabase storage
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const filePath = `${clientId || "general"}/${projectId}/${crypto.randomUUID()}-${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    let uploadError: Error | null = null

    if (admin) {
      const { error: err } = await admin.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        })
      uploadError = err
    } else {
      const { error: err } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        })
      uploadError = err
    }

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // 4. Insert row into project_documents table
    const docPayload = {
      project_id: projectId,
      client_id: clientId || null,
      name: file.name,
      file_path: filePath,
      file_type: file.type || "application/octet-stream",
      file_size: file.size,
      uploaded_by: user.id,
    }

    let { data: doc, error: dbError } = await clientToUse
      .from("project_documents")
      .insert(docPayload)
      .select()
      .single()

    if (dbError && admin) {
      const adminRes = await admin
        .from("project_documents")
        .insert(docPayload)
        .select()
        .single()
      doc = adminRes.data
      dbError = adminRes.error
    }

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
