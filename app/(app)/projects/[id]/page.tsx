import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { fetchMessages } from "@/lib/messages"
import { ProjectStatusUpdater } from "@/components/projects/project-status"
import { AssignWorkers } from "@/components/projects/assign-workers"
import { RequestDocumentDialog } from "@/components/projects/request-document-dialog"
import { UploadProjectDocuments } from "@/components/projects/upload-project-documents"
import { CreateTaskDialog } from "@/components/projects/create-task-dialog"
import { TaskBoard } from "@/components/projects/task-board"
import { FeatureRequestsList } from "@/components/projects/feature-requests"
import { ChatThread } from "@/components/chat/chat-thread"
import { DocumentPreviewLink } from "@/components/portal/document-preview-link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileQuestion,
  FileText,
  Layers,
  ListTodo,
  Lightbulb,
  MessageSquareText,
  PackageOpen,
  Users,
} from "lucide-react"
import {
  PROJECT_STATUS_META,
  formatBytes,
  formatDate,
  type ProjectStatus,
  type FeatureRequest,
  type ProjectTask,
} from "@/lib/portal-types"

export const dynamic = "force-dynamic"

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(name, company)")
    .eq("id", id)
    .single()

  if (!project) notFound()

  // Workers may only open projects assigned to them.
  if (user.role === "worker") {
    const { data: myMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (!myMember) notFound()

    const { data: assignment } = await supabase
      .from("project_assignments")
      .select("id")
      .eq("project_id", id)
      .eq("team_member_id", myMember.id)
      .maybeSingle()

    if (!assignment) notFound()
  }

  const isAdmin = user.role === "team"

  const [
    { data: assignments },
    { data: documents },
    messages,
    { data: workers },
    { data: requests },
    { data: features },
    { data: tasks },
  ] = await Promise.all([
      supabase
        .from("project_assignments")
        .select("id, team_members(id, name, role)")
        .eq("project_id", id),
      supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      fetchMessages(supabase, id),
      isAdmin
        ? supabase
            .from("team_members")
            .select("id, name, role")
            .eq("role", "worker")
            .order("name", { ascending: true })
        : { data: [] },
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

  const meta = PROJECT_STATUS_META[project.status as ProjectStatus]
  const clientName =
    project.clients?.company ?? project.clients?.name ?? "Client"
  const workerRows =
    (assignments as unknown as { team_members: { id: string; name: string; role: string } | null }[]) ?? []
  const assignedMembers = workerRows
    .map((a) => a.team_members)
    .filter(Boolean) as { id: string; name: string; role: string }[]

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

  const myName = user.name ?? user.email.split("@")[0]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Link
          href="/projects"
          className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to projects
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                {project.name}
              </h2>
              <Badge className={meta.badge}>{meta.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Building2 className="size-4" />
                {clientName}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                Started {formatDate(project.start_date)} · Due{" "}
                {formatDate(project.due_date)}
              </span>
              {project.tech_stack.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Layers className="size-4" />
                  {project.tech_stack.join(", ")}
                </span>
              )}
            </div>
            {project.description && (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="flex flex-col gap-6 xl:col-span-5">
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="size-4" />
                <h3 className="text-lg font-semibold">Tasks</h3>
                <Badge variant="outline">{taskRows.length}</Badge>
              </div>
              {isAdmin && (
                <CreateTaskDialog
                  projectId={id}
                  workers={(workers as unknown as { id: string; name: string }[]) ?? []}
                />
              )}
            </div>
            {taskRows.length ? (
              <TaskBoard tasks={taskRows} />
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                  <ListTodo className="size-8 text-muted-foreground/50" />
                  No tasks yet — create one to get started.
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="flex flex-col gap-6 xl:col-span-3">
          <Card>
            <CardContent className="flex flex-col gap-1.5 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall progress</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-2" />
            </CardContent>
          </Card>

          <section className="flex flex-col gap-3">
            <CardHeader className="px-0 pb-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquareText className="size-4" />
                Project chat
              </CardTitle>
            </CardHeader>
            <ChatThread
              projectId={id}
              messages={messages}
              currentUserId={user.id}
              currentName={myName}
              currentRole={user.role === "worker" ? "worker" : "team"}
            />
          </section>

          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardHeader className="px-0 pb-0">
                <CardTitle className="text-lg">Shared documents</CardTitle>
              </CardHeader>
              {isAdmin && project.clients && (
                <UploadProjectDocuments
                  clientId={project.clients.id}
                  projectId={id}
                />
              )}
            </div>
            {!documents?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                  <PackageOpen className="size-8 text-muted-foreground/50" />
                  No documents yet — the client will upload these through their
                  portal.
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
                          <p className="truncate text-sm font-medium">
                            {doc.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatBytes(doc.file_size)} ·{" "}
                            {formatDate(doc.created_at)}
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

          <section className="flex flex-col gap-4">
            <CardHeader className="px-0 pb-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Requests from client</CardTitle>
                {isAdmin && (
                  <RequestDocumentDialog projectId={id} />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Documents you&apos;ve asked the client to send. They can upload
                them straight from their portal.
              </p>
            </CardHeader>

            {!requests?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                  <FileQuestion className="size-8 text-muted-foreground/50" />
                  No requests yet — ask the client for the files you need.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
                {(requests as unknown as {
                  id: string
                  title: string
                  description: string | null
                  status: "pending" | "fulfilled"
                  requested_at: string
                  fulfilled_at: string | null
                  linked_document_id: string | null
                }[]).map((request, index) => {
                  const linkedDoc = documents?.find(
                    (d) => d.id === request.linked_document_id
                  )
                  return (
                    <div key={request.id}>
                      {index > 0 && <Separator />}
                      <div className="flex items-center justify-between gap-3 bg-background p-4">
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className="truncate text-sm font-medium">
                            {request.title}
                          </p>
                          {request.description && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {request.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {request.status === "fulfilled"
                              ? `Received${linkedDoc ? ` — ${linkedDoc.name}` : ""} · ${formatDate(request.fulfilled_at)}`
                              : `Requested ${formatDate(request.requested_at)}`}
                          </p>
                        </div>
                        {request.status === "fulfilled" ? (
                          <Badge className="bg-success/15 text-success">
                            <CheckCircle2 className="size-3" />
                            Fulfilled
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
          <section className="flex flex-col gap-4">
            <CardHeader className="px-0 pb-0">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4" />
                <CardTitle className="text-lg">Feature requests</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Requests from the client — update the status as you work on them.
              </p>
            </CardHeader>
            <FeatureRequestsList requests={featureRows} isAdmin={isAdmin} />
          </section>
        </div>

        <div className="flex flex-col gap-6 xl:col-span-2">
          <ProjectStatusUpdater
            projectId={id}
            status={project.status as ProjectStatus}
            progress={project.progress}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                Team on this project
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {isAdmin && (
                <AssignWorkers
                  projectId={id}
                  workers={(workers as unknown as { id: string; name: string }[]) ?? []}
                  assignedIds={assignedMembers.map((m) => m.id)}
                />
              )}
              {!assignedMembers.length ? (
                <p className="text-sm text-muted-foreground">
                  No workers assigned yet.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {assignedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{member.name}</span>
                      <Badge variant="outline">
                        {member.role === "team" ? "Admin" : "Worker"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}