import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getCurrentUser } from "@/lib/supabase/session"
import { getClientsForSelect } from "@/lib/clients"
import { ProjectStatusUpdater } from "@/components/projects/project-status"
import { AssignWorkers } from "@/components/projects/assign-workers"
import { RequestDocumentDialog } from "@/components/projects/request-document-dialog"
import { UploadProjectDocuments } from "@/components/projects/upload-project-documents"
import { CreateTaskDialog } from "@/components/projects/create-task-dialog"
import { TaskBoard } from "@/components/projects/task-board"
import { FeatureRequestsLive } from "@/components/projects/feature-requests-live"
import { DocumentPreviewLink } from "@/components/portal/document-preview-link"
import { LogTimeDialog } from "@/components/projects/log-time-dialog"
import { ProjectTimesheet } from "@/components/projects/project-timesheet"
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog"
import { InvoicesList } from "@/components/invoices/invoices-list"
import { EditProjectDialog } from "@/components/projects/edit-project-dialog"
import { DeleteProjectDialog } from "@/components/projects/delete-project-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileQuestion,
  FileText,
  Layers,
  ListTodo,
  Lightbulb,
  PackageOpen,
  Receipt,
  TrendingUp,
  Users,
  ShieldCheck,
} from "lucide-react"
import {
  PROJECT_STATUS_META,
  formatBytes,
  formatDate,
  type ProjectStatus,
  type FeatureRequest,
  type ProjectTask,
  type TimeEntry,
  type Invoice,
  type InvoicePayment,
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

  let { data: project } = await supabase
    .from("projects")
    .select("*, clients(name, company)")
    .eq("id", id)
    .maybeSingle()

  if (!project && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data: adminProject } = await admin
      .from("projects")
      .select("*, clients(name, company)")
      .eq("id", id)
      .maybeSingle()
    project = adminProject
  }

  if (!project) notFound()

  const isAdmin = user.role === "team"
  const isTL = user.role === "tl"
  const isWorker = user.role === "worker"

  // Resolve my team member row (for workers and TLs)
  const { data: myMember } = (isWorker || isTL)
    ? await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null }

  // Workers may only open projects assigned to them.
  if (isWorker) {
    if (!myMember) notFound()
    const { data: assignment } = await supabase
      .from("project_assignments")
      .select("id")
      .eq("project_id", id)
      .eq("team_member_id", myMember!.id)
      .maybeSingle()
    if (!assignment) notFound()
  }

  // TL may only open projects where they are the lead.
  if (isTL) {
    if (!myMember) notFound()
    const isTLofProject = project.tl_id === myMember!.id
    if (!isTLofProject) notFound()
  }

  // Can the current user manage worker assignments? (Admin always, TL for their project)
  const canManageTeam =
    isAdmin ||
    (isTL && myMember != null && project.tl_id === myMember.id)

  // Can the current user see the budget? (Admin + TL of this project)
  const canSeeBudget =
    isAdmin ||
    (isTL && myMember != null && project.tl_id === myMember.id)

  let [
    { data: assignments },
    { data: documents },
    { data: workers },
    { data: requests },
    { data: features },
    { data: tasks },
    { data: timeEntries },
    { data: invoices },
    allClients,
    { data: payments },
    { data: teamLeads },
    { data: tlMember },
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
    // Workers for assignment picker — available to admin and TL
    canManageTeam
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
    supabase
      .from("time_entries")
      .select("*")
      .eq("project_id", id)
      .order("logged_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
    isAdmin ? getClientsForSelect() : Promise.resolve([]),
    supabase.from("invoice_payments").select("*").order("created_at", { ascending: false }),
    // Team leads for edit dialog
    isAdmin
      ? supabase.from("team_members").select("id, name").eq("role", "tl").order("name", { ascending: true })
      : { data: [] },
    // Resolve the TL member row for display
    project.tl_id
      ? supabase.from("team_members").select("id, name").eq("id", project.tl_id).maybeSingle()
      : { data: null },
  ])

  // Fallback to admin client if RLS policies restrict worker/TL reading requests or documents
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    if (admin) {
      if (!requests || requests.length === 0) {
        const { data: adminReqs } = await admin
          .from("document_requests")
          .select("*")
          .eq("project_id", id)
          .order("requested_at", { ascending: false })
        if (adminReqs && adminReqs.length > 0) requests = adminReqs
      }
      if (!features || features.length === 0) {
        const { data: adminFeats } = await admin
          .from("feature_requests")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false })
        if (adminFeats && adminFeats.length > 0) features = adminFeats
      }
      if (!documents || documents.length === 0) {
        const { data: adminDocs } = await admin
          .from("project_documents")
          .select("*")
          .eq("project_id", id)
          .order("created_at", { ascending: false })
        if (adminDocs && adminDocs.length > 0) documents = adminDocs
      }
    }
  }

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

  const invoiceRows = (invoices ?? []) as unknown as Invoice[]
  const invoiceIds = new Set(invoiceRows.map((inv) => inv.id))
  const paymentsByInvoice = new Map<string, InvoicePayment[]>()
  for (const payment of (payments ?? []) as unknown as InvoicePayment[]) {
    if (!invoiceIds.has(payment.invoice_id)) continue
    const list = paymentsByInvoice.get(payment.invoice_id) ?? []
    list.push(payment)
    paymentsByInvoice.set(payment.invoice_id, list)
  }
  const invoiceRowsWithPayments = invoiceRows.map((inv) => ({
    ...inv,
    payments: paymentsByInvoice.get(inv.id) ?? [],
  }))

  const tlName = (tlMember as { id: string; name: string } | null)?.name ?? null

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
              {tlName && (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" />
                  <span className="font-medium text-foreground">{tlName}</span>
                  <span className="text-xs text-muted-foreground">(Team Lead)</span>
                </span>
              )}
            </div>
            {project.description && (
              <p className="max-w-2xl text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <EditProjectDialog
                project={{
                  id,
                  name: project.name,
                  description: project.description,
                  status: project.status,
                  tech_stack: project.tech_stack,
                  start_date: project.start_date,
                  due_date: project.due_date,
                  progress: project.progress,
                  tl_id: project.tl_id ?? null,
                  budget: project.budget ?? null,
                }}
                teamLeads={(teamLeads ?? []) as { id: string; name: string }[]}
              />
              <DeleteProjectDialog projectId={id} projectName={project.name} />
            </div>
          )}
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
              {(isAdmin || canManageTeam) && (
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
                {/* Both admins and workers can request info/files */}
                <RequestDocumentDialog projectId={id} />
              </div>
              <p className="text-sm text-muted-foreground">
                Request files or information from the client. They respond directly
                through their portal — by uploading a file or typing a reply.
              </p>
            </CardHeader>

            {!requests?.length ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
                  <FileQuestion className="size-8 text-muted-foreground/50" />
                  No requests yet — ask the client for what you need.
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col overflow-hidden rounded-xl border border-foreground/10">
                {(requests as unknown as {
                  id: string
                  title: string
                  description: string | null
                  status: "pending" | "fulfilled"
                  request_type: "document" | "info"
                  priority: "normal" | "urgent"
                  text_response: string | null
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
                      <div className="flex flex-col gap-2 bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium">
                                {request.title}
                              </p>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {request.request_type === "info" ? "Info" : "File"}
                              </Badge>
                              {request.priority === "urgent" && (
                                <Badge className="bg-destructive/15 text-destructive text-xs shrink-0">
                                  Urgent
                                </Badge>
                              )}
                            </div>
                            {request.description && (
                              <p className="line-clamp-2 text-xs text-muted-foreground">
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
                            <Badge className="shrink-0 bg-success/15 text-success">
                              <CheckCircle2 className="size-3" />
                              Received
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="shrink-0">Pending</Badge>
                          )}
                        </div>
                        {/* Show text response if provided */}
                        {request.text_response && (
                          <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-sm">
                            <p className="text-xs font-medium text-success mb-1">Client replied:</p>
                            <p className="text-foreground whitespace-pre-wrap">{request.text_response}</p>
                          </div>
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
            <FeatureRequestsLive
              projectId={id}
              isAdmin={isAdmin}
              initialRequests={featureRows}
            />
          </section>

          {/* Time Tracking */}
          <section className="flex flex-col gap-4">
            <CardHeader className="px-0 pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="size-4" />
                  <CardTitle className="text-lg">Time tracking</CardTitle>
                </div>
                <LogTimeDialog
                  projectId={id}
                  tasks={taskRows.map((t) => ({ id: t.id, title: t.title }))}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Log hours worked on this project by task.
              </p>
            </CardHeader>
            <ProjectTimesheet entries={(timeEntries ?? []) as unknown as TimeEntry[]} />
          </section>

          {/* Invoices — admin only */}
          {isAdmin && (
            <section className="flex flex-col gap-4">
              <CardHeader className="px-0 pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="size-4" />
                    <CardTitle className="text-lg">Invoices</CardTitle>
                  </div>
                  <CreateInvoiceDialog
                    clients={(allClients ?? []) as { id: string; name: string; company: string | null }[]}
                    projects={[{ id, name: project.name, client_id: project.client_id! }]}
                    presetClientId={project.client_id ?? undefined}
                    presetProjectId={id}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage invoices issued to the client for this project.
                </p>
              </CardHeader>
              <InvoicesList invoices={invoiceRowsWithPayments} isAdmin={isAdmin} />
            </section>
          )}
        </div>

        <div className="flex flex-col gap-6 xl:col-span-2">
          <ProjectStatusUpdater
            projectId={id}
            status={project.status as ProjectStatus}
            progress={project.progress}
          />

          {/* Budget card — visible to admin and TL only */}
          {canSeeBudget && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4" />
                  Project Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                {project.budget != null ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl font-bold tracking-tight">
                      ₹{project.budget.toLocaleString("en-IN", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Allocated budget for this project
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No budget set yet.
                    {isAdmin && " Edit the project to set one."}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                Team on this project
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* Team Lead info */}
              {tlName && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <span className="font-medium">{tlName}</span>
                  </div>
                  <Badge className="bg-primary/15 text-primary border-primary/20">
                    Team Lead
                  </Badge>
                </div>
              )}

              {/* Assign workers — admin or TL */}
              {canManageTeam && (
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
                        {member.role === "team" ? "Admin" : member.role === "tl" ? "TL" : "Worker"}
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