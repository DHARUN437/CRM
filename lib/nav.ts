import {
  LayoutDashboard,
  Users,
  Contact,
  FolderKanban,
  FileText,
  Receipt,
  UsersRound,
  MessageSquareText,
  Settings,
  Calendar,
  FileCheck,
  CheckSquare,
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
      { label: "Daily EOD", href: "/eod", icon: FileCheck },
      { label: "EOD Reports", href: "/eod-reports", icon: FileText },
      { label: "Monthly Tasks", href: "/monthly-tasks", icon: CheckSquare },
      { label: "Clients", href: "/clients", icon: Contact },
      { label: "Meetings", href: "/meetings", icon: Calendar },
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Invoices", href: "/invoices", icon: Receipt },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Team", href: "/team", icon: UsersRound },
      { label: "Audit Log", href: "/audit", icon: FileText },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
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
          { label: "My Projects", href: "/projects", icon: FolderKanban },
          { label: "Team Chat", href: "/chat", icon: MessageSquareText },
        ],
      },
      {
        title: "Operations",
        items: [
          { label: "Daily EOD", href: "/eod", icon: FileCheck },
          { label: "My Tasks", href: "/monthly-tasks", icon: CheckSquare },
          { label: "Documents", href: "/documents", icon: FileText },
        ],
      },
    ]
  }
  if (role === "tl") {
    return [
      {
        title: "Workspace",
        items: [
          { label: "My Projects", href: "/projects", icon: FolderKanban },
          { label: "Team Chat", href: "/chat", icon: MessageSquareText },
        ],
      },
      {
        title: "Operations",
        items: [
          { label: "Daily EOD", href: "/eod", icon: FileCheck },
          { label: "EOD Reports", href: "/eod-reports", icon: FileText },
          { label: "Monthly Tasks", href: "/monthly-tasks", icon: CheckSquare },
          { label: "Meetings", href: "/meetings", icon: Calendar },
          { label: "Documents", href: "/documents", icon: FileText },
        ],
      },
      {
        title: "Organization",
        items: [{ label: "Team", href: "/team", icon: UsersRound }],
      },
    ]
  }
  return navSections
}
