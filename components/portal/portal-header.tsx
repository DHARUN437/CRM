"use client"

import { Button } from "@/components/ui/button"
import { LayoutGrid, FolderKanban, Files, Receipt, FileQuestion, LogOut, Search, Bell } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { PendingRequestsBadge } from "@/components/portal/pending-requests-badge"

export const portalLinks = [
  { label: "Overview", href: "/portal", icon: LayoutGrid },
  { label: "Projects", href: "/portal/projects", icon: FolderKanban },
  { label: "Requests", href: "/portal/requests", icon: FileQuestion },
  { label: "Documents", href: "/portal/documents", icon: Files },
  { label: "Invoices", href: "/portal/invoices", icon: Receipt },
]

export function isActive(pathname: string, href: string) {
  return href === "/portal" ? pathname === "/portal" : pathname.startsWith(href)
}

interface PortalHeaderProps {
  clientId: string | null
  pendingRequestCount: number
}

export function PortalHeader({ clientId, pendingRequestCount }: PortalHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/portal/login")
    router.refresh()
  }

  return (
    <>
      {/* Desktop Floating Navigation */}
      <header className="hidden sm:flex sticky top-4 z-50 mx-auto w-full max-w-[1700px] px-8 mt-4">
        <div className="flex h-[64px] w-full items-center justify-between gap-4 rounded-[20px] border border-white/50 dark:border-[#2A2A38] bg-white/72 dark:bg-[#17171F]/90 px-6 backdrop-blur-[24px] shadow-layered transition-all">
          <div className="flex items-center gap-8">
            <Link href="/portal" className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="JoyCRM Logo"
                width={36}
                height={36}
                className="size-9 rounded-xl object-cover shadow-sm"
              />
              <span className="text-base font-bold tracking-tight text-foreground">
                JoyCRM <span className="text-muted-foreground font-medium">Enterprise</span>
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              {portalLinks.map((link) => {
                const active = isActive(pathname, link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors"
                  >
                    {active && (
                      <motion.div
                        layoutId="active-nav-pill"
                        className="absolute inset-0 rounded-full bg-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={cn("relative z-10 flex items-center gap-2", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                      <link.icon className="size-4" />
                      {link.label}
                      {link.href === "/portal/requests" && clientId && (
                        <PendingRequestsBadge
                          clientId={clientId}
                          initialCount={pendingRequestCount}
                        />
                      )}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
              <Search className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
              <Bell className="size-5" />
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Compact Header */}
      <header className="sm:hidden sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/10 bg-white/60 px-4 backdrop-blur-xl">
        <Link href="/portal" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="JoyCRM Logo"
            width={32}
            height={32}
            className="size-8 rounded-lg object-cover shadow-sm"
          />
          <span className="text-sm font-bold tracking-tight text-foreground">JoyCRM</span>
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Search className="size-5" />
          </Button>
          <Button variant="ghost" size="icon" className="relative text-muted-foreground">
            <Bell className="size-5" />
            {pendingRequestCount > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={signOut}>
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>
    </>
  )
}
