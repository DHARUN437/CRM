import { createClient } from "@/lib/supabase/server"
import type { Invoice, InvoicePayment } from "@/lib/portal-types"

export async function getInvoicesForClient(clientId: string): Promise<Invoice[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("invoices")
    .select("*, projects(name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  const invoiceIds = (data ?? []).map((inv) => inv.id as string)
  const { data: paymentRows } = invoiceIds.length
    ? await supabase
        .from("invoice_payments")
        .select("*")
        .in("invoice_id", invoiceIds)
        .order("created_at", { ascending: false })
    : { data: [] }

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

export async function getAllInvoices(): Promise<Invoice[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("invoices")
    .select("*, clients(company, name), projects(name)")
    .order("created_at", { ascending: false })

  return (data ?? []).map((inv: Record<string, unknown>) => {
    const client = inv.clients as { company?: string; name: string } | null
    const total = Number(inv.total)
    const amountPaid = Number(inv.amount_paid ?? 0)
    return {
      id: inv.id as string,
      invoice_number: inv.invoice_number as string,
      client_id: inv.client_id as string,
      project_id: (inv.project_id as string) || null,
      amount: Number(inv.amount),
      tax: Number(inv.tax),
      total,
      amount_paid: amountPaid,
      amount_due: Math.max(total - amountPaid, 0),
      status: inv.status as Invoice["status"],
      due_date: inv.due_date as string,
      paid_at: (inv.paid_at as string) || null,
      notes: (inv.notes as string) || null,
      items: (inv.items as Invoice["items"]) || [],
      created_at: inv.created_at as string,
      updated_at: inv.updated_at as string,
      client_name: client?.company || client?.name || "Client",
      project_name: (inv.projects as { name: string } | null)?.name,
    }
  })
}
