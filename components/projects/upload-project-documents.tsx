"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { Upload, Loader2 } from "lucide-react"
import { optimizeFileForUpload, CDN_UPLOAD_OPTIONS } from "@/lib/media-optimization"

interface UploadProjectDocumentsProps {
  clientId: string
  projectId: string
}

export function UploadProjectDocuments({
  clientId,
  projectId,
}: UploadProjectDocumentsProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    for (const rawFile of Array.from(files)) {
      const { file: optimizedFile } = await optimizeFileForUpload(rawFile)
      const safeName = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")
      const path = `${clientId}/${projectId}/${crypto.randomUUID()}-${safeName}`

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

      const { error: rowError } = await supabase
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

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Upload className="size-4" />
        )}
        Upload files
      </Button>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  )
}
