"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface ClientItem {
  id: string
  name: string
  company: string | null
}

interface CreateInvoiceDialogProps {
  clients?: ClientItem[]
  projects?: { id: string; name: string; client_id: string }[]
  presetClientId?: string
  presetProjectId?: string
}

export function CreateInvoiceDialog({
  clients = [],
  projects = [],
  presetClientId,
  presetProjectId,
}: CreateInvoiceDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientList, setClientList] = useState<ClientItem[]>(clients)

  const [clientId, setClientId] = useState(presetClientId || (clients[0]?.id ?? ""))
  const [projectId, setProjectId] = useState(presetProjectId || "")
  const [amount, setAmount] = useState("")
  const [tax, setTax] = useState("0")
  const [dueDate, setDueDate] = useState("")
  const [itemDescription, setItemDescription] = useState("Software Development Services")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Fetch clients if list is empty or modal opens
  useEffect(() => {
    if (clients.length > 0) {
      setClientList(clients)
      if (!clientId && !presetClientId) {
        setClientId(clients[0].id)
      }
    } else {
      fetch("/api/clients")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            setClientList(data)
            if (!clientId && !presetClientId) {
              setClientId(data[0].id)
            }
          }
        })
        .catch((err) => console.error("Error fetching clients for select:", err))
    }
  }, [clients, open, clientId, presetClientId])

  const filteredProjects = projects.filter((p) => p.client_id === clientId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !amount || !dueDate) {
      setError("Please fill in all required fields (Client, Amount, Due Date).")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          projectId: projectId || undefined,
          amount: parseFloat(amount),
          tax: parseFloat(tax || "0"),
          dueDate,
          notes: notes || undefined,
          items: [
            {
              description: itemDescription,
              quantity: 1,
              unit_price: parseFloat(amount),
            },
          ],
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to create invoice")
      }

      setOpen(false)
      setAmount("")
      setNotes("")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0])
          setError(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" />
            Create Invoice
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            <DialogTitle>Issue New Invoice</DialogTitle>
          </div>
          <DialogDescription>
            Create an invoice for your client. They will see it instantly in their portal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          {!presetClientId && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Client *</Label>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value)
                  setProjectId("")
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                {!clientList.length && <option value="">Loading clients...</option>}
                {clientList.map((c) => (
                  <option key={c.id} value={c.id} className="bg-popover text-popover-foreground">
                    {c.company ? `${c.company} (${c.name})` : c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filteredProjects.length > 0 && !presetProjectId && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Associated Project (Optional)</Label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              >
                <option value="" className="bg-popover text-popover-foreground">
                  No Project (General Invoice)
                </option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-popover text-popover-foreground">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                placeholder="2500.00"
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
                placeholder="0.00"
              />
            </div>
          </div>

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
            <Label className="text-xs">Notes / Payment Terms (Optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Payment due within 14 days via bank transfer."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Create & Issue Invoice
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
