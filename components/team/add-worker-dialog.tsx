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
import { Loader2, UserPlus, AlertCircle } from "lucide-react"
import { isValidEmail } from "@/lib/validation"

export function AddWorkerDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"worker" | "tl">("worker")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function localErrors(): string | null {
    if (!isValidEmail(email)) return "Enter a valid email address"
    if (password.length < 6) return "Password must be at least 6 characters"
    return null
  }

  async function handleAdd() {
    if (!name.trim() || !email.trim() || !password) return
    const local = localErrors()
    if (local) {
      setError(local)
      return
    }
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
          <Button className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-semibold shadow-sm rounded-xl px-4 py-2 text-xs">
            <UserPlus className="size-4 mr-1.5" />
            Add Member
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
            <UserPlus className="size-5 text-[var(--accent)]" />
            Add a Team Member
          </DialogTitle>
          <DialogDescription className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Choose a role — workers see assigned projects; team leads can also assign workers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="w-role" className="text-xs font-semibold text-[var(--text-primary)]">Role *</Label>
            <select
              id="w-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "worker" | "tl")}
              className="w-full text-xs p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
            >
              <option value="worker">Worker</option>
              <option value="tl">Team Lead</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="w-name" className="text-xs font-semibold text-[var(--text-primary)]">Full Name *</Label>
            <Input
              id="w-name"
              placeholder="e.g. Maya Rodriguez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="w-email" className="text-xs font-semibold text-[var(--text-primary)]">Email *</Label>
            <Input
              id="w-email"
              type="email"
              placeholder="maya@agency.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="w-password" className="text-xs font-semibold text-[var(--text-primary)]">Temporary Password *</Label>
            <Input
              id="w-password"
              type="text"
              placeholder="Something they can change later"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button
            type="button"
            onClick={handleAdd}
            disabled={!name.trim() || !email.trim() || !password || loading}
            className="w-full sm:w-auto bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-semibold shadow-sm rounded-xl px-5 py-2.5 text-xs transition-all"
          >
            {loading && <Loader2 className="size-4 animate-spin mr-2" />}
            Create Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}