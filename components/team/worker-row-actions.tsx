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
import type { TeamMember } from "@/lib/portal-types"

export function WorkerRowActions({ member }: { member: TeamMember }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [email, setEmail] = useState(member.email)
  const [password, setPassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!email.trim() || loading) return
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/workers/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(json.error ?? "Could not update worker.")
      setLoading(false)
      return
    }

    setEditOpen(false)
    setPassword("")
    router.refresh()
  }

  async function handleDelete() {
    if (deleting) return
    const confirmed = window.confirm(
      `Delete ${member.name}? This permanently removes their account, project assignments, messages and chat history.`
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/workers/${member.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        window.alert(json.error ?? "Could not delete worker.")
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
          aria-label={`Actions for ${member.name}`}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit worker</DialogTitle>
            <DialogDescription>
              Update {member.name}&apos;s email or password.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="w-edit-email">Email</Label>
              <Input
                id="w-edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="w-edit-password">New password</Label>
              <Input
                id="w-edit-password"
                type="text"
                placeholder="Leave blank to keep the current password"
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
              onClick={handleSave}
              disabled={!email.trim() || loading}
              className="w-full sm:w-auto"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
