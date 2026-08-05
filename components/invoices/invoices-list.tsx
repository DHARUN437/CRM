"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Receipt, FileDown } from "lucide-react"
import {
  formatDate,
  INVOICE_PAYMENT_METHOD_META,
  INVOICE_STATUS_META,
  type ClientPaymentRow,
  type Invoice,
} from "@/lib/portal-types"
import { exportToCSV } from "@/lib/export"
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog"
import { PaymentHistoryDialog } from "@/components/invoices/payment-history-dialog"
import { InvoiceRowActions } from "@/components/invoices/invoice-row-actions"

export function InvoicesList({
  invoices,
  isAdmin = false,
  paymentsByClient,
}: {
  invoices: Invoice[]
  isAdmin?: boolean
  paymentsByClient?: Map<string, ClientPaymentRow[]>
}) {
  function handleExport() {
    exportToCSV(
      "Invoices",
      invoices.map((inv) => {
        const paid = Number(inv.amount_paid ?? 0)
        const methods = [
          ...new Set(
            (inv.payments ?? []).map(
              (p) => INVOICE_PAYMENT_METHOD_META[p.method].label
            )
          ),
        ].join(" + ")
        return {
          Invoice_Number: inv.invoice_number,
          Client: inv.client_name || inv.client_id,
          Project: inv.project_name || "General",
          Amount: inv.amount,
          Tax: inv.tax,
          Total: inv.total,
          Amount_Paid: paid,
          Balance: Math.max(inv.total - paid, 0),
          Status: inv.status,
          Payment_Methods: methods || "N/A",
          Due_Date: inv.due_date,
          Paid_At: inv.paid_at || "N/A",
        }
      })
    )
  }

  if (!invoices.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <Receipt className="size-8 text-muted-foreground/50" />
          No invoices issued yet. Create one above to track client billing.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <FileDown className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {invoices.map((inv) => {
          const paid = Number(inv.amount_paid ?? 0)
          const due = Math.max(inv.total - paid, 0)
          const partial = paid > 0 && inv.status !== "paid"
          const statusMeta =
            INVOICE_STATUS_META[inv.status] || INVOICE_STATUS_META.pending
          return (
            <div
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-foreground/10 bg-background p-4 transition-colors hover:border-foreground/25"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground">
                  <Receipt className="size-5" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{inv.invoice_number}</span>
                    {partial ? (
                      <Badge className="bg-warning/15 text-warning">Partially Paid</Badge>
                    ) : (
                      <Badge className={statusMeta.badge}>{statusMeta.label}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {inv.client_name && <span>{inv.client_name} · </span>}
                    {inv.project_name ? inv.project_name : "General Billing"}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    Due {formatDate(inv.due_date)}
                    {inv.status === "paid" && inv.paid_at && (
                      <> · Paid on {formatDate(inv.paid_at)}</>
                    )}
                    {partial && (
                      <>
                        {" "}
                        · Paid ₹{paid.toFixed(2)} · Pending ₹{due.toFixed(2)}
                      </>
                    )}
                  </p>
                  {inv.payments && inv.payments.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {inv.payments.map((payment) => {
                        const meta =
                          INVOICE_PAYMENT_METHOD_META[payment.method] ??
                          INVOICE_PAYMENT_METHOD_META.cash
                        return (
                          <span
                            key={payment.id}
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.badge}`}
                          >
                            {meta.label} · ₹{Number(payment.amount).toFixed(2)}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-base font-bold tracking-tight">
                    ₹{inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  {partial ? (
                    <span className="text-[11px] text-muted-foreground">
                      ₹{paid.toFixed(2)} paid · ₹{due.toFixed(2)} pending
                    </span>
                  ) : inv.tax > 0 ? (
                    <span className="text-[11px] text-muted-foreground">
                      Subtotal: ₹{inv.amount.toFixed(2)} + Tax: ₹{inv.tax.toFixed(2)}
                    </span>
                  ) : null}
                </div>

                {isAdmin && (
                  <PaymentHistoryDialog
                    clientName={inv.client_name ?? "Client"}
                    payments={
                      paymentsByClient?.get(inv.client_id) ??
                      (inv.payments ?? []).map((p) => ({
                        id: p.id,
                        invoice_id: p.invoice_id,
                        amount: Number(p.amount),
                        method: p.method,
                        notes: p.notes ?? null,
                        created_at: p.created_at,
                        invoice_number: inv.invoice_number,
                        project_name: inv.project_name,
                      }))
                    }
                  />
                )}

                {isAdmin && inv.status !== "paid" && (
                  <RecordPaymentDialog invoice={inv} />
                )}

                {isAdmin && <InvoiceRowActions invoice={inv} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
