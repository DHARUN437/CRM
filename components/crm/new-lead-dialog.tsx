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
import { useState, type ReactElement } from "react"
import { AlertTriangle, Loader2, Plus } from "lucide-react"
import { type LeadStage } from "@/lib/crm"
import { isNonNegativeNumber } from "@/lib/validation"

interface NewLeadDialogProps {
  presetStage?: LeadStage
  trigger?: ReactElement
}

export function NewLeadDialog({ presetStage = "new", trigger }: NewLeadDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [company, setCompany] = useState("")
  const [contact, setContact] = useState("")
  const [value, setValue] = useState("")
  const [source, setSource] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<string[]>([])

  function handleOpen(open: boolean) {
    setOpen(open)
    if (!open) {
      setDuplicates([])
      setError(null)
    }
  }

  async function handleCreate() {
    if (!company.trim()) return
    const valueNum = value === "" ? 0 : Number(value)
    if (value !== "" && !isNonNegativeNumber(valueNum)) {
      setError("Deal value must be a non-negative number")
      return
    }
    setSaving(true)
    setError(null)
    setDuplicates([])

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: company.trim(),
        contact: contact.trim(),
        value: valueNum,
        stage: presetStage,
        source: source.trim() || null,
      }),
    })
    const json = await res.json().catch(() => ({}))

    setSaving(false)
    if (!res.ok) {
      setError(json.error ?? "Could not add lead.")
      return
    }

    const leadDuplicates = json?.duplicateLeads ?? []
    const clientDuplicates = json?.duplicateClients ?? []
    if (leadDuplicates.length > 0 || clientDuplicates.length > 0) {
      setDuplicates([...leadDuplicates, ...clientDuplicates])
      return
    }

    setOpen(false)
    setCompany("")
    setContact("")
    setValue("")
    setSource("")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger render={trigger ?? <Button size="sm"><Plus /> New lead</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>
            Add the deal to the top of your pipeline — you can drag it through
            the stages as it moves.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="lead-company">Company</Label>
            <Input
              id="lead-company"
              placeholder="e.g. Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="lead-contact">Contact</Label>
            <Input
              id="lead-contact"
              placeholder="e.g. Jane Doe"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-value">Deal value (₹)</Label>
              <Input
                id="lead-value"
                type="number"
                min={0}
                placeholder="50000"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lead-source">Source</Label>
              <Input
                id="lead-source"
                placeholder="Referral, Inbound…"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
          </div>
          {duplicates.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                A record already exists for{" "}
                <span className="font-semibold">{duplicates[0]}</span>. This lead was
                added anyway —{" "}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2"
                  onClick={() => {
                    setOpen(false)
                    setDuplicates([])
                    setCompany("")
                    setContact("")
                    setValue("")
                    setSource("")
                    router.refresh()
                  }}
                >
                  view the pipeline
                </button>
                .
              </span>
            </p>
          )}
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!company.trim() || saving}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Add lead
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
