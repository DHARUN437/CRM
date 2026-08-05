"use client"

import { Banknote, Landmark, Smartphone, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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

export function ClientPaymentsTab({ payments }: { payments: ClientPaymentRow[] }) {
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

  if (!payments.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <Wallet className="size-8 text-muted-foreground/50" />
          No payments recorded for this client yet. Record a payment from the
          Invoices page and it will show up here.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Totals by method */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {totals.map(({ method, label, badge, Icon, total }) => (
          <Card key={method}>
            <CardContent className="flex items-center gap-3 p-4">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${badge}`}
              >
                <Icon className="size-5" />
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight">
                  ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Grand total + history */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-medium">Payment History</h4>
            <span className="text-xs text-muted-foreground">
              Total received:{" "}
              <span className="font-semibold text-foreground">
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {payments.map((payment) => {
              const meta =
                INVOICE_PAYMENT_METHOD_META[payment.method] ??
                INVOICE_PAYMENT_METHOD_META.cash
              const Icon = METHOD_ICONS[payment.method]
              return (
                <div
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/10 bg-background p-3 transition-colors hover:border-foreground/25"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${meta.badge}`}
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
        </CardContent>
      </Card>
    </div>
  )
}
