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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FileQuestion, Loader2, AlertTriangle } from "lucide-react"

interface RequestDocumentDialogProps {
  projectId: string
}

export function RequestDocumentDialog({ projectId }: RequestDocumentDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"document" | "info">("document")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<"normal" | "urgent">("normal")
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
      request_type: type,
      priority,
    })

    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }

    setOpen(false)
    setTitle("")
    setDescription("")
    setType("document")
    setPriority("normal")
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
          <DialogTitle>Request from client</DialogTitle>
          <DialogDescription>
            Ask the client for a file or specific information needed for the
            project. It will appear in their portal immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Type */}
          <div className="flex flex-col gap-2">
            <Label>Request type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("document")}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors ${
                  type === "document"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-foreground/10 text-muted-foreground hover:border-foreground/20"
                }`}
              >
                <FileQuestion className="size-5" />
                File / Document
              </button>
              <button
                type="button"
                onClick={() => setType("info")}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors ${
                  type === "info"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-foreground/10 text-muted-foreground hover:border-foreground/20"
                }`}
              >
                <span className="text-lg leading-none">✍️</span>
                Information / Text
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="req-title">
              {type === "document" ? "What file do you need?" : "What info do you need?"}
            </Label>
            <Input
              id="req-title"
              placeholder={
                type === "document"
                  ? "e.g. Company logo (SVG + PNG)"
                  : "e.g. Preferred brand colours and fonts"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="req-desc">Details (optional)</Label>
            <Textarea
              id="req-desc"
              placeholder={
                type === "document"
                  ? "Format requirements, size, how it will be used…"
                  : "Provide context so the client knows exactly what you need…"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="req-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as "normal" | "urgent")}>
              <SelectTrigger id="req-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="size-3.5 text-warning" />
                    Urgent
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
