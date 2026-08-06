import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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

  // RLS gates the update: clients may only fulfill their own project's requests
  // (clients_requests_update), staff may update any (team_requests_all).
  const { data, error } = await supabase
    .from("document_requests")
    .update(updatePayload)
    .eq("id", requestId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ request: data })
}
