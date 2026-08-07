"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, MoreVertical, Pencil, Trash2, AlertCircle, UserCheck, ShieldAlert } from "lucide-react"
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
import type { TeamMember } from "@/lib/portal-types"
import { isValidEmail } from "@/lib/validation"

export function WorkerRowActions({ member }: { member: TeamMember }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [email, setEmail] = useState(member.email)
  const [password, setPassword] = useState("")
  const [role, setRole] = useState(member.role)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!email.trim() || loading) return
    if (!isValidEmail(email)) {
      setError("Enter a valid email address")
      return
    }
    if (password && password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }
    setLoading(true)
    setError(null)

    const requests: Promise<Response>[] = []

    if (role !== member.role) {
      requests.push(
        fetch(`/api/team-members/${member.id}/role`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        })
      )
    }

    const emailChanged = email.trim() !== member.email || password !== ""
    if (emailChanged) {
      requests.push(
        fetch(`/api/workers/${member.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        })
      )
    }

    const responses = await Promise.all(requests)
    const failed = responses.find((res) => !res.ok)
    const failedJson = failed
      ? await failed.json().catch(() => ({}))
      : null

    if (failed) {
      setError(failedJson?.error ?? "Could not update team member.")
      setLoading(false)
      return
    }

    setEditOpen(false)
    setPassword("")
    router.refresh()
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${member.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? "Could not delete team member.")
      } else {
        setDeleteOpen(false)
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team member.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${member.name}`}
          render={<Button variant="ghost" size="icon-sm" className="size-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" />}
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-xl rounded-xl">
          <DropdownMenuItem onClick={() => { setError(null); setEditOpen(true); }} className="cursor-pointer text-xs">
            <Pencil className="size-4 mr-2 text-[var(--accent)]" />
            Edit Member
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => { setError(null); setDeleteOpen(true); }} disabled={deleting} className="cursor-pointer text-xs text-destructive">
            <Trash2 className="size-4 mr-2" />
            {deleting ? "Deleting…" : "Delete Member"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Member Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-destructive">
              <ShieldAlert className="size-5 text-destructive" />
              Delete {member.name}?
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This permanently removes their account, project assignments, messages, and chat history. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--background)] text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold rounded-xl px-5 py-2.5 text-xs shadow-sm"
            >
              {deleting && <Loader2 className="size-4 animate-spin mr-2" />}
              Delete Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
              <UserCheck className="size-5 text-[var(--accent)]" />
              Edit Team Member
            </DialogTitle>
            <DialogDescription className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Update {member.name}&apos;s role, email, or password. Role changes take effect immediately on next sign in.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="w-edit-role" className="text-xs font-semibold text-[var(--text-primary)]">Role *</Label>
              <select
                id="w-edit-role"
                value={role}
                onChange={(e) => setRole(e.target.value as "worker" | "tl")}
                className="w-full text-xs p-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
              >
                <option value="worker">Worker</option>
                <option value="tl">Team Lead</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="w-edit-email" className="text-xs font-semibold text-[var(--text-primary)]">Email *</Label>
              <Input
                id="w-edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="w-edit-password" className="text-xs font-semibold text-[var(--text-primary)]">New Password (Optional)</Label>
              <Input
                id="w-edit-password"
                type="password"
                placeholder="Leave blank to keep current password"
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
              onClick={handleSave}
              disabled={!email.trim() || loading}
              className="w-full sm:w-auto bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-semibold shadow-sm rounded-xl px-5 py-2.5 text-xs transition-all"
            >
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
