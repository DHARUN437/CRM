"use client"

import { useState, type ReactElement } from "react"
import { useRouter } from "next/navigation"
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
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
import { Loader2, Calendar } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface ScheduleMeetingDialogProps {
  clientId?: string | null
  projects?: { id: string; name: string }[]
  trigger?: ReactElement
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const TIME_SLOTS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
]

export function ScheduleMeetingDialog({
  projects = [],
  trigger,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: ScheduleMeetingDialogProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isMobile = useIsMobile()

  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split("T")[0]

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [projectId, setProjectId] = useState<string>("none")
  const [requestedDate, setRequestedDate] = useState(tomorrowStr)
  const [requestedTime, setRequestedTime] = useState("10:00 AM")
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSchedule() {
    if (!title.trim() || !requestedDate || !requestedTime) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          projectId: projectId !== "none" ? projectId : undefined,
          requestedDate,
          requestedTime,
          durationMinutes,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to schedule meeting request.")
      }

      setOpen(false)
      setTitle("")
      setDescription("")
      setProjectId("none")
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to schedule meeting request.")
    } finally {
      setSaving(false)
    }
  }

  const formFields = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="mtg-title">Meeting Topic / Purpose *</Label>
        <Input
          id="mtg-title"
          placeholder="e.g. Q3 Design Review & Milestone Demo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {projects.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Related Project (Optional)</Label>
          <Select value={projectId} onValueChange={(v) => { if (v) setProjectId(v) }}>
            <SelectTrigger>
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">General / No specific project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="mtg-date">Preferred Date *</Label>
          <Input
            id="mtg-date"
            type="date"
            min={new Date().toISOString().split("T")[0]}
            value={requestedDate}
            onChange={(e) => setRequestedDate(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Preferred Time *</Label>
          <Select value={requestedTime} onValueChange={(v) => { if (v) setRequestedTime(v) }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Estimated Duration</Label>
        <Select
          value={String(durationMinutes)}
          onValueChange={(v) => setDurationMinutes(Number(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 minutes</SelectItem>
            <SelectItem value="30">30 minutes</SelectItem>
            <SelectItem value="45">45 minutes</SelectItem>
            <SelectItem value="60">60 minutes (1 hour)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="mtg-desc">Notes / Agenda (Optional)</Label>
        <Textarea
          id="mtg-desc"
          placeholder="Share any topics, questions, or agenda items for the team…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {trigger && <DrawerTrigger render={trigger} />}
        <DrawerContent className="px-4">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-[var(--accent)]" />
              Schedule a Meeting
            </DrawerTitle>
            <DrawerDescription>
              Request a meeting slot with your agency project team.
            </DrawerDescription>
          </DrawerHeader>
          {formFields}
          <DrawerFooter className="px-0 pt-4 pb-8">
            <Button
              onClick={handleSchedule}
              disabled={!title.trim() || saving}
              className="w-full bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
            >
              {saving && <Loader2 className="size-4 animate-spin mr-2" />}
              Request Meeting
            </Button>
            <DrawerClose render={<Button variant="outline" className="w-full">Cancel</Button>} />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-[var(--accent)]" />
            Schedule a Meeting
          </DialogTitle>
          <DialogDescription>
            Request a meeting slot with your agency project team.
          </DialogDescription>
        </DialogHeader>
        {formFields}
        <DialogFooter className="mt-4">
          <Button
            onClick={handleSchedule}
            disabled={!title.trim() || saving}
            className="w-full sm:w-auto bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          >
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            Request Meeting
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
