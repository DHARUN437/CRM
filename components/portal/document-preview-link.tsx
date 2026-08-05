"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Download, Eye, Loader2 } from "lucide-react"
import type { ProjectDocument } from "@/lib/portal-types"

export function DocumentPreviewLink({ doc }: { doc: ProjectDocument }) {
  const [busy, setBusy] = useState(false)
  const [action, setAction] = useState<"open" | "download">("open")

  async function handleAccess(download: boolean) {
    setBusy(true)
    setAction(download ? "download" : "open")
    try {
      const res = await fetch(
        `/api/documents/download?path=${encodeURIComponent(doc.file_path)}&name=${encodeURIComponent(doc.name)}&download=${download}`
      )
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not access document")
      }
      window.open(data.url, "_blank")
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Could not open this document. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleAccess(false)}
        disabled={busy}
      >
        {busy && action === "open" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Eye className="size-4" />
        )}
        Open
      </Button>

      <Button
        size="sm"
        onClick={() => handleAccess(true)}
        disabled={busy}
      >
        {busy && action === "download" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Download
      </Button>
    </div>
  )
}
