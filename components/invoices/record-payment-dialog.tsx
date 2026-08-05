"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Banknote, Landmark, Loader2, Smartphone, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Invoice, PaymentMethod } from "@/lib/portal-types"

const METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "gpay", label: "GPay", icon: Smartphone },
  { value: "netbanking", label: "Net Banking", icon: Landmark },
]

export function RecordPaymentDialog({ invoice }: { invoice: Invoice }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remaining = Math.max(
    invoice.total - Number(invoice.amount_paid ?? 0),
    0
  )
  const alreadyPaid = Number(invoice.amount_paid ?? 0)

  function openDialog() {
    setAmount(remaining > 0 ? remaining.toFixed(2) : "")
    setMethod("cash")
    setError(null)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = parseFloat(amount)
    if (!amount || Number.isNaN(value) || value <= 0) {
      setError("Enter a valid amount greater than zero.")
      return
    }
    if (value > remaining + 0.005) {
      setError(`Amount cannot exceed the remaining balance of ₹${remaining.toFixed(2)}.`)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: invoice.id, paymentAmount: value, paymentMethod: method }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? "Could not record payment.")
      }
      setOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <Wallet className="size-3.5 text-success" />
        Record Payment
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment — {invoice.invoice_number}</DialogTitle>
          <DialogDescription>
            {alreadyPaid > 0 ? (
              <>
                Paid so far: ₹{alreadyPaid.toFixed(2)}. Remaining: ₹
                {remaining.toFixed(2)}. Enter the amount received.
              </>
            ) : (
              <>
                Invoice total: ₹{invoice.total.toFixed(2)}. Enter the amount
                received. A full payment marks it Paid; a smaller amount keeps it
                Pending with the balance shown.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pay-amount">Amount received (₹)</Label>
            <Input
              id="pay-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Payment method</Label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon
                const active = method === m.value
                return (
                  <Button
                    key={m.value}
                    type="button"
                    variant={active ? "default" : "outline"}
                    size="sm"
                    className="flex flex-col gap-1 py-2.5 h-auto"
                    onClick={() => setMethod(m.value)}
                  >
                    <Icon className="size-4" />
                    <span className="text-xs">{m.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {parseFloat(amount) >= remaining - 0.005 && amount !== "" ? (
              <span className="text-success">
                This covers the full balance — the invoice will be marked Paid.
              </span>
            ) : (
              "A partial amount keeps the invoice Pending until the rest is paid."
            )}
          </p>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
