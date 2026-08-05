"use client"

import { useState } from "react"
import { Banknote, History, Landmark, Smartphone, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  formatDate,
  INVOICE_PAYMENT_METHOD_META,
  type ClientPaymentRow,
  type PaymentMethod,
} from "@/lib/portal-types"

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  gpay: Smartphone,
  netbanking: Landmark,
}

const METHOD_ORDER: PaymentMethod[] = ["cash", "gpay", "netbanking"]

export function PaymentHistoryDialog({
  clientName,
  payments,
}: {
  clientName: string
  payments: ClientPaymentRow[]
}) {
  const [open, setOpen] = useState(false)

  const totals = METHOD_ORDER.map((method) => ({
    method,
    label: INVOICE_PAYMENT_METHOD_META[method].label,
    badge: INVOICE_PAYMENT_METHOD_META[method].badge,
    Icon: METHOD_ICONS[method],
    total: payments
      .filter((p) => p.method === method)
      .reduce((acc, p) => acc + Number(p.amount), 0),
  }))

  const grandTotal = totals.reduce((acc, t) => acc + t.total, 0)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <History className="size-3.5" />
        Payment history
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Payment history — {clientName}</DialogTitle>
          <DialogDescription>
            All payments received from this client across their invoices, split
            by method.
          </DialogDescription>
        </DialogHeader>

        {!payments.length ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <Wallet className="size-8 text-muted-foreground/50" />
            No payments recorded for this client yet.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              {totals.map(({ method, label, badge, Icon, total }) => (
                <div
                  key={method}
                  className="flex flex-col items-center gap-1 rounded-xl border border-foreground/10 bg-background p-3 text-center"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${badge}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-bold tracking-tight">
                    ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">All payments</h4>
              <span className="text-xs text-muted-foreground">
                Total received:{" "}
                <span className="font-semibold text-foreground">
                  ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </span>
            </div>

            <div className="max-h-72 flex flex-col gap-2 overflow-y-auto pr-1">
              {payments.map((payment) => {
                const meta =
                  INVOICE_PAYMENT_METHOD_META[payment.method] ??
                  INVOICE_PAYMENT_METHOD_META.cash
                const Icon = METHOD_ICONS[payment.method]
                return (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-foreground/10 bg-background p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${meta.badge}`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <p className="truncate text-sm font-medium">
                          {payment.invoice_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(payment.created_at)}
                          {payment.project_name && <> · {payment.project_name}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      <span className="text-sm font-bold tracking-tight">
                        ₹{Number(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
