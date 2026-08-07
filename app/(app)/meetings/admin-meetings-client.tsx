"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react"

export interface MeetingItem {
  id: string
  title: string
  description?: string | null
  clientName: string
  projectName: string
  requestedDate: string
  requestedTime: string
  durationMinutes: number
  status: 'requested' | 'confirmed' | 'rescheduled' | 'declined' | 'completed' | string
  adminNotes?: string | null
  confirmedDate?: string | null
  confirmedTime?: string | null
  createdAt: string
}

interface AdminMeetingsClientProps {
  initialMeetings: MeetingItem[]
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  requested: { label: "Requested", badge: "bg-info/15 text-info font-semibold" },
  confirmed: { label: "Confirmed", badge: "bg-success/15 text-success font-semibold" },
  rescheduled: { label: "Rescheduled", badge: "bg-warning/15 text-warning font-semibold" },
  declined: { label: "Declined", badge: "bg-destructive/15 text-destructive font-semibold" },
  completed: { label: "Completed", badge: "bg-primary/15 text-primary font-semibold" },
}

export function AdminMeetingsClient({ initialMeetings }: AdminMeetingsClientProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState<Record<string, string>>({})

  const meetings = initialMeetings.filter((m) => {
    if (filter === "all") return true
    return m.status === filter
  })

  async function updateStatus(id: string, newStatus: string, notes?: string) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: notes !== undefined ? notes : notesInput[id],
        }),
      })

      if (!res.ok) throw new Error("Failed to update meeting status")
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update meeting")
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {["all", "requested", "confirmed", "rescheduled", "declined", "completed"].map((tab) => (
          <Button
            key={tab}
            variant={filter === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(tab)}
            className={`capitalize rounded-full text-xs font-semibold ${
              filter === tab ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)]"
            }`}
          >
            {tab}
          </Button>
        ))}
      </div>

      {/* Meetings List */}
      {meetings.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)]/60 rounded-xl p-8 text-center text-sm text-[var(--text-secondary)]">
          No meeting requests found for filter &quot;{filter}&quot;.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {meetings.map((mtg) => {
            const meta = STATUS_META[mtg.status] || STATUS_META.requested
            const isUpdating = updatingId === mtg.id

            return (
              <div
                key={mtg.id}
                className="bg-[var(--surface)] border border-[var(--border)]/60 rounded-xl p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-[var(--text-primary)]">
                        {mtg.title}
                      </h3>
                      <Badge className={meta.badge}>{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Client: <span className="font-semibold text-[var(--text-primary)]">{mtg.clientName}</span> · Project: <span className="font-semibold text-[var(--text-primary)]">{mtg.projectName}</span>
                    </p>
                    {mtg.description && (
                      <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed bg-[var(--background)] p-2.5 rounded-lg border border-[var(--border)]/40">
                        {mtg.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs font-medium text-[var(--text-secondary)] shrink-0">
                    <span className="flex items-center gap-1.5 bg-[var(--background)] px-3 py-1.5 rounded-lg border border-[var(--border)]/60">
                      <Calendar className="size-3.5 text-[var(--accent)]" />
                      {mtg.confirmedDate || mtg.requestedDate}
                    </span>
                    <span className="flex items-center gap-1.5 bg-[var(--background)] px-3 py-1.5 rounded-lg border border-[var(--border)]/60">
                      <Clock className="size-3.5 text-[var(--accent)]" />
                      {mtg.confirmedTime || mtg.requestedTime} ({mtg.durationMinutes}m)
                    </span>
                  </div>
                </div>

                {/* Admin Note Input / Display */}
                {mtg.adminNotes && (
                  <div className="text-xs text-[var(--text-secondary)] bg-[var(--accent-tint)]/40 p-2.5 rounded-lg border border-[var(--accent)]/20">
                    <span className="font-semibold text-[var(--accent)]">Admin Note: </span>
                    {mtg.adminNotes}
                  </div>
                )}

                {/* Action Buttons for Admin/TL */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border)]/40">
                  <div className="flex-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Add note or reschedule details for client…"
                      value={notesInput[mtg.id] ?? mtg.adminNotes ?? ""}
                      onChange={(e) => setNotesInput({ ...notesInput, [mtg.id]: e.target.value })}
                      className="w-full text-xs px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {mtg.status !== "confirmed" && (
                      <Button
                        size="sm"
                        disabled={isUpdating}
                        onClick={() => updateStatus(mtg.id, "confirmed")}
                        className="bg-[#15803D] hover:bg-[#166534] text-white text-xs font-semibold h-8 rounded-lg"
                      >
                        {isUpdating ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5 mr-1" />}
                        Confirm
                      </Button>
                    )}

                    {mtg.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isUpdating}
                        onClick={() => updateStatus(mtg.id, "completed")}
                        className="text-xs font-semibold h-8 rounded-lg border-[var(--border)] text-[var(--text-primary)]"
                      >
                        Complete
                      </Button>
                    )}

                    {mtg.status !== "declined" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isUpdating}
                        onClick={() => updateStatus(mtg.id, "declined")}
                        className="text-xs font-semibold h-8 rounded-lg text-[#B91C1C] hover:bg-[#FEE2E2]/60"
                      >
                        <XCircle className="size-3.5 mr-1" />
                        Decline
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
