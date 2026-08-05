import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { hasPermission } from "@/lib/permissions"
import { InvoicesList } from "@/components/invoices/invoices-list"
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog"
import { Receipt } from "lucide-react"
import { type ClientPaymentRow, type Invoice } from "@/lib/portal-types"

import { getClientsForSelect } from "@/lib/clients"

export const dynamic = "force-dynamic"

export default async function InvoicesPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!hasPermission(user.role, "clients.view")) redirect("/dashboard")

  const supabase = await createClient()

  const [
    { data: invoices },
    clients,
    { data: projects },
    { data: paymentRows },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false }),
    getClientsForSelect(),
    supabase.from("projects").select("id, name, client_id"),
    supabase
      .from("invoice_payments")
      .select("*, invoices!inner(invoice_number, project_id, projects(name))")
      .order("created_at", { ascending: false }),
  ])

  const payments = (paymentRows ?? []).map((p: Record<string, unknown>) => {
    const inv = p.invoices as
      | { invoice_number: string; projects: { name: string } | null }
      | null
    return {
      id: p.id as string,
      invoice_id: p.invoice_id as string,
      amount: Number(p.amount),
      method: p.method as ClientPaymentRow["method"],
      notes: (p.notes as string) || null,
      created_at: p.created_at as string,
      invoice_number: inv?.invoice_number ?? "—",
      project_name: inv?.projects?.name ?? undefined,
    }
  })

  const invoiceToClient = new Map<string, string>()
  for (const inv of invoices ?? []) {
    invoiceToClient.set(inv.id, inv.client_id)
  }

  const paymentsByInvoice = new Map<string, ClientPaymentRow[]>()
  const paymentsByClient = new Map<string, ClientPaymentRow[]>()
  for (const payment of payments) {
    const invoiceList = paymentsByInvoice.get(payment.invoice_id) ?? []
    invoiceList.push(payment)
    paymentsByInvoice.set(payment.invoice_id, invoiceList)

    const clientId = invoiceToClient.get(payment.invoice_id)
    if (clientId) {
      const clientList = paymentsByClient.get(clientId) ?? []
      clientList.push(payment)
      paymentsByClient.set(clientId, clientList)
    }
  }

  const withPayments = (invoices ?? []).map((inv) => ({
    ...inv,
    payments: paymentsByInvoice.get(inv.id) ?? [],
  }))

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
            clients={
              (clients ?? []) as {
                id: string
                name: string
                company: string | null
              }[]
            }
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
        invoices={(withPayments as unknown as Invoice[])}
        isAdmin={isAdmin}
        paymentsByClient={paymentsByClient}
      />
    </div>
  )
}
