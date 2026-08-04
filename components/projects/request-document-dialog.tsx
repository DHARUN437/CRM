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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FileQuestion, Loader2 } from "lucide-react"

interface RequestDocumentDialogProps {
  projectId: string
}

export function RequestDocumentDialog({
  projectId,
}: RequestDocumentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: err } = await supabase.from("document_requests").insert({
      project_id: projectId,
      title: title.trim(),
      description: description.trim() || null,
    })

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }

    setOpen(false)
    setTitle("")
    setDescription("")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <FileQuestion className="size-4" />
            Request from client
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a document</DialogTitle>
          <DialogDescription>
            Ask the client to send something — brand assets, copy, approvals.
            It appears in their portal and they can upload it directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="req-title">What do you need?</Label>
            <Input
              id="req-title"
              placeholder="e.g. Logo pack (SVG + PNG)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="req-desc">Details (optional)</Label>
            <Textarea
              id="req-desc"
              placeholder="Format, deadline, what it will be used for…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || saving}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
