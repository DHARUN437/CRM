import { Card, CardContent } from "@/components/ui/card"
import {
  FileText,
  FolderOpen,
  StickyNote,
  Activity,
} from "lucide-react"
import { formatDate } from "@/lib/portal-types"

interface TimelineEvent {
  id: string
  action: string
  detail: string
  timestamp: string
  icon: "project" | "document" | "note" | "other"
}

function buildTimeline(
  projects: { id: string; name: string; created_at: string }[],
  documents: { id: string; name: string; created_at: string }[],
  notes: { id: string; body: string; created_at: string; author_name?: string }[]
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  for (const p of projects) {
    events.push({
      id: `project-${p.id}`,
      action: "Project created",
      detail: p.name,
      timestamp: p.created_at,
      icon: "project",
    })
  }
  for (const d of documents) {
    events.push({
      id: `doc-${d.id}`,
      action: "Document uploaded",
      detail: d.name,
      timestamp: d.created_at,
      icon: "document",
    })
  }
  for (const n of notes) {
    events.push({
      id: `note-${n.id}`,
      action: `Note by ${n.author_name ?? "Team"}`,
      detail: n.body,
      timestamp: n.created_at,
      icon: "note",
    })
  }

  events.sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
  return events
}

const ICONS = {
  project: FolderOpen,
  document: FileText,
  note: StickyNote,
  other: Activity,
} as const

export function ClientTimelineTab({
  projects,
  documents,
  notes,
}: {
  projects: { id: string; name: string; created_at: string }[]
  documents: { id: string; name: string; created_at: string }[]
  notes: { id: string; body: string; created_at: string; author_name?: string }[]
}) {
  const events = buildTimeline(projects, documents, notes)

  if (!events.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <Activity className="size-8 text-muted-foreground/50" />
          No activity yet. Events will appear here automatically.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="relative flex flex-col gap-0">
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
      {events.map((event) => {
        const Icon = ICONS[event.icon]
        return (
          <div key={event.id} className="relative flex gap-4 py-3">
            <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-background border border-border">
              <Icon className="size-4 text-muted-foreground" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{event.action}</span>
                <span className="text-[11px] text-muted-foreground/70">
                  {formatDate(event.timestamp)}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {event.detail}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}