"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Invalid email or password. Please try again.")
      setLoading(false)
      return
    }

    // Trigger post-login animation sequence
    window.dispatchEvent(new Event("auth-success"))
    sessionStorage.setItem("auth-booted", "true")
    
    setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search)
      const nextTarget = searchParams.get("next")

      if (nextTarget) {
        router.push(nextTarget)
      } else if (user?.app_metadata?.role === "client") {
        router.push("/portal")
      } else {
        router.push("/dashboard")
      }
      router.refresh()
    }, 1500)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full mt-4">
      <div className="relative group">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-500 transition-colors group-focus-within:text-[#7C6DFF] z-10" />
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder=" "
          className="peer h-14 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white transition-all duration-300 hover:border-white/20 focus:border-[#7C6DFF]/50 focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-[#7C6DFF]/10 backdrop-blur-sm"
        />
        <label 
          htmlFor="email" 
          className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all duration-300 peer-focus:-translate-y-7 peer-focus:text-xs peer-focus:text-[#7C6DFF] peer-focus:font-medium peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-400 pointer-events-none"
        >
          Email Address
        </label>
      </div>

      <div className="relative group">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-slate-500 transition-colors group-focus-within:text-[#7C6DFF] z-10" />
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          placeholder=" "
          className="peer h-14 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-11 text-sm text-white transition-all duration-300 hover:border-white/20 focus:border-[#7C6DFF]/50 focus:bg-black/40 focus:outline-none focus:ring-4 focus:ring-[#7C6DFF]/10 backdrop-blur-sm"
        />
        <label 
          htmlFor="password" 
          className="absolute left-11 top-1/2 -translate-y-1/2 text-sm text-slate-500 transition-all duration-300 peer-focus:-translate-y-7 peer-focus:text-xs peer-focus:text-[#7C6DFF] peer-focus:font-medium peer-[:not(:placeholder-shown)]:-translate-y-7 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-slate-400 pointer-events-none"
        >
          Password
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

      <div className="flex items-center justify-between text-sm text-slate-400">
        <label className="flex items-center gap-2.5 cursor-pointer select-none group">
          <div className="relative flex items-center justify-center size-4">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="peer absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="size-4 rounded-[4px] border border-white/20 bg-black/20 transition-all peer-checked:bg-[#7C6DFF] peer-checked:border-[#7C6DFF] peer-hover:border-white/40 peer-focus-visible:ring-2 peer-focus-visible:ring-[#7C6DFF]/40" />
            <motion.svg
              initial={false}
              animate={{ opacity: rememberMe ? 1 : 0, scale: rememberMe ? 1 : 0.5 }}
              className="absolute size-3 text-white pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
          </div>
          <span className="group-hover:text-slate-300 transition-colors">Keep me signed in</span>
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

      <div className="flex justify-center w-full mt-4">
        <motion.button
          animate={{
            width: loading ? "56px" : "100%",
            borderRadius: loading ? "28px" : "12px",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          whileHover={!loading ? { scale: 1.01 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
          type="submit"
          disabled={loading}
          className="relative group h-14 overflow-hidden bg-gradient-to-r from-[#7B6EFF] to-[#5D5FEF] font-semibold text-white shadow-[0_0_20px_rgba(123,110,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(123,110,255,0.6)] disabled:opacity-90 disabled:cursor-wait flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              >
                <Loader2 className="size-5 animate-spin" />
              </motion.div>
            ) : (
              <motion.div
                key="default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative flex items-center justify-center gap-2 w-full px-6"
              >
                Sign In to Workspace
                <ArrowRight className="size-4.5 transition-transform group-hover:translate-x-1" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </form>
  )
}
