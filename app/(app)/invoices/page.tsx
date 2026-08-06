import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { InvoicesList } from "@/components/invoices/invoices-list"
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog"
import { Receipt } from "lucide-react"
import { getClientsForSelect } from "@/lib/clients"
import { getAllInvoicesWithData } from "@/lib/invoices"

export const dynamic = "force-dynamic"

export default async function InvoicesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  // Invoices expose billing data for all clients; only staff (team) may view.
  // getAllInvoicesWithData is RLS-scoped to is_team(), so non-team roles would
  // otherwise render an empty/broken page.
  if (user.role !== "team") redirect("/dashboard")

  const supabase = await createClient()

  const [
    { invoices, paymentsByClient },
    clients,
    { data: projects },
  ] = await Promise.all([
    getAllInvoicesWithData(),
    getClientsForSelect(),
    supabase.from("projects").select("id, name, client_id"),
  ])

  const isAdmin = user.role === "team"

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5">
            <Receipt className="size-5 text-muted-foreground" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
            <p className="text-sm text-muted-foreground">
              Manage all client invoices and payment status.
            </p>
          </div>
        </div>

        {isAdmin && (
          <CreateInvoiceDialog
            clients={clients}
            projects={
              (projects ?? []) as {
                id: string
                name: string
                client_id: string
              }[]
            }
          />
        )}
      </div>

      <InvoicesList
        invoices={invoices}
        isAdmin={isAdmin}
        paymentsByClient={paymentsByClient}
      />
    </div>
  )
}
