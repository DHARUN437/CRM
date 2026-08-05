"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  FileQuestion,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react"
import { formatDate } from "@/lib/portal-types"

interface OverviewRequest {
  id: string
  project_id: string
  title: string
  description: string | null
  status: "pending" | "fulfilled"
  request_type: "document" | "info"
  priority: "normal" | "urgent"
  text_response: string | null
  requested_at: string
  fulfilled_at: string | null
  linked_document_id: string | null
  project_name: string
  linked_name: string | null
}

interface PortalRequestsOverviewProps {
  clientId: string
  requests: OverviewRequest[]
}

function OverviewRequestItem({
  request,
  clientId,
}: {
  request: OverviewRequest
  clientId: string
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [textReply, setTextReply] = useState("")
  const [showReply, setShowReply] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fulfillWithFile(file: File) {
    setBusy(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const path = `${clientId}/${request.project_id}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setBusy(false)
      setError(uploadError.message)
      return
    }

    const { data: doc, error: rowError } = await supabase
      .from("project_documents")
      .insert({
        project_id: request.project_id,
        client_id: clientId,
        name: file.name,
        file_path: path,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
        uploaded_by: user?.id ?? null,
      })
      .select("id")
      .single()

    if (rowError || !doc) {
      setBusy(false)
      setError(rowError?.message ?? "Could not save the upload.")
      return
    }

    await supabase
      .from("document_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        linked_document_id: doc.id,
      })
      .eq("id", request.id)

    setBusy(false)
    router.refresh()
  }

  async function fulfillWithText() {
    if (!textReply.trim()) return
    setBusy(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase
      .from("document_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        text_response: textReply.trim(),
      })
      .eq("id", request.id)

    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }

    setShowReply(false)
    router.refresh()
  }

  const isFulfilled = request.status === "fulfilled"

  return (
    <div className="flex flex-col gap-3 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {request.request_type === "info" ? (
              <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <FileQuestion className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <p className="text-sm font-medium">{request.title}</p>
            {request.priority === "urgent" && (
              <Badge className="bg-destructive/15 text-destructive">
                <AlertTriangle className="size-3" />
                Urgent
              </Badge>
            )}
          </div>
          {request.description && (
            <p className="text-xs text-muted-foreground">{request.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {request.project_name} ·{" "}
            {isFulfilled
              ? `Responded ${formatDate(request.fulfilled_at)}`
              : `Requested ${formatDate(request.requested_at)}`}
          </p>
        </div>

        {isFulfilled ? (
          <Badge className="shrink-0 bg-success/15 text-success">
            <CheckCircle2 className="size-3" />
            Done
          </Badge>
        ) : (
          <div className="flex shrink-0 items-center gap-2">
            {request.request_type === "document" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CloudUpload className="size-4" />
                  )}
                  Upload file
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) fulfillWithFile(file)
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                />
              </>
            )}

            {request.request_type === "info" && !showReply && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReply(true)}
              >
                <MessageSquare className="size-4" />
                Reply
              </Button>
            )}
          </div>
        )}
      </div>

      {isFulfilled && request.text_response && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm">
          <p className="mb-1 text-xs font-medium text-success">Your response:</p>
          <p className="whitespace-pre-wrap text-foreground">
            {request.text_response}
          </p>
        </div>
      )}
      {isFulfilled && request.linked_name && (
        <p className="text-xs text-muted-foreground">
          Uploaded: {request.linked_name}
        </p>
      )}

      {showReply && !isFulfilled && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={textReply}
            onChange={(e) => setTextReply(e.target.value)}
            placeholder="Type your response here…"
            rows={3}
            className="text-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={fulfillWithText}
              disabled={!textReply.trim() || busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Submit response
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowReply(false)}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {request.request_type === "document" && !isFulfilled && (
        <button
          type="button"
          onClick={() => setShowReply(!showReply)}
          className="w-fit text-left text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {showReply ? "Hide text reply" : "Or send a text response instead"}
        </button>
      )}

      {showReply && request.request_type === "document" && !isFulfilled && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={textReply}
            onChange={(e) => setTextReply(e.target.value)}
            placeholder="Type your response here instead of uploading a file…"
            rows={3}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={fulfillWithText}
            disabled={!textReply.trim() || busy}
            className="w-fit"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Submit response
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

export function PortalRequestsOverview({
  clientId,
  requests,
}: PortalRequestsOverviewProps) {
  const pending = requests.filter((r) => r.status === "pending")

  if (!pending.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <FileQuestion className="size-10 text-muted-foreground/50" />
          No open requests right now — you&apos;re all caught up.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
      {pending.map((request) => (
        <OverviewRequestItem
          key={request.id}
          request={request}
          clientId={clientId}
        />
      ))}
    </div>
  )
}
