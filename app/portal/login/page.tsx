import Image from "next/image"
import { PortalLoginForm } from "@/components/portal/login-form"
import { ShieldCheck, Sparkles, Building2, Layers, CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function PortalLoginPage() {
  return (
    <div className="relative flex min-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden font-sans antialiased">
      {/* Dynamic Background Glows & Grid Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
      <div className="absolute -top-40 -left-40 size-96 rounded-full bg-purple-600/25 blur-3xl animate-pulse-glow pointer-events-none" />
      <div className="absolute top-1/2 -right-40 size-[500px] rounded-full bg-primary/20 blur-3xl animate-pulse-glow pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 size-80 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex w-full flex-col lg:flex-row min-h-screen">
        {/* Left Side: Brand & Platform Showcase */}
        <div className="relative hidden lg:flex flex-1 flex-col justify-between p-12 lg:p-16 bg-slate-900/30 border-r border-white/10 backdrop-blur-md">
          {/* Header Brand Badge */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-purple-500 to-primary p-0.5 shadow-lg shadow-purple-500/20">
              <Image
                src="/logo.png"
                alt="JoyCRM Logo"
                width={48}
                height={48}
                className="size-full rounded-[14px] object-cover bg-black"
              />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Joy Corporate Solutions
              </span>
              <p className="text-xs text-slate-400 font-medium tracking-wide">Client Portal Workspace</p>
            </div>
          </div>

          {/* Center Hero Copy & Highlights */}
          <div className="my-auto max-w-lg space-y-8 animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-semibold text-purple-300 backdrop-blur-md shadow-sm">
              <Sparkles className="size-3.5 text-purple-400" />
              <span>Dedicated Client Hub</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Track Your Projects & Deliverables{" "}
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-primary bg-clip-text text-transparent">
                In Real-Time.
              </span>
            </h1>

            <p className="text-base text-slate-300 leading-relaxed font-normal">
              Welcome to your dedicated portal. Stay informed with live project milestones, review shared documents, communicate with your project team, and manage invoices securely.
            </p>

            <div className="space-y-3.5 pt-2">
              {[
                "Live project milestones, progress tracking & timelines",
                "Direct access to your assigned agency account team",
                "Secure document repository & digital invoice access",
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-slate-200">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-300">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Security Badge */}
          <div className="flex items-center gap-6 pt-6 border-t border-white/10 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>Encrypted Client Channel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Building2 className="size-4 text-purple-400" />
              <span>Joy Corporate Solutions Verified</span>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Panel */}
        <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 lg:px-16">
          <div className="w-full max-w-md space-y-6">

            {/* Mobile Logo Display */}
            <div className="lg:hidden flex flex-col items-center text-center gap-2 mb-6">
              <Image
                src="/logo.png"
                alt="JoyCRM Logo"
                width={56}
                height={56}
                className="size-14 rounded-2xl object-cover shadow-lg ring-1 ring-white/20"
              />
              <h2 className="text-xl font-bold tracking-tight text-white">Joy Corporate Solutions</h2>
              <p className="text-xs text-slate-400">Client Portal Access</p>
            </div>

            {/* Tab Navigation between Agency Staff and Client Portal */}
            <div className="flex rounded-xl bg-slate-900/80 p-1 border border-white/10 shadow-inner">
              <Link
                href="/login"
                className="flex-1 rounded-lg text-slate-400 hover:text-slate-200 py-2 text-center text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Layers className="size-3.5" />
                <span>Agency Staff</span>
              </Link>
              <div className="flex-1 rounded-lg bg-primary text-primary-foreground py-2 text-center text-xs font-semibold shadow-md flex items-center justify-center gap-1.5">
                <Building2 className="size-3.5" />
                <span>Client Portal</span>
              </div>
            </div>

            {/* Glassmorphism Card Wrapper */}
            <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5 space-y-6">
              <div className="space-y-1 text-left">
                <h3 className="text-xl font-bold text-white tracking-tight">Client Sign In</h3>
                <p className="text-xs text-slate-400">
                  Access your client portal, view project updates, and share documents.
                </p>
              </div>

              <PortalLoginForm />
            </div>

            {/* Switch link footer */}
            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-primary transition-colors group font-medium"
              >
                <span>Agency employee? Switch to staff sign-in</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

