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
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AssignWorkersProps {
  projectId: string
  workers: { id: string; name: string }[]
  assignedIds: string[]
}

export function AssignWorkers({
  projectId,
  workers,
  assignedIds,
}: AssignWorkersProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds))
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function save() {
    setSaving(true)
    const supabase = createClient()
    const toAdd = [...selected].filter((id) => !assignedIds.includes(id))
    const toRemove = assignedIds.filter((id) => !selected.has(id))

    if (toAdd.length) {
      await supabase.from("project_assignments").insert(
        toAdd.map((team_member_id) => ({ project_id: projectId, team_member_id }))
      )
    }
    if (toRemove.length) {
      await supabase
        .from("project_assignments")
        .delete()
        .eq("project_id", projectId)
        .in("team_member_id", toRemove)
    }

    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UserPlus className="size-4" />
            Manage workers
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign workers</DialogTitle>
          <DialogDescription>
            Choose who works on this project. Assigned workers can view it and
            update its status.
          </DialogDescription>
        </DialogHeader>

        {!workers.length ? (
          <p className="rounded-lg bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
            No workers yet — add them under Team in the sidebar first.
          </p>
        ) : (
          <div className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {workers.map((worker) => {
              const checked = selected.has(worker.id)
              return (
                <button
                  key={worker.id}
                  type="button"
                  onClick={() => toggle(worker.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    checked
                      ? "border-primary/50 bg-primary/10"
                      : "border-foreground/10 hover:border-foreground/25"
                  )}
                >
                  <span className="font-medium">{worker.name}</span>
                  {checked ? (
                    <Badge>Assigned</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not assigned</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <DialogFooter>
          <Button onClick={save} disabled={saving || !workers.length} className="w-full sm:w-auto">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}