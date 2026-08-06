import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
import { UploadDocuments } from "@/components/portal/upload-documents"
import { DocumentRequests } from "@/components/portal/document-requests"
import { RequestFeatureDialog } from "@/components/portal/request-feature-dialog"
import { FeatureRequestsLive } from "@/components/projects/feature-requests-live"
import { TaskBoard } from "@/components/projects/task-board"
import { DocumentPreviewLink } from "@/components/portal/document-preview-link"
import { ProjectTimeline } from "@/components/portal/project-timeline"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  CalendarDays,
  FileQuestion,
  FileText,
  Layers,
  Lightbulb,
  ListTodo,
  PackageOpen,
  Users,
} from "lucide-react"
import Link from "next/link"
import {
  PROJECT_STATUS_META,
  formatBytes,
  formatDate,
  initials,
  type ProjectStatus,
  type FeatureRequest,
  type ProjectTask,
} from "@/lib/portal-types"

export const dynamic = "force-dynamic"

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const client = await getActiveClient(supabase)
  if (!client) redirect("/portal/login")

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!project) notFound()

  // Fetch all related real-time project resources
  const [{ data: documents }, { data: assignments }, { data: requests }, { data: features }, { data: tasks }] =
    await Promise.all([
      supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_assignments")
        .select("team_members(name, role)")
        .eq("project_id", id),
      supabase
        .from("document_requests")
        .select("*")
        .eq("project_id", id)
        .order("requested_at", { ascending: false }),
      supabase
        .from("feature_requests")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("project_tasks")
        .select("*, team_members!tasks_assignee_id_fkey(name)")
        .eq("project_id", id)
        .order("sort_order", { ascending: true }),
    ])

  const meta =
    PROJECT_STATUS_META[project.status as ProjectStatus] ??
    PROJECT_STATUS_META.kickoff

  const teamMembers =
    (assignments as unknown as
      | { team_members: { name: string; role: string } | null }[]
      | null)
      ?.map((a) => a.team_members)
      .filter((m): m is { name: string; role: string } => Boolean(m)) ?? []

  const featureRows = (features ?? []) as unknown as FeatureRequest[]
  const taskRows = ((tasks ?? []) as unknown as {
    id: string
    project_id: string
    title: string
    description: string | null
    status: string
    priority: string
    assignee_id: string | null
    created_by: string | null
    due_date: string | null
    sort_order: number
    created_at: string
    updated_at: string
    team_members: { name: string } | null
  }[]).map((t) => ({
    ...t,
    status: t.status as ProjectTask["status"],
    priority: t.priority as ProjectTask["priority"],
    assignee_name: t.team_members?.name ?? null,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/portal"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to overview
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">{project.name}</h2>
              <Badge className={meta.badge}>{meta.label}</Badge>
            </div>
            {project.description && (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                Started {formatDate(project.start_date)} · Due {formatDate(project.due_date)}
              </span>
              {project.tech_stack && project.tech_stack.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Layers className="size-4" />
                  {project.tech_stack.join(", ")}
                </span>
              )}
            </div>
          </div>

          <UploadDocuments
            clientId={client.id}
            projects={[{ id: project.id, name: project.name }]}
            presetProjectId={project.id}
          />
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1.5 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-3xl border-border/50 bg-card shadow-sm backdrop-blur-xl xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg tracking-tight">Project Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectTimeline status={project.status as ProjectStatus} progress={project.progress} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="size-4" />
              Assigned Development Team
            </CardTitle>
            <CardDescription>
              The engineers and team lead working on your project.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {!teamMembers.length ? (
              <p className="text-sm text-muted-foreground">
                Development team assigned — members will appear here as tasks begin.
              </p>
            ) : (
              teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">
                      {member.name}
                    </span>
                  </div>
                  <Badge variant={member.role === "team" ? "secondary" : "outline"}>
                    {member.role === "team" ? "Admin" : member.role === "tl" ? "Team Lead" : "Developer"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project tasks */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ListTodo className="size-4" />
          <h3 className="text-lg font-semibold">Development Tasks & Milestones</h3>
          <Badge variant="outline">{taskRows.length}</Badge>
        </div>
        {taskRows.length ? (
          <TaskBoard tasks={taskRows} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <ListTodo className="size-8 text-muted-foreground/50" />
              No tasks created yet — your development team will post milestones as work begins.
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Feature Requests */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="size-4" />
              <h3 className="text-lg font-semibold">Feature Requests</h3>
            </div>
            <RequestFeatureDialog projectId={project.id} clientId={client.id} />
          </div>
          <CardDescription className="-mt-2">
            Ask for new features or review feature requests submitted by the development team. All updates sync in real time.
          </CardDescription>
          <FeatureRequestsLive projectId={project.id} initialRequests={featureRows} />
        </section>

        {/* Requests from Development Team */}
        <section className="flex flex-col gap-4">
          <CardHeader className="px-0 pb-0">
            <div className="flex items-center gap-2">
              <FileQuestion className="size-4" />
              <CardTitle className="text-lg">Requests from Development Team</CardTitle>
            </div>
            <CardDescription>
              Information or assets requested by your development team (e.g. logos, credentials, copy). Respond by uploading files or typing a reply.
            </CardDescription>
          </CardHeader>

          <DocumentRequests
            clientId={client.id}
            projectId={project.id}
            requests={(requests as unknown as {
              id: string
              title: string
              description: string | null
              status: "pending" | "fulfilled"
              request_type: "document" | "info"
              priority: "normal" | "urgent"
              text_response: string | null
              requested_at: string
              linked_document_id: string | null
            }[]).map((request) => ({
              ...request,
              linkedName:
                documents?.find((d) => d.id === request.linked_document_id)
                  ?.name ?? null,
            }))}
          />
        </section>

        {/* Shared Documents */}
        <section className="flex flex-col gap-4">
          <CardHeader className="px-0 pb-0">
            <CardTitle className="text-lg">Shared Documents & Assets</CardTitle>
            <CardDescription>
              All files uploaded for this project — assets, design files, contracts, and attachments.
            </CardDescription>
          </CardHeader>

          {!documents?.length ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                <PackageOpen className="size-8 text-muted-foreground/50" />
                No documents uploaded yet — click &quot;Upload Documents&quot; above to upload your first file.
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
              {documents.map((doc, index) => (
                <div key={doc.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-center justify-between gap-3 bg-background p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                        <FileText className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <p className="truncate text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(doc.file_size)} ·{" "}
                          {new Date(doc.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <DocumentPreviewLink doc={doc} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}