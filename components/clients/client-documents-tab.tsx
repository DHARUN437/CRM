"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { optimizeFileForUpload, CDN_UPLOAD_OPTIONS } from "@/lib/media-optimization"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, PackageOpen, Upload, Loader2, Download } from "lucide-react"
import { formatDate, formatBytes } from "@/lib/portal-types"

interface DocumentRow {
  id: string
  name: string
  file_type: string
  file_size: number
  created_at: string
  project_id?: string
  project_name?: string
  file_path?: string
}

interface ClientDocumentsTabProps {
  clientId: string
  documents: DocumentRow[]
  projects: { id: string; name: string }[]
}

export function ClientDocumentsTab({
  clientId,
  documents,
  projects,
}: ClientDocumentsTabProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id ?? ""
  )

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    if (!projects.length) {
      setError("Please create a project first before uploading project documents.")
      return
    }
    setUploading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const targetProjectId = selectedProjectId || projects[0]?.id

    for (const rawFile of Array.from(files)) {
      const { file: optimizedFile } = await optimizeFileForUpload(rawFile)
      const safeName = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")
      const path = `${clientId}/${targetProjectId}/${crypto.randomUUID()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(path, optimizedFile, {
          ...CDN_UPLOAD_OPTIONS,
          contentType: optimizedFile.type || undefined,
        })

      if (uploadError) {
        setUploading(false)
        setError(uploadError.message)
        return
      }

      const { error: rowError } = await supabase.from("project_documents").insert({
        project_id: targetProjectId,
        client_id: clientId,
        name: optimizedFile.name,
        file_path: path,
        file_type: optimizedFile.type || "application/octet-stream",
        file_size: optimizedFile.size,
        uploaded_by: user?.id ?? null,
      })

      if (rowError) {
        setUploading(false)
        setError(rowError.message)
        return
      }
    }

    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""
    router.refresh()
  }

  async function handleDownload(filePath?: string, fileName?: string) {
    if (!filePath) return
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(filePath, 60)

    if (error || !data?.signedUrl) {
      alert("Could not generate download link")
      return
    }

    const a = document.createElement("a")
    a.href = data.signedUrl
    a.download = fileName ?? "document"
    a.target = "_blank"
    a.click()
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Upload bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground">
            <Upload className="size-4" />
          </span>
          <div>
            <h4 className="text-sm font-medium">Upload Client Document</h4>
            <p className="text-xs text-muted-foreground">
              Upload proposals, agreements, invoices, or specifications directly to storage.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 1 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <Button
            size="sm"
            disabled={uploading || !projects.length}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload file
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!documents.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <PackageOpen className="size-8 text-muted-foreground/50" />
            No documents yet. Click &quot;Upload file&quot; above to add documents to this client&apos;s workspace.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-background p-4 transition-colors hover:border-foreground/25"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                  <FileText className="size-4 text-muted-foreground" />
                </span>
                <div className="flex min-w-0 flex-col">
                  <p className="truncate text-sm font-medium">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                    {doc.project_name && <> · {doc.project_name}</>}
                  </p>
                </div>
              </div>

              {doc.file_path && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDownload(doc.file_path, doc.name)}
                  title="Download Document"
                >
                  <Download className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}