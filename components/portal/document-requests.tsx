"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import {
  CheckCircle2,
  CloudUpload,
  FileQuestion,
  Loader2,
} from "lucide-react"
import { formatDate } from "@/lib/portal-types"

interface PortalRequest {
  id: string
  title: string
  description: string | null
  status: "pending" | "fulfilled"
  requested_at: string
  linkedName: string | null
}

interface DocumentRequestsProps {
  clientId: string
  projectId: string
  requests: PortalRequest[]
}

export function DocumentRequests({
  clientId,
  projectId,
  requests,
}: DocumentRequestsProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pending = requests.filter((r) => r.status === "pending")

  async function fulfill(request: PortalRequest, file: File) {
    setBusyId(request.id)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
    const path = `${clientId}/${projectId}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(path, file, { upsert: false })

    if (uploadError) {
      setBusyId(null)
      setError(uploadError.message)
      return
    }

    const { data: doc, error: rowError } = await supabase
      .from("project_documents")
      .insert({
        project_id: projectId,
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
      setBusyId(null)
      setError(rowError?.message ?? "Could not save the upload.")
      return
    }

    const { error: updateError } = await supabase
      .from("document_requests")
      .update({
        status: "fulfilled",
        fulfilled_at: new Date().toISOString(),
        linked_document_id: doc.id,
      })
      .eq("id", request.id)

    setBusyId(null)
    if (updateError) {
      setError(updateError.message)
      return
    }

    if (inputRef.current) inputRef.current.value = ""
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileQuestion className="size-4" />
          Documents the team needs from you
        </CardTitle>
        <CardDescription>
          Files requested by your team — upload them here and they&apos;re shared
          instantly.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {!requests.length ? (
          <p className="text-sm text-muted-foreground">
            Nothing requested right now — you&apos;re all caught up.
          </p>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
            {requests.map((request, index) => {
              const busy = busyId === request.id
              return (
                <div key={request.id}>
                  {index > 0 && <Separator />}
                  <div className="flex flex-col gap-3 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="text-sm font-medium">{request.title}</p>
                      {request.description && (
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {request.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {request.status === "fulfilled"
                          ? `Uploaded${request.linkedName ? ` — ${request.linkedName}` : ""} · ${formatDate(request.requested_at)}`
                          : `Requested ${formatDate(request.requested_at)}`}
                      </p>
                    </div>

                    {request.status === "fulfilled" ? (
                      <Badge className="shrink-0 bg-success/15 text-success">
                        <CheckCircle2 className="size-3" />
                        Received
                      </Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        disabled={busy}
                        onClick={() => inputRef.current?.click()}
                      >
                        {busy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CloudUpload className="size-4" />
                        )}
                        Upload to fulfill
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const request = pending[0]
            const file = e.target.files?.[0]
            if (request && file) fulfill(request, file)
          }}
        />
      </CardContent>
    </Card>
  )
}
