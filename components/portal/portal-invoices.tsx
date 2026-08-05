"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Receipt, CheckCircle2, Clock } from "lucide-react"
import {
  formatDate,
  INVOICE_PAYMENT_METHOD_META,
  INVOICE_STATUS_META,
  type Invoice,
} from "@/lib/portal-types"

export function PortalInvoices({ invoices }: { invoices: Invoice[] }) {
  const totalOutstanding = invoices
    .filter((inv) => inv.status === "pending" || inv.status === "overdue")
    .reduce(
      (acc, inv) => acc + Math.max(inv.total - Number(inv.amount_paid ?? 0), 0),
      0
    )

  const totalPaid = invoices.reduce(
    (acc, inv) => acc + Number(inv.amount_paid ?? 0),
    0
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <Clock className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">
                ₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground">Outstanding Balance</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
              <CheckCircle2 className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">
                ₹{totalPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-muted-foreground">Total Paid</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
              <Receipt className="size-5" />
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight">{invoices.length}</span>
              <span className="text-xs text-muted-foreground">Total Invoices</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Invoices</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!invoices.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No invoices issued yet for your account.
            </p>
          ) : (
            invoices.map((inv) => {
              const paid = Number(inv.amount_paid ?? 0)
              const due = Math.max(inv.total - paid, 0)
              const partial = paid > 0 && inv.status !== "paid"
              const statusMeta = INVOICE_STATUS_META[inv.status] || INVOICE_STATUS_META.pending
              return (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-foreground/10 bg-card p-4 transition-colors hover:border-foreground/20"
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

                  <div className="flex flex-col items-end">
                    <span className="text-lg font-bold tracking-tight">
                      ₹{inv.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    {partial ? (
                      <span className="text-xs text-muted-foreground">
                        Paid ₹{paid.toFixed(2)} · Pending ₹{due.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Subtotal: ₹{inv.amount.toFixed(2)}
                        {inv.tax > 0 && <> + Tax: ₹{inv.tax.toFixed(2)}</>}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
