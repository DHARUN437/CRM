"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
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

interface DeleteClientDialogProps {
  clientId: string
  clientName: string
}

export function DeleteClientDialog({
  clientId,
  clientName,
}: DeleteClientDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" })
    const json = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? "Could not delete client.")
      return
    }

    setOpen(false)
    router.push("/clients")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
            Delete client
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete client</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{clientName}</span>? They
            will disappear from the CRM and permanently lose their portal login.
            Their records are kept on file and can be restored by an admin.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Delete client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
