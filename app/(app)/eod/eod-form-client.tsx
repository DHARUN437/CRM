"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Upload, FileCheck, CheckCircle2, Calendar, HardDrive, AlertCircle, FileText } from "lucide-react"

export interface MonthlyTaskItem {
  id: string
  title: string
  description?: string | null
  month: string
  due_date: string
  status: "not_started" | "in_progress" | "completed"
}

interface EODFormClientProps {
  userId: string
  initialReport: any | null
  initialTasks: MonthlyTaskItem[]
}

export function EODFormClient({
  userId,
  initialReport,
  initialTasks,
}: EODFormClientProps) {
  const router = useRouter()
  const todayStr = new Date().toISOString().split("T")[0]

  const [reportDate, setReportDate] = useState<string>(initialReport?.report_date || todayStr)
  const [workSummary, setWorkSummary] = useState<string>(initialReport?.work_summary || "")
  const [blockers, setBlockers] = useState<string>(initialReport?.blockers || "")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Task selection, completion, & per-task note state
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(
    (initialReport?.eod_task_updates || []).map((u: any) => u.monthly_task_id)
  )
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const [taskNotesMap, setTaskNotesMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const u of initialReport?.eod_task_updates || []) {
      if (u.monthly_task_id && u.note) {
        map[u.monthly_task_id] = u.note
      }
    }
    return map
  })

  function toggleTaskSelection(taskId: string) {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId))
      setCompletedTaskIds(completedTaskIds.filter((id) => id !== taskId))
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId])
    }
  }

  function toggleTaskCompletion(taskId: string) {
    if (completedTaskIds.includes(taskId)) {
      setCompletedTaskIds(completedTaskIds.filter((id) => id !== taskId))
    } else {
      setCompletedTaskIds([...completedTaskIds, taskId])
      if (!selectedTaskIds.includes(taskId)) {
        setSelectedTaskIds([...selectedTaskIds, taskId])
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!workSummary.trim()) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    let uploadedDriveFiles: any[] = []

    try {
      // 1. Upload files to Google Drive FIRST if files selected
      if (selectedFiles.length > 0) {
        setUploadingFiles(true)
        const formData = new FormData()
        formData.append("reportDate", reportDate)
        for (const file of selectedFiles) {
          formData.append("file", file)
        }

        const uploadRes = await fetch("/api/eod-reports/upload", {
          method: "POST",
          body: formData,
        })

        const uploadData = await uploadRes.json()

        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Google Drive file upload failed.")
        }

        uploadedDriveFiles = uploadData.files || []
        setUploadingFiles(false)
      }

      // 2. Save EOD report, work sessions, and task links
      const taskUpdates = selectedTaskIds.map((id) => ({
        taskId: id,
        markedCompleted: completedTaskIds.includes(id),
        note: taskNotesMap[id] || undefined,
      }))

      const saveRes = await fetch("/api/eod-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate,
          workSummary: workSummary.trim(),
          blockers: blockers.trim() || undefined,
          attachments: uploadedDriveFiles,
          taskUpdates,
        }),
      })

      const saveData = await saveRes.json()

      if (!saveRes.ok) {
        throw new Error(saveData.error || "Failed to save EOD report.")
      }

      setSuccess("EOD Report & Work Sessions successfully saved to Google Drive & Task History!")
      setSelectedFiles([])
      router.refresh()
    } catch (err: any) {
      console.error("EOD Submission error:", err)
      setError(err.message || "Failed to submit EOD report.")
    } finally {
      setSubmitting(false)
      setUploadingFiles(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card className="bg-[var(--surface)] border-[var(--border)]/60 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="size-5 text-[var(--accent)]" />
              Daily Summary for {reportDate}
            </CardTitle>
            {initialReport && (
              <Badge className="bg-[var(--accent-tint)] text-[var(--accent)] font-semibold">
                Updating Submitted Entry
              </Badge>
            )}
          </div>
          <CardDescription>
            Record what you accomplished today, optional blockers, files, and update assigned monthly tasks.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="eod-date">Report Date</Label>
            <Input
              id="eod-date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="max-w-xs"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="eod-summary">What did you work on today? *</Label>
            <Textarea
              id="eod-summary"
              rows={4}
              placeholder="Detail your completed deliverables, code updates, client communications, or milestone progress..."
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="eod-blockers">Blockers / Notes (Optional)</Label>
            <Textarea
              id="eod-blockers"
              rows={2}
              placeholder="Any impediments, missing client feedback, or technical blockers?"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
            />
          </div>

          {/* Active Monthly Tasks Picker with Optional Per-Task Note */}
          {initialTasks.length > 0 && (
            <div className="flex flex-col gap-3 pt-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[var(--accent)]" />
                Select Monthly Tasks Worked On Today
              </Label>
              <div className="flex flex-col gap-3 bg-[var(--background)] p-3.5 rounded-xl border border-[var(--border)]/60">
                {initialTasks.map((task) => {
                  const isSelected = selectedTaskIds.includes(task.id)
                  const isCompleted = completedTaskIds.includes(task.id)

                  return (
                    <div
                      key={task.id}
                      className={`flex flex-col gap-2.5 p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-[var(--accent-tint)]/40 border-[var(--accent)]/40 shadow-xs"
                          : "bg-[var(--surface)] border-[var(--border)]/40"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            id={`task-${task.id}`}
                            checked={isSelected}
                            onChange={() => toggleTaskSelection(task.id)}
                            className="mt-0.5 size-4 rounded border-border text-[var(--accent)] focus:ring-[var(--accent)] cursor-pointer"
                          />
                          <div className="flex flex-col gap-0.5">
                            <label
                              htmlFor={`task-${task.id}`}
                              className="text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                            >
                              {task.title}
                            </label>
                            {task.description && (
                              <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">
                                {task.description}
                              </p>
                            )}
                            <span className="text-[10px] text-[var(--text-muted)]">
                              Due: {task.due_date} · Status: {task.status.replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <Button
                            type="button"
                            size="sm"
                            variant={isCompleted ? "default" : "outline"}
                            onClick={() => toggleTaskCompletion(task.id)}
                            className={`text-xs h-7 px-3 rounded-lg font-semibold shrink-0 transition-all ${
                              isCompleted ? "bg-[#15803D] hover:bg-[#166534] text-white shadow-xs" : "text-[var(--text-secondary)]"
                            }`}
                          >
                            <CheckCircle2 className="size-3.5 mr-1" />
                            {isCompleted ? "Marked Complete" : "Mark as Complete"}
                          </Button>
                        )}
                      </div>

                      {/* Optional Task-Specific Note Prompt */}
                      {isSelected && (
                        <div className="pl-7 pt-1">
                          <Input
                            type="text"
                            placeholder="Optional task-specific note (e.g. Worked on RLS migration & trigger fixes)..."
                            value={taskNotesMap[task.id] || ""}
                            onChange={(e) => setTaskNotesMap({ ...taskNotesMap, [task.id]: e.target.value })}
                            className="text-xs h-8 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Google Drive File Attachment Upload */}
          <div className="flex flex-col gap-2 pt-2">
            <Label className="flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="size-4 text-[var(--accent)]" />
              Attachments (Google Drive Upload)
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="file"
                multiple
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                className="max-w-md text-xs"
              />
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Files will upload directly into Google Drive folder: <span className="font-mono">Google Drive / {userId.slice(0, 6)} / {reportDate}</span> (Max 25MB per file).
            </p>

            {selectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedFiles.map((f, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-[var(--background)]">
                    <FileCheck className="size-3 mr-1 text-[var(--accent)]" />
                    {f.name} ({(f.size / 1024 / 1024).toFixed(1)}MB)
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Error / Success Feedback */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-success/15 text-success text-xs font-semibold">
              <CheckCircle2 className="size-4 shrink-0" />
              {success}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="submit"
              disabled={!workSummary.trim() || submitting}
              className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] px-6"
            >
              {submitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {uploadingFiles ? "Uploading to Drive…" : initialReport ? "Update EOD Report" : "Submit EOD Report"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
