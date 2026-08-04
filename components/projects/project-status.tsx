"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import {
  PROJECT_STATUS_META,
  type ProjectStatus,
} from "@/lib/portal-types"

const STATUS_OPTIONS: ProjectStatus[] = [
  "kickoff",
  "in_progress",
  "in_review",
  "on_hold",
  "completed",
]

interface ProjectStatusProps {
  projectId: string
  status: ProjectStatus
  progress: number
}

export function ProjectStatusUpdater({
  projectId,
  status,
  progress,
}: ProjectStatusProps) {
  const router = useRouter()
  const [value, setValue] = useState<ProjectStatus>(status)
  const [progressValue, setProgressValue] = useState(progress)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const dirty =
    value !== status || progressValue !== progress

  async function save() {
    if (!dirty) return
    setSaving(true)
    setSaved(false)

    const supabase = createClient()
    const { error } = await supabase
      .from("projects")
      .update({ status: value, progress: progressValue })
      .eq("id", projectId)

    setSaving(false)
    if (error) {
      alert(`Could not update: ${error.message}`)
      return
    }

    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-foreground/10 p-4">
      <div className="flex flex-col gap-2">
        <Label>Status</Label>
        <Select
          value={value}
          onValueChange={(v) => setValue((v as ProjectStatus) ?? "kickoff")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {PROJECT_STATUS_META[option].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="progress">Progress — {progressValue}%</Label>
        <div className="flex items-center gap-3">
          <input
            id="progress"
            type="range"
            min={0}
            max={100}
            step={5}
            value={progressValue}
            onChange={(e) => setProgressValue(Number(e.target.value))}
            className="w-full accent-foreground"
          />
        </div>
      </div>

      <Button onClick={save} disabled={!dirty || saving} className="w-full">
        {saving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : saved ? (
          <Check className="size-4" />
        ) : null}
        {saved ? "Saved" : "Update status"}
      </Button>
    </div>
  )
}