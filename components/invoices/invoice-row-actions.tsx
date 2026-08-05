"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  INVOICE_STATUS_META,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/portal-types"

const STATUS_OPTIONS: InvoiceStatus[] = ["draft", "pending", "paid", "overdue"]

export function InvoiceRowActions({ invoice }: { invoice: Invoice }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [amount, setAmount] = useState(String(invoice.amount))
  const [tax, setTax] = useState(String(invoice.tax))
  const [dueDate, setDueDate] = useState(invoice.due_date)
  const [itemDescription, setItemDescription] = useState(
    invoice.items?.[0]?.description ?? "Software Development Services"
  )
  const [notes, setNotes] = useState(invoice.notes ?? "")
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status)
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    const numAmount = parseFloat(amount)
    const numTax = parseFloat(tax || "0")
    if (!amount || Number.isNaN(numAmount) || numAmount < 0) {
      setError("Enter a valid amount.")
      return
    }
    if (!dueDate || Number.isNaN(numTax) || numTax < 0) {
      setError("Enter a valid due date and tax.")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          tax: numTax,
          dueDate,
          notes,
          items: [
            { description: itemDescription, quantity: 1, unit_price: numAmount },
          ],
          status,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error ?? "Could not update invoice.")
      }
      setEditOpen(false)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    const confirmed = window.confirm(
      `Delete invoice ${invoice.invoice_number}? This permanently removes it and all its recorded payments.`
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        window.alert(json.error ?? "Could not delete invoice.")
      } else {
        router.refresh()
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${invoice.invoice_number}`}
          render={<Button variant="ghost" size="icon-sm" className="size-8" />}
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="size-4" />
            {deleting ? "Deleting…" : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit invoice — {invoice.invoice_number}</DialogTitle>
            <DialogDescription>
              Update the amount, due date, notes or status. Existing payments are
              preserved; changing the status to Paid records the full amount as paid.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
            className="flex flex-col gap-4 pt-1"
          >
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Service / Item Description *</Label>
              <Input
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g. Milestone 1 - Frontend Architecture"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Tax (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Due Date *</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {INVOICE_STATUS_META[s].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Notes / Payment Terms (Optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Payment due within 14 days via bank transfer."
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
