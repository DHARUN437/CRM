"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AuthLayout } from "@/components/ui/auth-layout"
import { Loader2, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ShieldAlert } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionValid, setSessionValid] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()

    // 1. Check existing session or listen for PASSWORD_RECOVERY event
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionValid(true)
      } else {
        // Give auth listener a moment to parse URL hash fragment
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: retrySession } }) => {
            setSessionValid(Boolean(retrySession))
          })
        }, 1000)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionValid(true)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword || !confirmPassword || loading) return

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        console.error("Password update error:", updateError)
        setError(updateError.message || "Failed to update password. Link may have expired.")
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      console.error("Password update exception:", err)
      setError(err.message || "An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (sessionValid === false) {
    return (
      <AuthLayout
        title="Link Expired or Invalid"
        subtitle="This password reset link is invalid or has expired."
      >
        <div className="flex flex-col gap-5 w-full mt-4 p-6 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md text-center">
          <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <ShieldAlert className="size-6" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-bold text-white">Expired Reset Token</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Password reset links expire after a short duration for security purposes. Please request a new link to reset your password.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
            <Link
              href="/forgot-password"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#7B6EFF] to-[#5D5FEF] text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all"
            >
              Request New Reset Link
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Set New Password"
      subtitle="Create a new password for your account."
    >
      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col gap-5 w-full mt-4 p-6 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md text-center"
        >
          <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="size-6" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-bold text-white">Password Updated</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
          </div>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#7B6EFF] to-[#5D5FEF] text-xs font-semibold text-white shadow-sm hover:brightness-110 transition-all"
            >
              Staff Sign In
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/portal/login"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Client Portal Sign In
            </Link>
          </div>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full mt-4">
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-500 transition-colors group-focus-within:text-[#7C6DFF] z-10" />
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder=" "
              className="peer h-14 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-11 text-sm text-white transition-all duration-300 hover:border-white/20 focus:border-[#7C6DFF]/50 focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-[#7C6DFF]/10 backdrop-blur-sm"
            />
            <label
              htmlFor="new-password"
              className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all duration-300 peer-focus:-translate-y-7 peer-focus:text-xs peer-focus:text-[#7C6DFF] peer-focus:font-medium peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-400 pointer-events-none"
            >
              New Password (min 6 chars)
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
            </button>
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-500 transition-colors group-focus-within:text-[#7C6DFF] z-10" />
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder=" "
              className="peer h-14 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-11 text-sm text-white transition-all duration-300 hover:border-white/20 focus:border-[#7C6DFF]/50 focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-[#7C6DFF]/10 backdrop-blur-sm"
            />
            <label
              htmlFor="confirm-password"
              className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all duration-300 peer-focus:-translate-y-7 peer-focus:text-xs peer-focus:text-[#7C6DFF] peer-focus:font-medium peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-400 pointer-events-none"
            >
              Confirm New Password
            </label>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 shadow-inner backdrop-blur-md"
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
              disabled={loading || !newPassword || !confirmPassword}
              className="relative group h-14 w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#7B6EFF] to-[#5D5FEF] font-semibold text-white shadow-[0_0_20px_rgba(123,110,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(123,110,255,0.6)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              {loading ? (
                <Loader2 className="size-5 animate-spin relative z-10" />
              ) : (
                <div className="relative flex items-center justify-center gap-2 w-full px-6">
                  Update Password
                  <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" />
                </div>
              )}
            </motion.button>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
