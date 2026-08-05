"use client"

import { Button } from "@/components/ui/button"
import { LayoutGrid, FolderKanban, Files, Receipt, FileQuestion, LogOut, Menu, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { PendingRequestsBadge } from "@/components/portal/pending-requests-badge"

const links = [
  { label: "Overview", href: "/portal", icon: LayoutGrid },
  { label: "Projects", href: "/portal/projects", icon: FolderKanban },
  { label: "Requests", href: "/portal/requests", icon: FileQuestion },
  { label: "Documents", href: "/portal/documents", icon: Files },
  { label: "Invoices", href: "/portal/invoices", icon: Receipt },
]

function isActive(pathname: string, href: string) {
  return href === "/portal" ? pathname === "/portal" : pathname.startsWith(href)
}

interface PortalHeaderProps {
  clientId: string | null
  pendingRequestCount: number
}

export function PortalHeader({ clientId, pendingRequestCount }: PortalHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function signOut() {
    setMenuOpen(false)
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/portal/login")
    router.refresh()
  }

  function handleNavigate(href: string) {
    setMenuOpen(false)
    router.push(href)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-foreground/10 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/portal" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="JoyCRM Logo"
              width={32}
              height={32}
              className="size-8 rounded-full object-cover"
            />
            <span className="text-sm font-semibold tracking-tight">
              JoyCRM <span className="text-muted-foreground">Client Portal</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
                  isActive(pathname, link.href) && "bg-foreground/5 text-foreground font-medium"
                )}
              >
                <link.icon className="size-4" />
                {link.label}
                {link.href === "/portal/requests" && clientId && (
                  <PendingRequestsBadge
                    clientId={clientId}
                    initialCount={pendingRequestCount}
                  />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="hidden items-center gap-2 sm:flex"
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="sm:hidden"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-x-0 top-14 z-50 border-b border-foreground/10 bg-background/95 p-4 shadow-2xl backdrop-blur-xl sm:hidden animate-in fade-in-0 slide-in-from-top-2">
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const active = isActive(pathname, link.href)
              return (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => handleNavigate(link.href)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors touch-target",
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="size-5 shrink-0" />
                    <span>{link.label}</span>
                  </div>
                  {link.href === "/portal/requests" && clientId && (
                    <PendingRequestsBadge
                      clientId={clientId}
                      initialCount={pendingRequestCount}
                    />
                  )}
                </button>
              )
            })}
            <div className="mt-2 border-t border-foreground/10 pt-2">
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10 touch-target"
              >
                <LogOut className="size-5 shrink-0" />
                <span>Sign out</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
