import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { DocumentsView, type TeamDocument } from "@/components/documents/documents-view"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileUp, FolderKanban, Inbox } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function DocumentsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const isWorker = user.role === "worker"

  // Workers see documents for their assigned projects
  let scopedProjectIds: string[] | null = null
  if (isWorker) {
    const { data: myMember } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (myMember) {
      const { data: assigned } = await supabase
        .from("project_assignments")
        .select("project_id")
        .eq("team_member_id", myMember.id)
      scopedProjectIds = (assigned ?? []).map((a) => a.project_id)
    }
  }

  let documentsQuery = supabase
    .from("project_documents")
    .select("*, projects(name), clients(name, company)")
    .order("created_at", { ascending: false })

  if (isWorker && scopedProjectIds && scopedProjectIds.length > 0) {
    documentsQuery = documentsQuery.in("project_id", scopedProjectIds)
  }

  const [{ data: documents }, { data: projects }, { data: clients }] =
    await Promise.all([
      documentsQuery,
      supabase.from("projects").select("id, name"),
      supabase.from("clients").select("id"),
    ])

  const docRows = (documents ?? []) as unknown as TeamDocument[]
  const projectList = (projects ?? []) as { id: string; name: string }[]

  const stats = [
    { label: "Client documents", value: docRows.length, icon: FileUp },
    { label: "Active projects", value: projectList.length, icon: FolderKanban },
    { label: "Clients", value: clients?.length ?? 0, icon: Inbox },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-balance text-2xl font-semibold tracking-tight">
          Client Documents
        </h2>
        <p className="text-sm text-muted-foreground">
          {isWorker
            ? "Documents uploaded by clients for your assigned projects — preview or download to use in development."
            : "Documents uploaded by clients through the portal — preview or download to use in development."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
                <stat.icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold tracking-tight">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <CardHeader className="px-0 pb-0">
          <CardTitle className="text-lg">All shared documents</CardTitle>
          <CardDescription>
            {docRows.length} file{docRows.length === 1 ? "" : "s"} available for the development team.
          </CardDescription>
        </CardHeader>
        <DocumentsView documents={docRows} allProjects={projectList} />
      </section>
    </div>
  )
}