"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { type ProjectStatus, PROJECT_STATUS_META } from "@/lib/portal-types"

interface TeamLeadOption {
  id: string
  name: string
}

interface EditProjectDialogProps {
  project: {
    id: string
    name: string
    description: string | null
    status: string
    tech_stack: string[]
    start_date: string | null
    due_date: string | null
    progress: number
    tl_id: string | null
    budget: number | null
  }
  teamLeads: TeamLeadOption[]
}

const STATUS_OPTIONS: ProjectStatus[] = [
  "kickoff",
  "in_progress",
  "in_review",
  "on_hold",
  "completed",
]

export function EditProjectDialog({ project, teamLeads }: EditProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? "")
  const [status, setStatus] = useState<ProjectStatus>(project.status as ProjectStatus)
  const [techStack, setTechStack] = useState(project.tech_stack.join(", "))
  const [startDate, setStartDate] = useState(project.start_date ?? "")
  const [dueDate, setDueDate] = useState(project.due_date ?? "")
  const [progress, setProgress] = useState(project.progress.toString())
  const [tlId, setTlId] = useState(project.tl_id ?? "")
  const [tlLabel, setTlLabel] = useState(
    project.tl_id ? (teamLeads.find((tl) => tl.id === project.tl_id)?.name ?? "") : ""
  )
  const [budget, setBudget] = useState(project.budget != null ? project.budget.toString() : "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        description: description.trim(),
        status,
        tech_stack: techStack
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        start_date: startDate || null,
        due_date: dueDate || null,
        progress: parseInt(progress) || 0,
        tl_id: tlId || null,
        budget: budget ? parseFloat(budget) : null,
      }),
    })

    const json = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? "Could not update project.")
      return
    }

    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Edit project
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
          <DialogDescription>
            Update the details, Team Lead and budget for this project.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ep-name">Project name</Label>
            <Input
              id="ep-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ep-desc">Description</Label>
            <Textarea
              id="ep-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of the project…"
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ep-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger id="ep-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROJECT_STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ep-progress">Progress (%)</Label>
            <Input
              id="ep-progress"
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(e.target.value)}
            />
          </div>

          {/* Team Lead */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ep-tl">Team Lead</Label>
            <Select
              value={tlId || "__none__"}
              onValueChange={(v) => {
                const val = v ?? ""
                if (val === "__none__") {
                  setTlId("")
                  setTlLabel("")
                } else {
                  setTlId(val)
                  const found = teamLeads.find((tl) => tl.id === val)
                  setTlLabel(found?.name ?? "")
                }
              }}
            >
              <SelectTrigger id="ep-tl">
                <SelectValue placeholder="No Team Lead">
                  {tlLabel || (tlId ? undefined : undefined)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Team Lead</SelectItem>
                {teamLeads.map((tl) => (
                  <SelectItem key={tl.id} value={tl.id}>
                    {tl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ep-budget">Budget (₹)</Label>
            <Input
              id="ep-budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          {/* Tech Stack */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="ep-stack">Tech stack</Label>
            <Input
              id="ep-stack"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="Next.js, Tailwind, Supabase…"
            />
          </div>

          {/* Dates */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="ep-start">Start date</Label>
            <Input
              id="ep-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ep-due">Due date</Label>
            <Input
              id="ep-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
