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
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/portal/login")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur">
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
                  isActive(pathname, link.href) && "bg-foreground/5 text-foreground"
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
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-foreground/10 sm:hidden">
          <nav className="mx-auto max-w-6xl px-4 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
                  isActive(pathname, link.href) && "bg-foreground/5 text-foreground"
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
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="mt-1 flex w-full items-center justify-start gap-2"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
