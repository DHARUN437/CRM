"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword || loading) return

    setError(null)
    setSuccess(null)

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.")
      return
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from your current password.")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !user.email) {
        setError("User session expired. Please sign in again.")
        setLoading(false)
        return
      }

      // Step A: Re-authenticate current password to prevent unauthorized session hijack
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (authErr) {
        setError("Current password is incorrect. Please try again.")
        setLoading(false)
        return
      }

      // Step B: Update password in Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateErr) {
        setError(updateErr.message || "Failed to update password.")
        setLoading(false)
        return
      }

      setSuccess("Password updated successfully! Your new password is now active.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-[var(--surface)] border border-[var(--border)]/60 shadow-sm rounded-2xl">
      <CardHeader className="p-6 border-b border-[var(--border)]/40">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-[var(--text-primary)]">
          <KeyRound className="size-5 text-[var(--accent)]" />
          Change Password
        </CardTitle>
        <CardDescription className="text-xs text-[var(--text-secondary)]">
          Re-authenticate with your current password and create a new password for your account.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-lg">
          <div className="flex flex-col gap-2">
            <Label htmlFor="current-password" className="text-xs font-semibold text-[var(--text-primary)]">
              Current Password *
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter current password"
                className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] pr-10 focus:ring-1 focus:ring-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="new-password-input" className="text-xs font-semibold text-[var(--text-primary)]">
              New Password *
            </Label>
            <div className="relative">
              <Input
                id="new-password-input"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] pr-10 focus:ring-1 focus:ring-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-password-input" className="text-xs font-semibold text-[var(--text-primary)]">
              Confirm New Password *
            </Label>
            <Input
              id="confirm-password-input"
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Re-type new password"
              className="text-xs rounded-xl bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--accent)]"
            />
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 p-3 text-xs font-semibold text-success"
              >
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={!currentPassword || !newPassword || !confirmPassword || loading}
              className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] font-semibold shadow-sm rounded-xl px-5 py-2.5 text-xs transition-all"
            >
              {loading && <Loader2 className="size-4 animate-spin mr-2" />}
              Update Password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
