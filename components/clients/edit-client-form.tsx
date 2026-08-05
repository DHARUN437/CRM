"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ClientProfile } from "@/lib/portal-types"
import { Loader2 } from "lucide-react"

export function EditClientForm({ client }: { client: ClientProfile }) {
  const router = useRouter()
  const [name, setName] = useState(client.name)
  const [company, setCompany] = useState(client.company ?? "")
  const [phone, setPhone] = useState(client.phone ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    setSaved(false)

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
    setSaved(true)
    router.refresh()
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="e-name">Contact name</Label>
        <Input
          id="e-name"
          placeholder="e.g. Sarah Mitchell"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="e-company">Company</Label>
        <Input
          id="e-company"
          placeholder="e.g. Acme Corporation"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="e-phone">Phone</Label>
        <Input
          id="e-phone"
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
      {saved && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          Saved.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!name.trim() || loading}
          className="w-full sm:w-auto"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Save changes
        </Button>
        <Button variant="ghost" onClick={() => router.push(`/clients/${client.id}`)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}