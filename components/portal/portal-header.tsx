"use client"

import { Button } from "@/components/ui/button"
import { LayoutGrid, FolderKanban, Files, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const links = [
  { label: "Overview", href: "/portal", icon: LayoutGrid },
  { label: "Projects", href: "/portal/projects", icon: FolderKanban },
  { label: "Documents", href: "/portal/documents", icon: Files },
]

export function PortalHeader() {
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
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/portal" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
              <span className="text-sm font-bold">A</span>
            </span>
            <span className="text-sm font-semibold tracking-tight">
              AgencyOS <span className="text-muted-foreground">Client Portal</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((link) => {
              const active =
                link.href === "/portal"
                  ? pathname === "/portal"
                  : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
                    active && "bg-foreground/5 text-foreground"
                  )}
                >
                  <link.icon className="size-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="flex items-center gap-2"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </header>
  )
}
