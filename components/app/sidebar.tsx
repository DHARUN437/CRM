"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"
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
import { navSectionsFor } from "@/lib/nav"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

function WorkspaceSwitcher() {
  return (
    <div className="group flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2.5 transition-all hover:bg-[var(--surface)] hover:shadow-sm cursor-default shrink-0">
      <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)]/10 to-transparent p-0.5 shadow-sm ring-1 ring-[var(--accent)]/20">
        <Image
          src="/logo.png"
          alt="JoyCRM Logo"
          width={36}
          height={36}
          className="size-full rounded-[10px] object-cover bg-white"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold leading-tight tracking-wide text-[var(--text-primary)]">JoyCRM</p>
        <p className="truncate text-[11px] font-bold text-[var(--accent)] uppercase tracking-widest mt-0.5">Enterprise</p>
      </div>
      <ChevronsUpDown className="size-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors" />
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
        "group relative flex items-center gap-4 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
        active
          ? "text-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        soon && "cursor-default opacity-55 hover:text-[var(--text-muted)]",
      )}
    >
      {active && (
        <>
          <motion.div
            layoutId="sidebar-active-bg"
            className="absolute inset-0 rounded-2xl bg-[var(--accent-tint)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-[var(--accent)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </>
      )}
      {!active && !soon && (
        <div className="absolute inset-0 rounded-2xl bg-transparent transition-colors duration-200 group-hover:bg-[var(--background)]" />
      )}
      
      <div className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-full transition-all duration-200", active ? "bg-[var(--accent-tint)]" : "bg-transparent group-hover:bg-[var(--background)]")}>
        <Icon className={cn("relative z-10 size-[22px] transition-transform duration-200 group-hover:scale-105", active ? "text-[var(--accent)]" : "text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]")} />
      </div>
      
      <span className="relative z-10 truncate tracking-wide capitalize">{label}</span>
      {badge && !soon && (
        <Badge className="relative z-10 ml-auto h-5 min-w-5 justify-center px-1.5 shadow-sm font-bold bg-[var(--accent)] text-white">{badge}</Badge>
      )}
      {soon && (
        <span className="ml-auto text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
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
    <div className="flex h-full min-h-0 flex-col justify-between gap-4 bg-[var(--surface)] border-r border-[var(--border)] p-5 shadow-sm">
      <WorkspaceSwitcher />

      <div className="-mx-1 flex-1 min-h-0 overflow-y-auto px-1 custom-scrollbar">
        <nav className="flex flex-col gap-5 py-2">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
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
      </div>

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
    <div className="shrink-0 pt-2 border-t border-[var(--border)]/40">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--background)]">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs font-semibold text-white bg-[var(--accent)]">
              {displayName
                .split(" ")
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight text-[var(--text-primary)]">{displayName}</p>
            <p className="truncate text-xs text-[var(--text-secondary)]">
              {role === "worker" ? "Worker" : role === "tl" ? "Team Lead" : role === "team" ? "Agency Admin" : "User"}
            </p>
          </div>
          <ChevronsUpDown className="size-4 shrink-0 text-[var(--text-muted)]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <p className="text-sm font-medium text-[var(--text-primary)]">{displayName}</p>
              <p className="text-xs font-normal text-[var(--text-secondary)]">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer text-xs">
              <Settings className="size-4 mr-2 text-[var(--accent)]" />
              Account Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-[var(--border)]" />
          <DropdownMenuItem variant="destructive" onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
