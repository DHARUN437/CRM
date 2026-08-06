"use client"

import { usePathname } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { CommandPalette } from "@/components/app/command-palette"
import { SidebarContent } from "@/components/app/sidebar"
import { Topbar } from "@/components/app/topbar"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { motion } from "framer-motion"
import { AppBackground } from "@/components/ui/app-background"

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/crm": "CRM Pipeline",
  "/projects": "Projects",
  "/documents": "Documents",
  "/team": "Team",
}

export function AppShell({
  children,
  role,
  userName,
  userEmail,
}: {
  children: React.ReactNode
  role: string | null
  userName: string | null
  userEmail: string
}) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isBooting, setIsBooting] = useState(false)

  const title = titles[pathname] ?? "JoyCRM"

  useEffect(() => {
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("auth-booted")) {
      setIsBooting(true)
      sessionStorage.removeItem("auth-booted")
    }

    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [])

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const openSidebar = useCallback(() => setMobileOpen(true), [])

  return (
    <div className="flex min-h-svh w-full bg-transparent">
      <AppBackground />
      {/* Desktop sidebar */}
      <motion.aside 
        initial={isBooting ? { x: -280, opacity: 0 } : false}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28, delay: isBooting ? 0.2 : 0 }}
        className="fixed inset-y-0 left-0 z-40 hidden w-[280px] border-r border-border/60 lg:block"
      >
        <SidebarContent role={role} userName={userName} userEmail={userEmail} />
      </motion.aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div onClick={() => setMobileOpen(false)} className="h-full">
            <SidebarContent role={role} userName={userName} userEmail={userEmail} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[280px]">
        <motion.div
          initial={isBooting ? { y: -100, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28, delay: isBooting ? 0.3 : 0 }}
        >
          <Topbar title={title} userName={userName ?? undefined} onOpenSearch={openSearch} onOpenSidebar={openSidebar} />
        </motion.div>
        
        <motion.main 
          initial={isBooting ? { opacity: 0, scale: 0.98, y: 20 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: isBooting ? 0.4 : 0 }}
          className="flex-1"
        >
          <div className="mx-auto w-full max-w-[1700px] px-4 py-8 lg:px-8 lg:py-10">
            {children}
          </div>
        </motion.main>
      </div>

      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
