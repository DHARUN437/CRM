"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from "lucide-react"

export function PortalLoginForm() {
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
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Invalid email or password. Please try again.")
      setLoading(false)
      return
    }

    router.push("/portal")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
          Client Email Address
        </Label>
        <div className="relative flex items-center">
          <Mail className="absolute left-3.5 size-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11 border-white/10 bg-black/40 pl-10 pr-4 text-sm tracking-wide text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-black/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
            Password
          </Label>
        </div>
        <div className="relative flex items-center">
          <Lock className="absolute left-3.5 size-4 text-muted-foreground/60 transition-colors group-focus-within:text-primary" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-11 border-white/10 bg-black/40 pl-10 pr-10 text-sm tracking-wide text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-black/60 focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-muted-foreground/60 hover:text-foreground transition-colors p-1 rounded-md"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-3.5 rounded border-white/20 bg-black/40 text-primary accent-primary focus:ring-primary/20"
          />
          <span>Remember this device</span>
        </label>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive animate-fade-up">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="mt-2 h-11 w-full bg-primary font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary/90 hover:shadow-primary/40 active:scale-[0.99] disabled:opacity-70"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Accessing Client Portal...
          </>
        ) : (
          <span className="flex items-center justify-center gap-2">
            Enter Client Portal
            <ArrowRight className="size-4" />
          </span>
        )}
      </Button>
    </form>
  )
}

