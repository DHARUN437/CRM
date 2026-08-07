import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
import { PortalRequestsOverview } from "@/components/portal/requests-overview"
import { FeatureRequestsList } from "@/components/projects/feature-requests"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileQuestion, Inbox, CheckCircle2, Lightbulb, Calendar, Clock, MapPin } from "lucide-react"
import { formatDate } from "@/lib/portal-types"

export const dynamic = "force-dynamic"

const MEETING_STATUS_META: Record<string, { label: string; badge: string }> = {
  requested: { label: "Requested", badge: "bg-info/15 text-info font-semibold" },
  confirmed: { label: "Confirmed", badge: "bg-success/15 text-success font-semibold" },
  rescheduled: { label: "Rescheduled", badge: "bg-warning/15 text-warning font-semibold" },
  declined: { label: "Declined", badge: "bg-destructive/15 text-destructive font-semibold" },
  completed: { label: "Completed", badge: "bg-primary/15 text-primary font-semibold" },
}

export default async function PortalRequestsPage() {
  const supabase = await createClient()
  const client = await getActiveClient(supabase)
  if (!client) redirect("/portal/login")

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", client.id)

  const projectIds = (projects ?? []).map((p) => p.id)

  const [
    { data: documents },
    { data: requests },
    { data: rawFeatureRequests },
    { data: rawMeetings },
  ] = await Promise.all([
    supabase
      .from("project_documents")
      .select("id, name, project_id")
      .eq("client_id", client.id),
    projectIds.length
      ? supabase
          .from("document_requests")
          .select("*")
          .in("project_id", projectIds)
      : { data: [] },
    supabase
      .from("feature_requests")
      .select("*, projects(name)")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("meetings")
      .select("*, projects(name)")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false }),
  ])

  const requestsWithProjects = (requests ?? []).map((request) => {
    const project = projects?.find((p) => p.id === request.project_id)
    const linkedDoc = documents?.find(
      (d) => d.id === request.linked_document_id
    )
    return {
      ...request,
      project_name: project?.name ?? "Unknown project",
      linked_name: linkedDoc?.name ?? null,
    }
  })

  const featureRequests = (rawFeatureRequests ?? []).map((fr: any) => ({
    ...fr,
    project_name: fr.projects?.name ?? "Project",
  }))

  const meetings = (rawMeetings ?? []).map((m: any) => ({
    ...m,
    project_name: m.projects?.name ?? "General",
  }))

  const pending = requestsWithProjects.filter((r) => r.status === "pending")
  const fulfilled = requestsWithProjects.filter((r) => r.status === "fulfilled")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          Requests & Meetings
        </h2>
        <p className="text-sm text-muted-foreground">
          Track project document requests, feature suggestions, and scheduled agency meetings.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <FileQuestion className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tracking-tight">
                {pending.length}
              </span>
              <span className="text-xs text-muted-foreground">
                Awaiting your response
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Calendar className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tracking-tight">
                {meetings.filter((m) => m.status === 'confirmed' || m.status === 'requested').length}
              </span>
              <span className="text-xs text-muted-foreground">Upcoming / Requested Meetings</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Inbox className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tracking-tight">
                {requestsWithProjects.length + featureRequests.length}
              </span>
              <span className="text-xs text-muted-foreground">Total Requests & Suggestions</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Meetings Section */}
      {meetings.length > 0 && (
        <section className="flex flex-col gap-4">
          <CardHeader className="px-0 pb-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="size-5 text-[var(--accent)]" />
                Scheduled Meetings
              </CardTitle>
              <Badge className="bg-[var(--accent-tint)] text-[var(--accent)] font-semibold">
                {meetings.length} meetings
              </Badge>
            </div>
            <CardDescription>
              Meetings requested or confirmed with your project team.
            </CardDescription>
          </CardHeader>

          <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
            {meetings.map((meeting, index) => {
              const meta = MEETING_STATUS_META[meeting.status] || MEETING_STATUS_META.requested
              return (
                <div key={meeting.id}>
                  {index > 0 && <div className="h-px bg-foreground/10" />}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background p-4">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {meeting.title}
                        </p>
                        <Badge className={meta.badge}>{meta.label}</Badge>
                      </div>
                      {meeting.description && (
                        <p className="line-clamp-1 text-xs text-[var(--text-secondary)]">
                          {meeting.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {formatDate(meeting.confirmed_date || meeting.requested_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {meeting.confirmed_time || meeting.requested_time} ({meeting.duration_minutes}m)
                        </span>
                        <span>Project: {meeting.project_name}</span>
                      </div>
                      {meeting.admin_notes && (
                        <p className="mt-1.5 p-2 rounded-lg bg-[var(--background)] text-xs text-[var(--text-secondary)] border border-[var(--border)]/60">
                          <span className="font-semibold text-[var(--text-primary)]">Team Note: </span>
                          {meeting.admin_notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Document Requests Section */}
      <section className="flex flex-col gap-4">
        <CardHeader className="px-0 pb-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Open requests</CardTitle>
            {pending.length > 0 && (
              <Badge className="bg-warning/15 text-warning">
                {pending.length} pending
              </Badge>
            )}
          </div>
          <CardDescription>
            Each request shows which project it belongs to. Upload a file or
            type a reply to complete it.
          </CardDescription>
        </CardHeader>

        <PortalRequestsOverview clientId={client.id} requests={requestsWithProjects} />
      </section>

      {/* Feature Requests Section */}
      <section className="flex flex-col gap-4">
        <CardHeader className="px-0 pb-0">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="size-5 text-[var(--accent)]" />
              Your feature requests
            </CardTitle>
            {featureRequests.length > 0 && (
              <Badge className="bg-[var(--accent-tint)] text-[var(--accent)] font-semibold">
                {featureRequests.length} submitted
              </Badge>
            )}
          </div>
          <CardDescription>
            Feature requests and suggestions you&apos;ve submitted to your development team.
          </CardDescription>
        </CardHeader>

        <FeatureRequestsList requests={featureRequests} />
      </section>

      {/* Completed Team Requests Section */}
      {fulfilled.length > 0 && (
        <section className="flex flex-col gap-4">
          <CardHeader className="px-0 pb-0">
            <CardTitle className="text-lg">Completed team requests</CardTitle>
            <CardDescription>
              Requests you&apos;ve already answered.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
            {fulfilled.map((request, index) => (
              <div key={request.id}>
                {index > 0 && <div className="border-t border-foreground/10" />}
                <div className="flex flex-col gap-1 bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate text-sm font-medium">
                        {request.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {request.project_name} · Responded{" "}
                        {formatDate(request.fulfilled_at)}
                      </p>
                    </div>
                    <Badge className="shrink-0 bg-success/15 text-success">
                      <CheckCircle2 className="size-3" />
                      Done
                    </Badge>
                  </div>
                  {request.text_response && (
                    <p className="rounded-lg bg-success/5 px-3 py-2 text-sm text-foreground">
                      {request.text_response}
                    </p>
                  )}
                  {request.linked_name && (
                    <p className="text-xs text-muted-foreground">
                      Uploaded: {request.linked_name}
                    </p>
                  )}
                  <Link
                    href={`/portal/projects/${request.project_id}`}
                    className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground w-fit"
                  >
                    Open project →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
