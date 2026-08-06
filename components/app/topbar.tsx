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
    <header className="sticky top-4 z-30 mx-4 lg:mx-8 mt-4 flex h-[64px] items-center gap-4 rounded-[20px] border border-[#2A2A38] bg-[#17171F]/90 px-6 backdrop-blur-[24px] shadow-layered transition-all">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onOpenSidebar}
      >
        <PanelLeft className="size-5" />
      </Button>

      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight text-[#F4F4F6] lg:text-xl">{title}</h1>
        <div className="hidden h-4 w-px bg-[#2A2A38] md:block" />
        <p className="hidden text-xs font-medium text-[#9797A8] md:block">
          <span className="relative mr-1.5 inline-block size-2 rounded-full bg-success">
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-75"></span>
          </span>
          Last synced 2 minutes ago
        </p>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="group hidden h-9 w-64 items-center gap-3 rounded-[14px] border border-[#2A2A38] bg-[#1E1E28] px-3.5 text-[13px] font-medium text-[#9797A8] transition-all hover:bg-[#252533] hover:border-primary/20 md:flex xl:w-72"
        >
          <Search className="size-4 group-hover:text-primary dark:group-hover:text-[#818CF8] transition-colors" />
          <span>Quick Search...</span>
          <kbd className="ml-auto flex h-5 items-center justify-center gap-0.5 rounded-md border border-border/50 dark:border-[#2A2A38] bg-muted/30 dark:bg-[#17171F] px-1.5 font-mono text-[10px] font-bold text-muted-foreground dark:text-[#9797A8] group-hover:border-primary/20 group-hover:text-primary dark:group-hover:text-[#818CF8] group-hover:shadow-[0_0_8px_rgba(79,124,255,0.2)] transition-all">
            ⌘K
          </kbd>
        </button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
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
            className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 text-sm font-bold text-primary transition-all hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-[20px] border border-border/60 bg-popover/90 p-1.5 shadow-layered backdrop-blur-xl">
              <p className="px-3 py-2 text-sm font-semibold">{userName ?? "User"}</p>
              <div className="my-1.5 h-px bg-border/50" />
              <button
                type="button"
                onClick={() => { setMenuOpen(false); signOut() }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
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
