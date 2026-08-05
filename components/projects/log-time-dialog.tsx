"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Clock, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface LogTimeDialogProps {
  projectId: string
  tasks?: { id: string; title: string }[]
  presetTaskId?: string
}

export function LogTimeDialog({
  projectId,
  tasks = [],
  presetTaskId,
}: LogTimeDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [taskId, setTaskId] = useState(presetTaskId || "")
  const [hours, setHours] = useState("")
  const [description, setDescription] = useState("")
  const [loggedAt, setLoggedAt] = useState(new Date().toISOString().split("T")[0])
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hours || parseFloat(hours) <= 0) {
      setError("Please enter a valid number of hours.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/time-tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          taskId: taskId || undefined,
          hours: parseFloat(hours),
          description: description || undefined,
          loggedAt,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to log time")
      }

      setOpen(false)
      setHours("")
      setDescription("")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Clock className="size-4" />
            Log Hours
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <DialogTitle>Log Work Hours</DialogTitle>
          </div>
          <DialogDescription>
            Record time spent on development tasks for this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {tasks.length > 0 && !presetTaskId && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Associated Task (Optional)</Label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="">General Project Work</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Hours Worked *</Label>
              <Input
                type="number"
                step="0.25"
                min="0.25"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="2.5"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Date *</Label>
              <Input
                type="date"
                value={loggedAt}
                onChange={(e) => setLoggedAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Work Summary (Optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Fixed Auth RLS policies and built login form"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Save Time Entry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
