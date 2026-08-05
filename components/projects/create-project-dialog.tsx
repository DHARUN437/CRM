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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, Plus } from "lucide-react"

interface TeamLeadOption {
  id: string
  name: string
}

interface CreateProjectDialogProps {
  clients: { id: string; name: string; company: string | null }[]
  teamLeads: TeamLeadOption[]
}

export function CreateProjectDialog({ clients, teamLeads }: CreateProjectDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [clientId, setClientId] = useState("")
  const [clientLabel, setClientLabel] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [techStack, setTechStack] = useState("")
  const [startDate, setStartDate] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [tlId, setTlId] = useState("")
  const [tlLabel, setTlLabel] = useState("")
  const [budget, setBudget] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!clientId || !name.trim()) return
    setLoading(true)
    setError(null)

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        name: name.trim(),
        description: description.trim() || null,
        tech_stack: techStack
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        start_date: startDate || null,
        due_date: dueDate || null,
        status: "kickoff",
        progress: 0,
        tl_id: tlId || null,
        budget: budget ? parseFloat(budget) : null,
      }),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(json.error ?? "Could not create project.")
      setLoading(false)
      return
    }

    setOpen(false)
    setClientId("")
    setClientLabel("")
    setName("")
    setDescription("")
    setTechStack("")
    setStartDate("")
    setDueDate("")
    setTlId("")
    setTlLabel("")
    setBudget("")
    router.push(`/projects/${json.id}`)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            New project
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Set up a new engagement, assign a Team Lead and budget, then workers.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Client */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="p-client">Client</Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                const val = v ?? ""
                setClientId(val)
                const found = clients.find((c) => c.id === val)
                setClientLabel(found ? (found.company ?? found.name) : "")
              }}
            >
              <SelectTrigger id="p-client">
                <SelectValue placeholder="Select the client">
                  {clientLabel || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company ?? c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project name */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="p-name">Project name</Label>
            <Input
              id="p-name"
              placeholder="e.g. Website Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="p-desc">Description</Label>
            <Textarea
              id="p-desc"
              placeholder="What are we building?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tech stack */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="p-stack">Tech stack</Label>
            <Input
              id="p-stack"
              placeholder="Next.js, Tailwind, Supabase…"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
            />
          </div>

          {/* TL selector */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="p-tl">Team Lead</Label>
            <Select
              value={tlId || "__none__"}
              onValueChange={(v) => {
                const val = v ?? ""
                if (val === "__none__") {
                  setTlId("")
                  setTlLabel("")
                } else {
                  setTlId(val)
                  const found = teamLeads.find((tl) => tl.id === val)
                  setTlLabel(found?.name ?? "")
                }
              }}
            >
              <SelectTrigger id="p-tl">
                <SelectValue placeholder="Assign a TL (optional)">
                  {tlLabel || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Team Lead</SelectItem>
                {teamLeads.map((tl) => (
                  <SelectItem key={tl.id} value={tl.id}>
                    {tl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="p-budget">Budget (₹)</Label>
            <Input
              id="p-budget"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 50000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="p-start">Start date</Label>
            <Input
              id="p-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="p-due">Due date</Label>
            <Input
              id="p-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={!clientId || !name.trim() || loading}
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}