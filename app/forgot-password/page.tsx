"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { AuthLayout } from "@/components/ui/auth-layout"
import { Loader2, Mail, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { isValidEmail } from "@/lib/validation"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const origin = typeof window !== "undefined" ? window.location.origin : ""

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${origin}/reset-password`,
        }
      )

      if (resetError) {
        console.error("Password reset request error:", resetError)
        setError("Unable to send reset link. Please try again.")
      } else {
        setSubmitted(true)
      }
    } catch (err) {
      console.error("Password reset exception:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your account email to receive a password reset link."
    >
      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col gap-5 w-full mt-4 p-6 rounded-2xl bg-white border border-[var(--border)] shadow-sm text-center"
        >
          <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)]">
            <CheckCircle2 className="size-6" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Reset Link Sent</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              If an account exists for <span className="font-semibold text-[var(--text-primary)]">{email}</span>, a password reset link has been sent. Please check your inbox and spam folder.
            </p>
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Return to Staff Sign In
            </Link>
            <Link
              href="/portal/login"
              className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Return to Client Portal Sign In
            </Link>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full mt-4">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--accent)] z-10" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder=" "
              className="peer h-14 w-full rounded-xl border border-[var(--border)] bg-white pl-11 pr-4 text-sm text-[var(--text-primary)] shadow-sm transition-all duration-300 hover:border-[var(--text-muted)]/50 focus:border-[var(--accent)]/60 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10"
            />
            <label
              htmlFor="email"
              className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-[var(--text-muted)] transition-all duration-300 peer-focus:-translate-y-7 peer-focus:text-xs peer-focus:text-[var(--accent)] peer-focus:font-medium peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-[var(--text-secondary)] pointer-events-none"
            >
              Email Address
            </label>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="flex items-center gap-3 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 px-4 py-3 text-sm font-medium text-[var(--danger)] shadow-inner"
              >
                <AlertCircle className="size-4.5 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center w-full mt-2">
            <motion.button
              whileHover={!loading ? { scale: 1.01 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              type="submit"
              disabled={loading || !email.trim()}
              className="relative group h-14 w-full overflow-hidden rounded-xl bg-gradient-to-b from-[var(--accent)] to-[var(--accent-hover)] font-semibold text-white shadow-[0_0_20px_rgba(47,111,237,0.3)] transition-all hover:shadow-[0_0_30px_rgba(47,111,237,0.5)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              {loading ? (
                <Loader2 className="size-5 animate-spin relative z-10" />
              ) : (
                <div className="relative flex items-center justify-center gap-2 w-full px-6">
                  Send Reset Link
                  <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </motion.button>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] pt-2">
            <Link href="/login" className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1">
              <ArrowLeft className="size-3.5" />
              Back to Staff Sign In
            </Link>
            <Link href="/portal/login" className="hover:text-[var(--text-primary)] transition-colors">
              Client Sign In
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
