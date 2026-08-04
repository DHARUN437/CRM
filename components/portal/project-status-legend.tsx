import {
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
} from "@/lib/portal-types"
import { cn } from "@/lib/utils"

export function ProjectStatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {PROJECT_STATUS_ORDER.map((status) => {
        const meta = PROJECT_STATUS_META[status]
        return (
          <div
            key={status}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <span className={cn("size-2 rounded-full", meta.dot)} />
            {meta.label}
          </div>
        )
      })}
    </div>
  )
}
