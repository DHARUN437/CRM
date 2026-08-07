import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { redirect } from "next/navigation"
import { AdminMeetingsClient } from "./admin-meetings-client"

export const dynamic = "force-dynamic"

interface MeetingRow {
  id: string
  title: string
  description: string | null
  clients?: { name: string | null; company: string | null } | null
  projects?: { name: string | null } | null
  requested_date: string
  requested_time: string
  duration_minutes: number
  status: string
  admin_notes: string | null
  confirmed_date: string | null
  confirmed_time: string | null
  created_at: string
}

export default async function MeetingsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user || (user.role !== "team" && user.role !== "tl")) {
    redirect("/dashboard")
  }

  const { data: rawMeetings } = await supabase
    .from("meetings")
    .select("*, clients(name, company), projects(name)")
    .order("created_at", { ascending: false })

  const meetings = (rawMeetings ?? []).map((m: MeetingRow) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    clientName: m.clients?.company || m.clients?.name || "Client",
    projectName: m.projects?.name || "General",
    requestedDate: m.requested_date,
    requestedTime: m.requested_time,
    durationMinutes: m.duration_minutes,
    status: m.status,
    adminNotes: m.admin_notes,
    confirmedDate: m.confirmed_date,
    confirmedTime: m.confirmed_time,
    createdAt: m.created_at,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Meeting Requests & Schedule
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Review, confirm, reschedule, or decline client-requested agency meetings.
        </p>
      </div>

      <AdminMeetingsClient initialMeetings={meetings} />
    </div>
  )
}
