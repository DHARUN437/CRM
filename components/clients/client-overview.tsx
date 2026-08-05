import Link from "next/link"
import { StatCard } from "@/components/common/stat-card"
import { StatusBadge } from "@/components/common/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EditClientDialog } from "@/components/clients/edit-client-dialog"
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Building2,
  CalendarDays,
  FileText,
  FolderKanban,
  Mail,
  Pencil,
  Phone,
  StickyNote,
  UserRound,
} from "lucide-react"
import {
  PROJECT_STATUS_META,
  formatDate,
  type ClientNote,
} from "@/lib/portal-types"
import type { ClientProfile } from "@/lib/portal-types"

import { CheckSquare } from "lucide-react"

interface ClientOverviewProps {
  client: ClientProfile
  projects: { id: string; name: string; status: string; progress: number }[]
  documents: { id: string; name: string; created_at: string }[]
  notes: ClientNote[]
  openTasksCount?: number
}

export function ClientOverview({
  client,
  projects,
  documents,
  notes,
  openTasksCount = 0,
}: ClientOverviewProps) {
  const activeProjects = projects.filter((p) => p.status !== "completed").length
  const displayName = client.company ?? client.name

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          title="Total projects"
          value={projects.length}
          icon={FolderKanban}
        />
        <StatCard
          title="Active projects"
          value={activeProjects}
          icon={FolderKanban}
          description="In progress"
        />
        <StatCard
          title="Open tasks"
          value={openTasksCount}
          icon={CheckSquare}
          description="Pending action"
        />
        <StatCard
          title="Documents"
          value={documents.length}
          icon={FileText}
        />
        <StatCard
          title="Notes"
          value={notes.length}
          icon={StickyNote}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="flex flex-col gap-6 xl:col-span-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Contact details</CardTitle>
              <div className="flex items-center gap-2">
                <EditClientDialog client={client} />
                <DeleteClientDialog clientId={client.id} clientName={displayName} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ContactRow
                icon={<UserRound className="size-4" />}
                label="Contact name"
                value={client.name}
              />
              <Separator />
              <ContactRow
                icon={<Building2 className="size-4" />}
                label="Company"
                value={client.company ?? "—"}
              />
              <Separator />
              <ContactRow
                icon={<Mail className="size-4" />}
                label="Email"
                value={client.email}
              />
              <Separator />
              <ContactRow
                icon={<Phone className="size-4" />}
                label="Phone"
                value={client.phone ?? "—"}
              />
              <Separator />
              <ContactRow
                icon={<CalendarDays className="size-4" />}
                label="Client since"
                value={formatDate(client.created_at)}
              />
            </CardContent>
          </Card>

          {documents.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent documents</CardTitle>
                <span className="text-xs text-muted-foreground">{documents.length} total</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{doc.name}</span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6 xl:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Projects</CardTitle>
              <span className="text-xs text-muted-foreground">{projects.length} total</span>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!projects.length ? (
                <p className="text-sm text-muted-foreground">
                  No projects yet.
                </p>
              ) : (
                projects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex flex-col gap-2 rounded-lg border border-foreground/10 p-3 transition-colors hover:border-foreground/25"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      <StatusBadge status={project.status} meta={PROJECT_STATUS_META} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-1.5" />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {notes.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Recent notes</CardTitle>
                <span className="text-xs text-muted-foreground">{notes.length} total</span>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {notes.slice(0, 4).map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-foreground/10 px-3 py-2 text-sm"
                  >
                    <p className="line-clamp-2 text-muted-foreground">{note.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {note.author_name ?? "Team"} · {formatDate(note.created_at)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground">
        {icon}
      </span>
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate font-medium">{value}</span>
    </div>
  )
}