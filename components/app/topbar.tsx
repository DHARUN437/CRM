"use client"

import { createClient } from "@/lib/supabase/client"
import { PanelLeft, Search, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"
import { NotificationsBell } from "@/components/app/notifications-bell"

export function Topbar({
  title,
  userName,
  onOpenSearch,
  onOpenSidebar,
}: {
  title: string
  userName?: string
  onOpenSearch: () => void
  onOpenSidebar: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [menuOpen])

  async function signOut() {
    if (signingOut) return
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    window.location.href = "/login"
  }

  const initials = userName
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") ?? "?"

  return (
    <header className="sticky top-4 z-30 mx-4 lg:mx-8 mt-4 flex h-[64px] items-center gap-4 rounded-[20px] border border-[var(--border)] bg-[var(--surface)] px-6 shadow-sm transition-all">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden text-[var(--text-primary)] hover:bg-[var(--background)]"
        aria-label="Open navigation"
        onClick={onOpenSidebar}
      >
        <PanelLeft className="size-5 text-[var(--text-secondary)]" />
      </Button>

      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] lg:text-xl capitalize">{title}</h1>
        <div className="hidden h-4 w-px bg-[var(--border)] md:block" />
        <p className="hidden text-xs font-medium text-[var(--text-secondary)] md:block">
          <span className="relative mr-1.5 inline-block size-2 rounded-full bg-[var(--success)]">
            <span className="absolute inset-0 animate-ping rounded-full bg-[var(--success)] opacity-75"></span>
          </span>
          Last synced 2 minutes ago
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="group hidden h-9 w-64 items-center gap-3 rounded-[14px] border border-[var(--border)] bg-[var(--background)] px-3.5 text-[13px] font-medium text-[var(--text-muted)] transition-all hover:bg-[var(--surface)] hover:border-[var(--accent)] md:flex xl:w-72"
        >
          <Search className="size-4 group-hover:text-[var(--accent)] transition-colors text-[var(--text-muted)]" />
          <span>Quick search...</span>
          <kbd className="ml-auto flex h-5 items-center justify-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 font-mono text-[10px] font-bold text-[var(--text-secondary)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition-all">
            ⌘K
          </kbd>
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden text-[var(--text-secondary)] hover:bg-[var(--background)]"
          aria-label="Search"
          onClick={onOpenSearch}
        >
          <Search className="size-5" />
        </Button>

        <NotificationsBell />

        <div ref={menuRef} className="relative ml-1">
          <button
            type="button"
            aria-label="Account"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex size-10 items-center justify-center rounded-full bg-[var(--accent-tint)] border border-[var(--accent)]/20 text-sm font-bold text-[var(--accent)] transition-all hover:scale-105"
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-layered backdrop-blur-xl">
              <p className="px-3 py-2 text-sm font-semibold text-[var(--text-primary)]">{userName ?? "User"}</p>
              <div className="my-1.5 h-px bg-[var(--border)]" />
              <button
                type="button"
                onClick={() => { setMenuOpen(false); signOut() }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-[#FEE2E2]"
              >
                <LogOut className="size-4.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
