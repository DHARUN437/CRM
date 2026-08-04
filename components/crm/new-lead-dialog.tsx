"use client"

import { createClient } from "@/lib/supabase/client"
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
import { Loader2, Plus } from "lucide-react"
import { type LeadStage } from "@/lib/crm"

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

  async function handleCreate() {
    if (!company.trim()) return
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { data: currentUser } = await supabase.auth.getUser()
    const { data: me } = await supabase
      .from("team_members")
      .select("id")
      .eq("user_id", currentUser.user?.id ?? "")
      .maybeSingle()

    const { error: err } = await supabase.from("leads").insert({
      company: company.trim(),
      contact: contact.trim(),
      value: value ? Number(value) : 0,
      stage: presetStage,
      score: 0,
      source: source.trim() || null,
      owner_id: me?.id ?? null,
      tags: [],
    })

    setSaving(false)
    if (err) {
      setError(err.message)
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
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Label htmlFor="lead-value">Deal value ($)</Label>
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
