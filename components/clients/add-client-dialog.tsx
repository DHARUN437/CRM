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
import { Loader2, UserPlus } from "lucide-react"

export function AddClientDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!name.trim() || !email.trim() || !password) return
    setLoading(true)
    setError(null)

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        password,
      }),
    })
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(json.error ?? "Could not create client.")
      setLoading(false)
      return
    }

    setOpen(false)
    setName("")
    setCompany("")
    setEmail("")
    setPassword("")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="size-4" />
            Add client
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a client</DialogTitle>
          <DialogDescription>
            The client gets a portal login and will appear in the project
            creation dropdown.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-name">Contact name</Label>
            <Input
              id="c-name"
              placeholder="e.g. Sarah Mitchell"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-company">Company</Label>
            <Input
              id="c-company"
              placeholder="e.g. Acme Corporation"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-email">Email</Label>
            <Input
              id="c-email"
              type="email"
              placeholder="client@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="c-password">Temporary password</Label>
            <Input
              id="c-password"
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
            Create client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
