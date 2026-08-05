"use client"

import { useState } from "react"
import { Mail, Copy, Check, Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function InviteClientDialog({
  clientId,
  clientName,
  clientEmail,
}: {
  clientId: string
  clientName: string
  clientEmail: string
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerateInvite() {
    setLoading(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/invite`, {
        method: "POST",
      })
      if (res.ok) {
        const data = await res.json()
        setInviteUrl(data.inviteUrl)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (!inviteUrl) return
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Send className="size-4" />
            Invite to Portal
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            <DialogTitle>Invite {clientName} to Portal</DialogTitle>
          </div>
          <DialogDescription>
            Generate an instant onboarding link for {clientEmail} to log into their Client Portal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-3">
          {!inviteUrl ? (
            <Button onClick={handleGenerateInvite} disabled={loading} className="w-full">
              {loading ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Send className="size-4 mr-1.5" />
              )}
              Generate Portal Invite Link
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Client Portal Onboarding Link:
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-xs font-mono text-foreground"
                />
                <Button size="sm" onClick={handleCopy} className="shrink-0">
                  {copied ? (
                    <Check className="size-4 text-success" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Share this link with {clientEmail}. They can sign in directly to track their project progress.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
