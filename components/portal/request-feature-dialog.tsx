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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
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
import { useState, type ReactElement } from "react"
import { Loader2 } from "lucide-react"
import { type FeatureRequestPriority } from "@/lib/portal-types"
import { useIsMobile } from "@/hooks/use-mobile"

interface RequestFeatureDialogProps {
  projectId: string
  clientId: string
  trigger?: ReactElement
}

export function RequestFeatureDialog({
  projectId,
  clientId,
  trigger,
}: RequestFeatureDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<FeatureRequestPriority>("medium")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMobile = useIsMobile()

  async function handleCreate() {
    if (!title.trim()) return
    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/feature-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          clientId,
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to submit feature request")
      }

      setOpen(false)
      setTitle("")
      setDescription("")
      setPriority("medium")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit feature request")
    } finally {
      setSaving(false)
    }
  }

  const FormContent = () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fr-title">What do you need?</Label>
        <Input
          id="fr-title"
          placeholder="e.g. Add dark mode toggle"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="fr-desc">Details (optional)</Label>
        <Textarea
          id="fr-desc"
          placeholder="Describe the feature, how it should work, why you need it…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Priority</Label>
        <Select value={priority} onValueChange={(v) => { if (v) setPriority(v as FeatureRequestPriority) }}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          {trigger ?? <Button size="sm">Request a feature</Button>}
        </DrawerTrigger>
        <DrawerContent className="px-4">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle>Request a feature</DrawerTitle>
            <DrawerDescription>
              Tell the team what you&apos;d like built or fixed — they&apos;ll
              review it and update the status.
            </DrawerDescription>
          </DrawerHeader>
          <FormContent />
          <DrawerFooter className="px-0 pt-4 pb-8">
            <Button onClick={handleCreate} disabled={!title.trim() || saving} className="w-full">
              {saving && <Loader2 className="size-4 animate-spin mr-2" />}
              Submit request
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm">Request a feature</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle>Request a feature</DialogTitle>
          <DialogDescription>
            Tell the team what you&apos;d like built or fixed — they&apos;ll
            review it and update the status.
          </DialogDescription>
        </DialogHeader>
        <FormContent />
        <DialogFooter className="mt-4">
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || saving}
            className="w-full sm:w-auto"
          >
            {saving && <Loader2 className="size-4 animate-spin mr-2" />}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
