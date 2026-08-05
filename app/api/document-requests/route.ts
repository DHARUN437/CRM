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

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { requestId, status = "fulfilled", textResponse, linkedDocumentId } = body

  if (!requestId) {
    return NextResponse.json({ error: "Missing requestId" }, { status: 400 })
  }

  const updatePayload: Record<string, string | null> = {
    status,
    fulfilled_at: new Date().toISOString(),
  }

  if (typeof textResponse === "string") {
    updatePayload.text_response = textResponse
  }
  if (linkedDocumentId) {
    updatePayload.linked_document_id = linkedDocumentId
  }

  // 1. Try standard client
  let { data, error } = await supabase
    .from("document_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .select()
    .single()

  // 2. Fallback to admin client if RLS policy recursion occurs
  if (error && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = getAdminClient()
    if (admin) {
      const adminRes = await admin
        .from("document_requests")
        .update(updatePayload)
        .eq("id", requestId)
        .select()
        .single()
      data = adminRes.data
      error = adminRes.error
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ request: data })
}
