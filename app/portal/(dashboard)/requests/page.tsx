import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
import { PortalRequestsOverview } from "@/components/portal/requests-overview"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileQuestion, Inbox, CheckCircle2 } from "lucide-react"
import { formatDate } from "@/lib/portal-types"

import { NoClientNotice } from "@/components/portal/no-client-notice"

export const dynamic = "force-dynamic"

export default async function PortalRequestsPage() {
  const supabase = await createClient()
  const client = await getActiveClient(supabase)
  if (!client) redirect("/portal/login")

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", client.id)

  const projectIds = (projects ?? []).map((p) => p.id)

  const [{ data: documents }, { data: requests }] = await Promise.all([
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

  const pending = requestsWithProjects.filter((r) => r.status === "pending")
  const fulfilled = requestsWithProjects.filter((r) => r.status === "fulfilled")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          Requests from your team
        </h2>
        <p className="text-sm text-muted-foreground">
          Your development team needs these documents or details to keep moving.
          Respond here, or from the project page.
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
              <CheckCircle2 className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-2xl font-semibold tracking-tight">
                {fulfilled.length}
              </span>
              <span className="text-xs text-muted-foreground">Responded</span>
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
                {requestsWithProjects.length}
              </span>
              <span className="text-xs text-muted-foreground">Total</span>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {fulfilled.length > 0 && (
        <section className="flex flex-col gap-4">
          <CardHeader className="px-0 pb-0">
            <CardTitle className="text-lg">Completed</CardTitle>
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
