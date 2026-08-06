"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { portalLinks, isActive } from "./portal-header"
import { PendingRequestsBadge } from "./pending-requests-badge"

interface MobileBottomNavProps {
  clientId: string | null
  pendingRequestCount: number
}

export function MobileBottomNav({ clientId, pendingRequestCount }: MobileBottomNavProps) {
  const pathname = usePathname()

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 sm:hidden px-4">
      <div className="mx-auto flex h-16 w-full max-w-sm items-center justify-between rounded-full border border-[#2A2A38] bg-[#17171F]/90 px-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        {portalLinks.map((link) => {
          const active = isActive(pathname, link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className="relative flex flex-col items-center justify-center gap-1 w-12 h-12"
            >
              {active && (
                <motion.div
                  layoutId="mobile-active-nav-pill"
                  className="absolute inset-0 rounded-full bg-primary/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className={cn("relative z-10", active ? "text-primary" : "text-muted-foreground")}>
                <link.icon className="size-5" />
                {link.href === "/portal/requests" && clientId && (
                  <PendingRequestsBadge
                    clientId={clientId}
                    initialCount={pendingRequestCount}
                    className="absolute -top-1 -right-2 border-background"
                  />
                )}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
