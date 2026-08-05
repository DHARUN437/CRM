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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, UserPlus } from "lucide-react"

export function AddWorkerDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"worker" | "tl">("worker")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!name.trim() || !email.trim() || !password) return
    setLoading(true)
    setError(null)

    const res = await fetch("/api/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password, role }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(json.error ?? "Could not create team member.")
      setLoading(false)
      return
    }

    setOpen(false)
    setName("")
    setEmail("")
    setPassword("")
    setRole("worker")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="size-4" />
            Add member
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a team member</DialogTitle>
          <DialogDescription>
            Choose a role — workers see only assigned projects; team leads can also assign workers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="w-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "worker" | "tl")}>
              <SelectTrigger id="w-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="worker" label="Worker">
                  Worker
                </SelectItem>
                <SelectItem value="tl" label="Team Lead">
                  Team Lead
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="w-name">Full name</Label>
            <Input
              id="w-name"
              placeholder="e.g. Maya Rodriguez"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="w-email">Email</Label>
            <Input
              id="w-email"
              type="email"
              placeholder="maya@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="w-password">Temporary password</Label>
            <Input
              id="w-password"
              type="text"
              placeholder="Something they can change later"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleAdd}
            disabled={!name.trim() || !email.trim() || !password || loading}
            className="w-full sm:w-auto"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Create member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}