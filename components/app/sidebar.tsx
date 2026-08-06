"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { ChevronsUpDown, Command, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { navSectionsFor } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

function WorkspaceSwitcher() {
  return (
    <div className="group flex w-full items-center gap-3 rounded-2xl border border-[#2A2A38] bg-[#17171F] p-2.5 transition-all hover:bg-[#1E1E28] hover:shadow-layered cursor-default">
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-transparent p-0.5 shadow-sm ring-1 ring-primary/20 group-hover:shadow-[0_0_15px_rgba(79,124,255,0.15)] transition-shadow">
        <Image
          src="/logo.png"
          alt="JoyCRM Logo"
          width={36}
          height={36}
          className="size-full rounded-[10px] object-cover bg-white"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold leading-tight tracking-wide text-foreground/90">JoyCRM</p>
        <p className="truncate text-[11px] font-bold text-primary/80 uppercase tracking-widest mt-0.5">Enterprise</p>
      </div>
      <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
    </div>
  )
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge,
  soon,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  badge?: string
  soon?: boolean
}) {
  return (
    <Link
      href={soon ? "#" : href}
      aria-disabled={soon}
      onClick={(e) => soon && e.preventDefault()}
      className={cn(
        "group relative flex items-center gap-4 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-300",
        active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground",
        soon && "cursor-default opacity-55 hover:text-muted-foreground",
      )}
    >
      {active && (
        <>
          <motion.div
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent shadow-[inset_0_0_20px_rgba(79,124,255,0.05)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-primary shadow-[0_0_12px_rgba(79,124,255,0.8)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </>
      )}
      {!active && !soon && (
        <div className="absolute inset-0 rounded-2xl bg-transparent transition-colors duration-300 group-hover:bg-muted/40" />
      )}
      
      <div className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-300", active ? "bg-[rgba(99,102,241,0.15)] shadow-[0_4px_12px_rgba(79,124,255,0.15)] ring-1 ring-[#818CF8]/30" : "bg-transparent group-hover:bg-[#1E1E28]/80")}>
        <Icon className={cn("relative z-10 size-[22px] transition-transform duration-300 group-hover:scale-110", active ? "text-primary dark:text-[#818CF8]" : "text-muted-foreground dark:text-[#9797A8] group-hover:text-foreground/80 dark:group-hover:text-[#F4F4F6]")} />
      </div>
      
      <span className="relative z-10 truncate tracking-wide">{label}</span>
      {badge && !soon && (
        <Badge className="relative z-10 ml-auto h-5 min-w-5 justify-center px-1.5 shadow-sm font-bold">{badge}</Badge>
      )}
      {soon && (
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
          Soon
        </span>
      )}
    </Link>
  )
}

export function SidebarContent({
  role,
  userName,
  userEmail,
}: {
  role: string | null
  userName: string | null
  userEmail: string
}) {
  const pathname = usePathname()
  const sections = navSectionsFor(role)

  return (
    <div className="flex h-full flex-col gap-6 bg-[#12121A] border-r border-[#2A2A38] backdrop-blur-[24px] p-6 shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
      <WorkspaceSwitcher />

      <ScrollArea className="-mx-1 flex-1 px-1">
        <nav className="flex flex-col gap-6 pb-4">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 dark:text-[#9797A8]">
                {section.title}
              </p>
              {section.items.map((item) => (
                <NavLink
                  key={item.label}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  badge={item.badge}
                  soon={item.soon}
                  active={pathname === item.href}
                />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <ProfileMenu name={userName} email={userEmail} role={role} />
    </div>
  )
}

function ProfileMenu({
  name,
  email,
  role,
}: {
  name: string | null
  email: string
  role: string | null
}) {
  const router = useRouter()
  const displayName = name ?? email.split("@")[0] ?? "User"

  async function signOut() {
    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl border border-border/60 dark:border-[#2A2A38] bg-card/40 dark:bg-[#17171F] px-2.5 py-2 text-left transition-colors hover:bg-card/80 dark:hover:bg-[#1E1E28]">
        <Avatar className="size-8">
          <AvatarFallback style={{ background: "oklch(0.62 0.2 274)" }} className="text-xs font-semibold text-white">
            {displayName
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {role === "worker" ? "Worker" : role === "tl" ? "Team Lead" : role === "team" ? "Agency Admin" : "User"}
          </p>
        </div>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <p className="text-sm font-medium">{displayName}</p>
            <p className="text-xs font-normal text-muted-foreground">{email}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={signOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
