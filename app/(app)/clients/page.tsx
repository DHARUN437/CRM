import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { AddClientDialog } from "@/components/clients/add-client-dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Contact, FolderKanban } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ClientsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()

  if (!user) redirect("/login")
  if (user.role !== "team") redirect("/dashboard")

  const [{ data: clients }, { data: projects }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, company, email, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("client_id"),
  ])

  const projectCounts = new Map<string, number>()
  for (const p of projects ?? []) {
    projectCounts.set(p.client_id, (projectCounts.get(p.client_id) ?? 0) + 1)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-balance text-2xl font-semibold tracking-tight">
            Clients
          </h2>
          <p className="text-sm text-muted-foreground">
            Add clients here so they appear in the new-project dropdown.
          </p>
        </div>
        <AddClientDialog />
      </div>

      {!clients?.length ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Contact className="mx-auto mb-2 size-8 text-muted-foreground/50" />
            No clients yet. Add your first client to start creating projects
            for them.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-foreground/10">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
                      <Building2 className="size-4 text-muted-foreground" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-sm font-medium">
                        {client.company ?? client.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {client.name} · {client.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                      <FolderKanban className="size-3.5" />
                      {projectCounts.get(client.id) ?? 0} project
                      {(projectCounts.get(client.id) ?? 0) === 1 ? "" : "s"}
                    </span>
                    <Badge variant="outline">Client</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
