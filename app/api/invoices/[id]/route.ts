import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"

export const dynamic = "force-dynamic"

const VALID_STATUSES = ["draft", "pending", "paid", "overdue"]

async function getInvoiceId(request: Request): Promise<string | null> {
  const url = new URL(request.url)
  const parts = url.pathname.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? null
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = await getInvoiceId(request)
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const amount = body?.amount !== undefined ? Number(body.amount) : undefined
  const tax = body?.tax !== undefined ? Number(body.tax) : undefined
  const dueDate = typeof body?.dueDate === "string" ? body.dueDate : undefined
  const notes = typeof body?.notes === "string" ? body.notes : undefined
  const items = Array.isArray(body?.items) ? body.items : undefined
  const status = typeof body?.status === "string" ? body.status : undefined

  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
    return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 })
  }
  if (tax !== undefined && (!Number.isFinite(tax) || tax < 0)) {
    return NextResponse.json({ error: "tax must be a non-negative number" }, { status: 400 })
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 })
  }
  if (amount === undefined && tax === undefined && !dueDate && notes === undefined && !items && !status) {
    return NextResponse.json({ error: "nothing to update" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const total = Number(amount ?? invoice.amount) + Number(tax ?? invoice.tax)
  let amountPaid = Math.min(Number(invoice.amount_paid ?? 0), total)
  let newStatus = status ?? invoice.status
  let paidAt = invoice.paid_at

  // Keep the payment model consistent: a paid invoice always has the full
  // amount recorded, and an invoice whose payments cover the total is paid.
  if (newStatus === "paid") {
    amountPaid = total
    paidAt = paidAt ?? new Date().toISOString()
  } else if (amountPaid >= total) {
    newStatus = "paid"
    paidAt = paidAt ?? new Date().toISOString()
  }

  const updateData: Record<string, string | number | object | null> = {
    amount: amount ?? invoice.amount,
    tax: tax ?? invoice.tax,
    total,
    amount_paid: Math.round(amountPaid * 100) / 100,
    status: newStatus,
    due_date: dueDate ?? invoice.due_date,
    notes: notes === undefined ? invoice.notes : notes || null,
    items: items ?? invoice.items,
    updated_at: new Date().toISOString(),
  }
  if (paidAt) updateData.paid_at = paidAt

  const { data: updated, error } = await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invoice: updated })
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user || user.role !== "team") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const id = await getInvoiceId(request)
  if (!id) {
    return NextResponse.json({ error: "missing id" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id")
    .eq("id", id)
    .single()

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  // Deleting the invoice cascades to its invoice_payments rows.
  const { error } = await supabase.from("invoices").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
