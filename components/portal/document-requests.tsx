"use client"

import { createClient } from "@/lib/supabase/client"
import { optimizeFileForUpload, CDN_UPLOAD_OPTIONS } from "@/lib/media-optimization"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useRef, useState, useEffect } from "react"
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

interface PortalRequest {
  id: string
  title: string
  description: string | null
  status: "pending" | "fulfilled"
  request_type: "document" | "info"
  priority: "normal" | "urgent"
  text_response: string | null
  requested_at: string
  linkedName: string | null
}

interface DocumentRequestsProps {
  clientId: string
  projectId: string
  requests: PortalRequest[]
}

function RequestItem({
  request,
  clientId,
  projectId,
}: {
  request: PortalRequest
  clientId: string
  projectId: string
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

    const { file: optimizedFile } = await optimizeFileForUpload(file)
    const safeName = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const path = `${clientId}/${projectId}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(path, optimizedFile, {
        ...CDN_UPLOAD_OPTIONS,
        contentType: optimizedFile.type || undefined,
      })

    if (uploadError) {
      setBusy(false)
      setError(uploadError.message)
      return
    }

    const { data: doc, error: rowError } = await supabase
      .from("project_documents")
      .insert({
        project_id: projectId,
        client_id: clientId,
        name: optimizedFile.name,
        file_path: path,
        file_type: optimizedFile.type || "application/octet-stream",
        file_size: optimizedFile.size,
        uploaded_by: user?.id ?? null,
      })
      .select("id")
      .single()

    if (rowError || !doc) {
      setBusy(false)
      setError(rowError?.message ?? "Could not save the upload.")
      return
    }

    try {
      await fetch("/api/document-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          status: "fulfilled",
          linkedDocumentId: doc.id,
        }),
      })
    } catch (err) {
      console.error("Error updating document request:", err)
    }

    setBusy(false)
    router.refresh()
  }

  async function fulfillWithText() {
    if (!textReply.trim()) return
    setBusy(true)
    setError(null)

    try {
      const res = await fetch("/api/document-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          status: "fulfilled",
          textResponse: textReply.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit response")
      }

      setShowReply(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit response")
    } finally {
      setBusy(false)
    }
  }

  const isFulfilled = request.status === "fulfilled"

  return (
    <div className="flex flex-col gap-3 bg-background p-4">
      {/* Header */}
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
            {isFulfilled
              ? `Responded · ${formatDate(request.requested_at)}`
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
            {/* Document upload */}
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

            {/* Info text reply */}
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

      {/* Show fulfilled text response */}
      {isFulfilled && request.text_response && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm">
          <p className="text-xs font-medium text-success mb-1">Your response:</p>
          <p className="text-foreground whitespace-pre-wrap">{request.text_response}</p>
        </div>
      )}

      {/* Inline reply box */}
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

      {/* Also allow document-type to have an alternative text answer */}
      {request.request_type === "document" && !isFulfilled && (
        <button
          type="button"
          onClick={() => setShowReply(!showReply)}
          className="text-left text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 w-fit"
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

export function DocumentRequests({
  clientId,
  projectId,
  requests: initialRequests,
}: DocumentRequestsProps) {
  const [requestsList, setRequestsList] = useState<PortalRequest[]>(initialRequests)
  const [prevInitialRequests, setPrevInitialRequests] = useState(initialRequests)
  if (prevInitialRequests !== initialRequests) {
    setPrevInitialRequests(initialRequests)
    setRequestsList(initialRequests)
  }

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`document-requests-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "document_requests",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // Update local state directly instead of re-fetching the whole page.
          if (payload.eventType === "INSERT") {
            const row = payload.new as unknown as PortalRequest
            setRequestsList((prev) => {
              if (prev.some((r) => r.id === row.id)) return prev
              return [row, ...prev]
            })
          } else if (payload.eventType === "UPDATE") {
            const row = payload.new as unknown as Partial<PortalRequest> & { id: string }
            setRequestsList((prev) =>
              prev.map((r) => (r.id === row.id ? { ...r, ...row } : r))
            )
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string }
            setRequestsList((prev) => prev.filter((r) => r.id !== old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  const pending = requestsList.filter((r) => r.status === "pending")
  const fulfilled = requestsList.filter((r) => r.status === "fulfilled")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileQuestion className="size-4" />
          Requests from your team
          {pending.length > 0 && (
            <Badge className="bg-warning/15 text-warning ml-1">
              {pending.length} pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Your development team has requested these files or information. Please
          respond to each one so they can move forward.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!requestsList.length ? (
          <p className="text-sm text-muted-foreground">
            Nothing requested right now — you&apos;re all caught up. ✅
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-foreground/10 overflow-hidden rounded-xl border border-foreground/10">
            {/* Pending first */}
            {pending.map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                clientId={clientId}
                projectId={projectId}
              />
            ))}
            {/* Then fulfilled */}
            {fulfilled.map((request) => (
              <RequestItem
                key={request.id}
                request={request}
                clientId={clientId}
                projectId={projectId}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
