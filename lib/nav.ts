import {
  LayoutDashboard,
  Users,
  Contact,
  FolderKanban,
  FileText,
  Receipt,
  UsersRound,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  soon?: boolean
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navSections: NavSection[] = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "CRM", href: "/crm", icon: Users },
      { label: "Projects", href: "/projects", icon: FolderKanban },
      { label: "Team Chat", href: "/chat", icon: MessageSquareText },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Clients", href: "/clients", icon: Contact },
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Invoices", href: "/invoices", icon: Receipt },
    ],
  },
  {
    title: "Organization",
    items: [{ label: "Team", href: "/team", icon: UsersRound }],
  },
]

/**
 * Role-aware navigation: workers only see their own work surface.
 */
export function navSectionsFor(role: string | null): NavSection[] {
  if (role === "worker") {
    return [
      {
        title: "Workspace",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "My Projects", href: "/projects", icon: FolderKanban },
          { label: "Team Chat", href: "/chat", icon: MessageSquareText },
        ],
      },
      {
        title: "Operations",
        items: [{ label: "Documents", href: "/documents", icon: FileText }],
      },
    ]
  }
  if (role === "tl") {
    return [
      {
        title: "Workspace",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { label: "My Projects", href: "/projects", icon: FolderKanban },
          { label: "Team Chat", href: "/chat", icon: MessageSquareText },
        ],
      },
      {
        title: "Operations",
        items: [{ label: "Documents", href: "/documents", icon: FileText }],
      },
      {
        title: "Organization",
        items: [{ label: "Team", href: "/team", icon: UsersRound }],
      },
    ]
  }
  return navSections
}
