"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, Pencil } from "lucide-react"
import type { ClientProfile } from "@/lib/portal-types"
import { isValidPhone } from "@/lib/validation"

interface EditClientDialogProps {
  client: ClientProfile
}

export function EditClientDialog({ client }: EditClientDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(client.name)
  const [company, setCompany] = useState(client.company ?? "")
  const [phone, setPhone] = useState(client.phone ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) return
    if (phone && !isValidPhone(phone)) {
      setError("Enter a valid phone number")
      return
    }
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        company: company.trim(),
        phone: phone.trim(),
      }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(json.error ?? "Could not update client.")
      setLoading(false)
      return
    }

    setLoading(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Edit client
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit client details</DialogTitle>
          <DialogDescription>
            Update contact information and company details for {client.company ?? client.name}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ec-name">Contact name</Label>
            <Input
              id="ec-name"
              placeholder="e.g. Sarah Mitchell"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ec-company">Company</Label>
            <Input
              id="ec-company"
              placeholder="e.g. Acme Corporation"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ec-email">Email (Account)</Label>
            <Input
              id="ec-email"
              type="email"
              value={client.email}
              disabled
              className="bg-muted/50 cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="ec-phone">Phone number</Label>
            <Input
              id="ec-phone"
              placeholder="e.g. +1 555 000 1234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || loading}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
