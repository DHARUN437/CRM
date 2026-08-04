import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
import { UploadDocuments } from "@/components/portal/upload-documents"
import { DocumentPreviewLink } from "@/components/portal/document-preview-link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, PackageOpen } from "lucide-react"
import { formatBytes } from "@/lib/portal-types"

export const dynamic = "force-dynamic"

export default async function PortalDocumentsPage() {
  const supabase = await createClient()

  const client = await getActiveClient(supabase)
  if (!client) redirect("/portal/login")

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", client.id)

  const { data: documents } = await supabase
    .from("project_documents")
    .select("*, projects(name)")
    .eq("client_id", client.id)
    .order("created_at", { ascending: false })

  const projectName = (doc: { project_id: string }) =>
    projects?.find((p) => p.id === doc.project_id)?.name ?? "Unknown project"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">
            Your documents
          </h2>
          <p className="text-sm text-muted-foreground">
            Everything you&apos;ve shared with the team, across all projects.
          </p>
        </div>
        <UploadDocuments
          clientId={client.id}
          projects={
            (projects ?? []).map((p) => ({ id: p.id, name: p.name })) as {
              id: string
              name: string
            }[]
          }
          label="Upload documents"
        />
      </div>

      <section className="flex flex-col gap-4">
        <CardHeader className="px-0 pb-0">
          <CardTitle className="text-lg">Shared files</CardTitle>
          <CardDescription>
            {documents?.length ?? 0} document{(documents?.length ?? 0) === 1 ? "" : "s"} shared
            with your development team.
          </CardDescription>
        </CardHeader>

        {!documents?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <PackageOpen className="size-10 text-muted-foreground/50" />
              Nothing here yet. Upload a document to get started.
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
                        {projectName(doc)} · {formatBytes(doc.file_size)} ·{" "}
                        {new Date(doc.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
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
  )
}
