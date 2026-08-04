"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Eye, Loader2 } from "lucide-react"
import type { ProjectDocument } from "@/lib/portal-types"

export function DocumentPreviewLink({ doc }: { doc: ProjectDocument }) {
  const [loading, setLoading] = useState(false)

  async function open() {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from("client-documents")
      .createSignedUrl(doc.file_path, 3600, {
        download: doc.name,
      })
    setLoading(false)

    if (error) {
      alert("Could not open this document. Please try again.")
      return
    }
    window.open(data.signedUrl, "_blank")
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={open}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Eye className="size-4" />
      )}
      Open
    </Button>
  )
}
