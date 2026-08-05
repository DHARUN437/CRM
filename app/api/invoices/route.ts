import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    clientId,
    projectId,
    amount,
    tax = 0,
    dueDate,
    notes,
    items = [],
    status = "pending",
  } = body

  if (!clientId || !amount || !dueDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
  const numAmount = Number(amount)
  const numTax = Number(tax)
  const total = numAmount + numTax

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      invoice_number: invoiceNumber,
      client_id: clientId,
      project_id: projectId || null,
      amount: numAmount,
      tax: numTax,
      total,
      status,
      due_date: dueDate,
      notes: notes || null,
      items,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify client if user profile exists
  const { data: client } = await supabase
    .from("clients")
    .select("user_id")
    .eq("id", clientId)
    .single()

  if (client?.user_id) {
    await supabase.from("notifications").insert({
      user_id: client.user_id,
      title: "New Invoice Issued",
      message: `Invoice ${invoiceNumber} for ₹${total.toFixed(2)} is now available.`,
      link: "/portal/invoices",
      type: "info",
    })
  }

  return NextResponse.json({ invoice: data })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { invoiceId, paymentAmount, paymentMethod = "cash", notes } = body

  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 })
  }

  const method = String(paymentMethod)
  const VALID_METHODS = ["cash", "gpay", "netbanking"]
  if (!VALID_METHODS.includes(method)) {
    return NextResponse.json(
      { error: "paymentMethod must be cash, gpay or netbanking" },
      { status: 400 }
    )
  }

  const amount = Number(paymentAmount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "paymentAmount must be a positive number" },
      { status: 400 }
    )
  }

  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single()

  if (fetchError || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
  }

  const total = Number(invoice.total)
  const paidSoFar = Number(invoice.amount_paid ?? 0)
  const newPaid = Math.min(paidSoFar + amount, total)
  const fullyPaid = newPaid >= total - 0.005

  const updateData: Record<string, string | number> = {
    amount_paid: fullyPaid ? total : Math.round(newPaid * 100) / 100,
    updated_at: new Date().toISOString(),
  }
  if (fullyPaid) {
    updateData.status = "paid"
    updateData.paid_at = new Date().toISOString()
  } else {
    updateData.status = "pending"
  }

  const { data: payment, error: paymentError } = await supabase
    .from("invoice_payments")
    .insert({
      invoice_id: invoiceId,
      amount: Math.min(amount, total - paidSoFar),
      method,
      notes: typeof notes === "string" ? notes || null : null,
    })
    .select()
    .single()

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 })
  }

  const { data, error } = await supabase
    .from("invoices")
    .update(updateData)
    .eq("id", invoiceId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify the client so the payment is reflected in their portal.
  const { data: client } = await supabase
    .from("clients")
    .select("user_id")
    .eq("id", invoice.client_id)
    .single()

  if (client?.user_id) {
    const due = Math.max(total - Number(updateData.amount_paid), 0)
    const amountPaid = Number(updateData.amount_paid)
    const methodLabel =
      method === "gpay" ? "GPay" : method === "netbanking" ? "Net Banking" : "Cash"
    await supabase.from("notifications").insert({
      user_id: client.user_id,
      title: fullyPaid ? "Payment Received" : "Partial Payment Received",
      message: fullyPaid
        ? `Payment of ₹${total.toFixed(2)} received for ${invoice.invoice_number} via ${methodLabel}.`
        : `Partial payment of ₹${amountPaid.toFixed(2)} received for ${invoice.invoice_number} via ${methodLabel}. ₹${due.toFixed(2)} remaining.`,
      link: "/portal/invoices",
      type: "info",
    })
  }

  return NextResponse.json({ invoice: data, payment })
}
