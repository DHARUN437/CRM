"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { ShieldCheck, Server, Lock, Briefcase, FileSpreadsheet, Users, Activity, MessageSquare } from "lucide-react"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { AuthBackground } from "./auth-background"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle: string
}

const features = [
  { icon: Briefcase, label: "Projects", color: "text-[var(--accent)]", bg: "bg-[var(--accent-tint)]" },
  { icon: Users, label: "CRM", color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10" },
  { icon: FileSpreadsheet, label: "Finance", color: "text-[var(--success)]", bg: "bg-[var(--success)]/10" },
  { icon: Activity, label: "Analytics", color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10" },
  { icon: MessageSquare, label: "Portal", color: "text-[#DB2777]", bg: "bg-[#DB2777]/10" },
]

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const pathname = usePathname()
  const isPortal = pathname === "/portal/login"
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    const handleAuthSuccess = () => setIsAuthenticating(true)
    window.addEventListener("auth-success", handleAuthSuccess)
    return () => window.removeEventListener("auth-success", handleAuthSuccess)
  }, [])

  // Entrance animation variants
  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const slideUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  }

  return (
    <div className="relative flex min-h-screen w-full bg-[var(--background)] text-[var(--text-primary)] overflow-hidden font-sans antialiased selection:bg-[var(--accent)]/20">
      <AuthBackground />

      <motion.div
        animate={{ filter: isAuthenticating ? "blur(20px)" : "blur(0px)", opacity: isAuthenticating ? 0.4 : 1 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="relative z-10 mx-auto flex w-full max-w-[1700px] flex-col lg:flex-row min-h-screen"
      >

        {/* Left Side: Alive Hero Showcase */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative hidden lg:flex flex-1 flex-col justify-between p-16 xl:p-24 bg-gradient-to-r from-[var(--accent-tint)]/60 via-transparent to-transparent"
        >
          {/* Header Brand Badge */}
          <motion.div
            variants={slideUp}
            animate={isAuthenticating ? { scale: 1.1, opacity: 0.8 } : undefined}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="flex items-center gap-4"
          >
            <div className="relative flex items-center justify-center size-14 rounded-2xl bg-gradient-to-b from-white to-[var(--bg-card-hover)] p-0.5 shadow-[0_8px_30px_rgba(31,45,90,0.12)] ring-1 ring-[var(--border)]">
              <Image
                src="/logo.png"
                alt="JoyCRM Logo"
                width={56}
                height={56}
                className="size-full rounded-[14px] object-cover bg-[var(--surface)]"
              />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                JOY CORPORATE
              </span>
              <p className="text-xs text-[var(--accent)] font-semibold tracking-widest uppercase mt-0.5">Enterprise Suite</p>
            </div>
          </motion.div>

          {/* Center Hero Copy & Animated Ecosystem */}
          <div className="my-auto max-w-2xl space-y-10">
            <motion.div variants={slideUp} className="inline-flex items-center gap-3 rounded-full border border-[var(--border)] bg-white/70 px-4 py-1.5 text-xs font-semibold text-[var(--text-secondary)] backdrop-blur-md shadow-sm">
              <div className="size-2 rounded-full bg-[var(--success)] animate-pulse shadow-[0_0_10px_rgba(22,163,74,0.5)]" />
              <span>Trusted by 120+ Businesses</span>
              <div className="w-px h-3 bg-[var(--border)] mx-1" />
              <span>99.98% Uptime</span>
            </motion.div>

            <motion.h1 variants={slideUp} className="text-5xl xl:text-6xl font-extrabold tracking-tight text-[var(--text-primary)] leading-[1.1]">
              Enterprise Operating Platform <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-[#4B9DFF]">For Modern Agencies</span>
            </motion.h1>

            {/* Floating Glass Cards / Badges representing the ecosystem */}
            <motion.div variants={slideUp} className="flex flex-wrap gap-3 pt-2">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -5, scale: 1.05 }}
                  className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white/70 px-4 py-2.5 backdrop-blur-md shadow-sm"
                >
                  <div className={`flex size-6 items-center justify-center rounded-md ${feature.bg} ${feature.color}`}>
                    <feature.icon className="size-3.5" />
                  </div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{feature.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Footer Security Badges */}
          <motion.div variants={slideUp} className="flex items-center gap-8 pt-8 border-t border-[var(--border)] text-sm font-medium text-[var(--text-muted)]">
            <div className="flex items-center gap-2.5 group cursor-default">
              <Server className="size-4.5 group-hover:text-[var(--accent)] transition-colors" />
              <span className="group-hover:text-[var(--text-primary)] transition-colors">SOC2 Type II</span>
            </div>
            <div className="flex items-center gap-2.5 group cursor-default">
              <ShieldCheck className="size-4.5 group-hover:text-[var(--success)] transition-colors" />
              <span className="group-hover:text-[var(--text-primary)] transition-colors">ISO 27001 Security</span>
            </div>
            <div className="flex items-center gap-2.5 group cursor-default">
              <Lock className="size-4.5 group-hover:text-[var(--accent)] transition-colors" />
              <span className="group-hover:text-[var(--text-primary)] transition-colors">AES-256 Encryption</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Right Side: Authentication Panel */}
        <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 lg:px-24 relative">

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 24 }}
            className="w-full max-w-[620px] space-y-8 relative z-10"
          >
            {/* Mobile Logo Display */}
            <div className="lg:hidden flex flex-col items-center text-center gap-2 mb-8">
              <div className="relative flex items-center justify-center size-14 rounded-2xl bg-gradient-to-b from-white to-[var(--bg-card-hover)] p-0.5 shadow-[0_8px_30px_rgba(31,45,90,0.12)] ring-1 ring-[var(--border)]">
                <Image
                  src="/logo.png"
                  alt="JoyCRM Logo"
                  width={56}
                  height={56}
                  className="size-full rounded-[14px] object-cover bg-[var(--surface)]"
                />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] mt-2">JOY CORPORATE</h2>
              <p className="text-xs text-[var(--accent)] font-semibold tracking-widest uppercase">Enterprise Suite</p>
            </div>

            {/* Segmented Control */}
            <div className="relative flex rounded-xl bg-[var(--muted)] p-1.5 border border-[var(--border)] shadow-inner max-w-sm mx-auto mb-6">
              <Link
                href="/login"
                className={`relative flex-1 py-3 text-center text-sm font-semibold transition-colors z-10 ${!isPortal ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
              >
                Agency Staff
              </Link>
              <Link
                href="/portal/login"
                className={`relative flex-1 py-3 text-center text-sm font-semibold transition-colors z-10 ${isPortal ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
              >
                Client Portal
              </Link>

              <motion.div
                className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-lg bg-white border border-[var(--border)] shadow-[0_4px_12px_rgba(31,45,90,0.12)] backdrop-blur-md"
                animate={{
                  left: isPortal ? "calc(50% + 3px)" : "6px"
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }}
              />
            </div>

            {/* Premium Glassmorphism Card */}
            <div className="relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-white/80 p-1 shadow-[0_8px_40px_rgba(31,45,90,0.12)] backdrop-blur-2xl ring-1 ring-black/5">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />

              <div className="rounded-[28px] bg-[var(--surface)]/90 p-10 sm:p-12">
                <div className="space-y-2 mb-10 text-center">
                  <h3 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{title}</h3>
                  <p className="text-base text-[var(--text-secondary)] font-medium">
                    {subtitle}
                  </p>
                </div>

                <div className="relative z-10">
                  {children}
                </div>
              </div>
            </div>

            {/* Minimal Footer Nav */}
            <div className="flex flex-col items-center justify-center gap-2 pt-4 text-xs font-medium text-[var(--text-muted)]">
              <div className="text-[11px] text-[var(--accent)] font-mono font-bold bg-[var(--accent-tint)] px-3 py-1 rounded-full border border-[var(--accent)]/20">
                v1.0.4-live-build-test
              </div>
              <div className="flex items-center gap-6">
                <button className="hover:text-[var(--text-secondary)] transition-colors">Privacy</button>
                <button className="hover:text-[var(--text-secondary)] transition-colors">Terms</button>
                <button className="hover:text-[var(--text-secondary)] transition-colors">Support</button>
              </div>
            </div>

          </motion.div>
        </div>
      </motion.div>

      {/* Global Authenticating Overlay */}
      <AnimatePresence>
        {isAuthenticating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-md"
          >
            <div className="flex flex-col items-center gap-6">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                className="size-16 rounded-full border-4 border-[var(--border)] border-t-[var(--accent)] shadow-[0_0_30px_rgba(47,111,237,0.4)]"
              />
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-sm font-semibold tracking-widest text-[var(--accent)] uppercase"
              >
                Booting Workspace...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
