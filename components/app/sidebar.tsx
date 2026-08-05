"use client"

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
    <div className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2.5">
      <Image
        src="/logo.png"
        alt="JoyCRM Logo"
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-lg object-cover shadow-sm"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">JoyCRM</p>
        <p className="truncate text-xs text-muted-foreground">Joy Corporate Solutions</p>
      </div>
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
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
        soon && "cursor-default opacity-55 hover:bg-transparent hover:text-muted-foreground",
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
      <Icon className="size-4.5 shrink-0" />
      <span className="truncate">{label}</span>
      {badge && !soon && (
        <Badge className="ml-auto h-5 min-w-5 justify-center px-1.5">{badge}</Badge>
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
    <div className="flex h-full flex-col gap-4 bg-sidebar p-4">
      <WorkspaceSwitcher />

      <ScrollArea className="-mx-1 flex-1 px-1">
        <nav className="flex flex-col gap-6 pb-4">
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-2.5 py-2 text-left transition-colors hover:bg-card/80">
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
