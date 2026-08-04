"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { CloudUpload, FileUp, Loader2, X } from "lucide-react"
import type { Project } from "@/lib/portal-types"
import { cn } from "@/lib/utils"

interface UploadDocumentsProps {
  clientId: string
  projects: Pick<Project, "id" | "name">[]
  presetProjectId?: string
  label?: string
  variant?: "default" | "outline"
}

interface PendingFile {
  file: File
  status: "pending" | "uploading" | "done" | "error"
  error?: string
}

export function UploadDocuments({
  clientId,
  projects,
  presetProjectId,
  label = "Upload documents",
  variant = "default",
}: UploadDocumentsProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState(presetProjectId ?? "")
  const [files, setFiles] = useState<PendingFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onPickFiles(list: FileList | null) {
    if (!list) return
    const next = Array.from(list).map((file) => ({ file, status: "pending" as const }))
    setFiles((prev) => [...prev, ...next])
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    if (!projectId || files.length === 0) return
    setUploading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const updated = [...files]
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i]
      if (item.status === "done") continue

      updated[i] = { ...item, status: "uploading" }
      setFiles([...updated])

      const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
      const path = `${clientId}/${projectId}/${crypto.randomUUID()}-${safeName}`

      const { error: uploadError } = await supabase.storage
        .from("client-documents")
        .upload(path, item.file, { upsert: false })

      if (uploadError) {
        updated[i] = { ...item, status: "error", error: uploadError.message }
        setFiles([...updated])
        continue
      }

      const { error: rowError } = await supabase.from("project_documents").insert({
        project_id: projectId,
        client_id: clientId,
        name: item.file.name,
        file_path: path,
        file_type: item.file.type || "application/octet-stream",
        file_size: item.file.size,
        uploaded_by: user?.id ?? null,
      })

      if (rowError) {
        updated[i] = { ...item, status: "error", error: rowError.message }
      } else {
        updated[i] = { ...item, status: "done" }
      }
      setFiles([...updated])
    }

    setUploading(false)

    const failed = updated.some((f) => f.status === "error")
    const succeeded = updated.some((f) => f.status === "done")

    if (succeeded && !failed) {
      setOpen(false)
      setFiles([])
      setProjectId(presetProjectId ?? "")
      router.refresh()
    } else if (failed) {
      setError("Some files failed to upload. See the list below.")
    }
  }

  const canUpload = projectId && files.length > 0 && !uploading

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={variant}>
            <CloudUpload className="size-4" />
            {label}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload documents</DialogTitle>
          <DialogDescription>
            Files are shared securely with your development team.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="upload-project">Project</Label>
            <Select
              value={projectId}
              onValueChange={(v) => setProjectId(v ?? "")}
              disabled={Boolean(presetProjectId)}
            >
              <SelectTrigger id="upload-project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Files</Label>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/20 px-4 py-8 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
            >
              <FileUp className="size-5" />
              Click to choose files (PDF, Word, images, archives…)
            </button>

            {files.length > 0 && (
              <ul className="flex flex-col gap-2">
                {files.map((item, index) => (
                  <li
                    key={`${item.file.name}-${index}`}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border border-foreground/10 px-3 py-2 text-sm",
                      item.status === "error" && "border-destructive/40"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate">{item.file.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {(item.file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {item.status === "uploading" && (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      )}
                      {item.status === "done" && (
                        <span className="text-xs text-success">Uploaded</span>
                      )}
                      {item.status === "error" && (
                        <span className="text-xs text-destructive">{item.error}</span>
                      )}
                      {item.status !== "uploading" && (
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleUpload}
            disabled={!canUpload}
            className="w-full sm:w-auto"
          >
            {uploading && <Loader2 className="size-4 animate-spin" />}
            {uploading ? "Uploading…" : "Upload to team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
