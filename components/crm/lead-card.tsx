"use client"

import { useState } from "react"
import { Clock, GripVertical, Loader2, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { currency, relativeTime, type Lead } from "@/lib/crm"
import { cn } from "@/lib/utils"

function scoreColor(score: number) {
  if (score >= 85) return "text-success"
  if (score >= 70) return "text-warning"
  return "text-muted-foreground"
}

export function LeadCard({
  lead,
  onDragStart,
  dragging,
  onDelete,
  canDelete,
}: {
  lead: Lead
  onDragStart: (e: React.DragEvent, id: string) => void
  dragging?: boolean
  onDelete?: (id: string) => void
  canDelete?: boolean
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (!onDelete || deleting) return
    setDeleting(true)
    setError(null)
    try {
      await onDelete(lead.id)
      setConfirmOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete lead.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <article
        draggable
        onDragStart={(e) => onDragStart(e, lead.id)}
        className={cn(
          "group cursor-grab rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:cursor-grabbing",
          dragging && "opacity-40",
        )}
      >
        <div className="flex items-start gap-2.5">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback
              style={{ background: lead.color }}
              className="text-[10px] font-semibold text-white"
            >
              {lead.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">{lead.company}</p>
            <p className="truncate text-xs text-muted-foreground">{lead.contact}</p>
          </div>
          <div className="flex items-center gap-0.5">
            {canDelete && (
              <button
                type="button"
                aria-label={`Delete lead ${lead.company}`}
                onClick={() => setConfirmOpen(true)}
                className="rounded-md p-1 text-muted-foreground/40 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <GripVertical className="size-4 shrink-0 text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {lead.tags.map((t) => (
            <Badge key={t} variant="outline" className="h-5 text-[10px]">
              {t}
            </Badge>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
          <span className="text-sm font-semibold tracking-tight">
            {currency(lead.value)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-muted-foreground">Score</span>
            <span className={cn("text-sm font-semibold", scoreColor(lead.score))}>
              {lead.score}
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" />
            {relativeTime(lead.updated_at)}
          </span>
          <span className="inline-flex items-center gap-1">
            {lead.source && (
              <span className="rounded bg-muted px-1.5 py-0.5">{lead.source}</span>
            )}
          </span>
        </div>
      </article>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {lead.company}?</DialogTitle>
            <DialogDescription>
              This lead will be removed from the pipeline. The record is kept
              on file and can be restored by an admin.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
