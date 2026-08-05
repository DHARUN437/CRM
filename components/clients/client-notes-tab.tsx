"use client"

import { Loader2, StickyNote, Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate, type ClientNote } from "@/lib/portal-types"

export function ClientNotesTab({
  clientId,
  notes,
}: {
  clientId: string
  notes: ClientNote[]
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!body.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      })
      if (res.ok) {
        setBody("")
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex gap-2 p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Add a note about this client..."
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <Button
            onClick={handleAdd}
            disabled={!body.trim() || loading}
            size="icon-sm"
            className="self-end"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </CardContent>
      </Card>

      {!notes.length ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
            <StickyNote className="size-8 text-muted-foreground/50" />
            No notes yet. Add one above.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                <p className="mt-2 text-[11px] text-muted-foreground/70">
                  {note.author_name ?? "Team"} · {formatDate(note.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}