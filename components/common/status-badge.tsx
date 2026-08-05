import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * Generic status badge driven by a status → {label, badge} meta map.
 * Every module (clients, projects, leads, requests…) can reuse this.
 */
export function StatusBadge({
  status,
  meta,
  className,
}: {
  status: string
  meta: Record<string, { label: string; badge: string }>
  className?: string
}) {
  const entry = meta[status]
  if (!entry) return null
  return (
    <Badge variant="outline" className={cn("px-2 py-0.5 text-[11px] font-medium", entry.badge, className)}>
      {entry.label}
    </Badge>
  )
}
