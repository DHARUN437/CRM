import { createClient } from "@/lib/supabase/server"
import type { Invoice, InvoicePayment, ClientPaymentRow } from "@/lib/portal-types"

export async function getInvoicesForClient(clientId: string): Promise<Invoice[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("invoices")
    .select("*, projects(name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  const invoiceIds = (data ?? []).map((inv) => inv.id as string)
  let paymentRows: unknown[] = []
  if (invoiceIds.length > 0) {
    const { data: pRows } = await supabase
      .from("invoice_payments")
      .select("*")
      .in("invoice_id", invoiceIds)
      .order("created_at", { ascending: false })

    paymentRows = pRows ?? []
  }

  const paymentsByInvoice = new Map<string, InvoicePayment[]>()
  for (const payment of (paymentRows ?? []) as InvoicePayment[]) {
    const list = paymentsByInvoice.get(payment.invoice_id) ?? []
    list.push(payment)
    paymentsByInvoice.set(payment.invoice_id, list)
  }

  return (data ?? []).map((inv: Record<string, unknown>) => ({
    id: inv.id as string,
    invoice_number: inv.invoice_number as string,
    client_id: inv.client_id as string,
    project_id: (inv.project_id as string) || null,
    amount: Number(inv.amount),
    tax: Number(inv.tax),
    total: Number(inv.total),
    amount_paid: Number(inv.amount_paid ?? 0),
    status: inv.status as Invoice["status"],
    due_date: inv.due_date as string,
    paid_at: (inv.paid_at as string) || null,
    notes: (inv.notes as string) || null,
    items: (inv.items as Invoice["items"]) || [],
    created_at: inv.created_at as string,
    updated_at: inv.updated_at as string,
    project_name: (inv.projects as { name: string } | null)?.name,
    payments: paymentsByInvoice.get(inv.id as string) ?? [],
  }))
}

export async function getAllInvoicesWithData() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, clients(company, name), projects(name)")
    .order("created_at", { ascending: false })

  const { data: paymentRows } = await supabase
    .from("invoice_payments")
    .select("*, invoices!inner(invoice_number, project_id, projects(name))")
    .order("created_at", { ascending: false })

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

  const withPayments = (invoices ?? []).map((inv: Record<string, unknown>) => {
    const client = inv.clients as { company?: string; name: string } | null
    const total = Number(inv.total)
    const amountPaid = Number(inv.amount_paid ?? 0)
    return {
      ...inv,
      amount: Number(inv.amount),
      tax: Number(inv.tax),
      total,
      amount_paid: amountPaid,
      amount_due: Math.max(total - amountPaid, 0),
      client_name: client?.company || client?.name || "Client",
      project_name: (inv.projects as { name: string } | null)?.name,
      payments: paymentsByInvoice.get(inv.id as string) ?? [],
    }
  })

  return {
    invoices: withPayments as unknown as Invoice[],
    paymentsByClient,
  }
}
