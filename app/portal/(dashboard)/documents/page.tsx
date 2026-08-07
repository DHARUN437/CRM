import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
import { UploadDocuments } from "@/components/portal/upload-documents"
import { DocumentPreviewLink } from "@/components/portal/document-preview-link"
import { FileText, FolderOpen } from "lucide-react"
import { formatBytes } from "@/lib/portal-types"
import { EmptyState } from "@/components/portal/empty-state"
import { getPortalProjects, getPortalDocuments } from "@/lib/supabase/portal-data"
import { Card } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function PortalDocumentsPage() {
  const supabase = await createClient()
  const client = await getActiveClient(supabase)
  if (!client) redirect("/portal/login")

  const [projects, documents] = await Promise.all([
    getPortalProjects(supabase, client.id),
    getPortalDocuments(supabase, client.id),
  ])

  const projectName = (doc: { project_id: string }) =>
    projects.find((p) => p.id === doc.project_id)?.name ?? "Project"

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <hr className="w-12 border-t-2 border-primary/20 mb-2" />
          <h2 className="text-3xl font-bold tracking-tight text-foreground">
            Documents
          </h2>
          <p className="text-sm text-muted-foreground">
            {documents?.length ?? 0} document{(documents?.length ?? 0) === 1 ? "" : "s"} shared across your projects.
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
          label="Upload document"
        />
      </div>

      {!documents?.length ? (
        <EmptyState
          title="No documents yet"
          description="You haven't uploaded any files for your projects. Use the upload button above to add some."
          icon={<FolderOpen className="size-8" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {documents.map((doc) => (
            <Card key={doc.id} className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-border/50 bg-card p-5 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-layered glass-card-hover min-h-[160px]">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                    <FileText className="size-5" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <p className="truncate text-sm font-semibold text-foreground" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {projectName(doc)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <span className="text-xs font-medium text-muted-foreground">
                  {formatBytes(doc.file_size)}
                </span>
                <DocumentPreviewLink doc={doc} />
              </div>
              <div className="absolute -bottom-6 -right-6 size-24 rounded-full bg-primary/5 blur-xl group-hover:bg-primary/10 transition-colors" />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
