import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/supabase/session"
import { ClientProfile } from "@/components/clients/client-profile"
import { InviteClientDialog } from "@/components/clients/invite-client-dialog"
import { EditClientDialog } from "@/components/clients/edit-client-dialog"
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog"
import { hasPermission } from "@/lib/permissions"
import { Building2, ChevronRight, ArrowLeft } from "lucide-react"
import { formatDate } from "@/lib/portal-types"
import { getClientProfileDetails } from "@/lib/clients"

export const dynamic = "force-dynamic"

interface ClientProfilePageProps {
  params: Promise<{ id: string }>
}

export default async function ClientProfilePage({
  params,
}: ClientProfilePageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!hasPermission(user.role, "clients.view")) redirect("/dashboard")

  const details = await getClientProfileDetails(id)
  if (!details) notFound()

  const { client, projects, documents, notes, payments, openTasksCount } = details
  const displayName = client.company ?? client.name

  return (
    <div className="flex flex-col gap-6">
      {/* Back button & Breadcrumb */}
      <div className="flex flex-col gap-2">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" />
          Back to Clients
        </Link>

        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/dashboard" className="transition-colors hover:text-foreground">
            Dashboard
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href="/clients" className="transition-colors hover:text-foreground">
            Clients
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="font-medium text-foreground">{displayName}</span>
        </nav>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground/5">
            <Building2 className="size-5 text-muted-foreground" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {displayName}
            </h1>
            {client.company && (
              <p className="text-sm text-muted-foreground">{client.name}</p>
            )}
            <p className="text-xs text-muted-foreground/70">
              Client since {formatDate(client.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <InviteClientDialog
            clientId={client.id}
            clientName={displayName}
            clientEmail={client.email}
          />
          <EditClientDialog client={client} />
          <DeleteClientDialog clientId={client.id} clientName={displayName} />
        </div>
      </div>

      {/* Tabs */}
      <ClientProfile
        client={client}
        projects={projects}
        documents={documents}
        notes={notes}
        payments={payments}
        openTasksCount={openTasksCount}
      />
    </div>
  )
}