import { Badge } from "@/components/ui/badge"
import {
  Check,
  CircleDashed,
  Hammer,
  PauseCircle,
  PenLine,
} from "lucide-react"
import {
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  type ProjectStatus,
} from "@/lib/portal-types"
import { cn } from "@/lib/utils"

const STATUS_ICONS: Record<ProjectStatus, typeof Check> = {
  kickoff: CircleDashed,
  in_progress: Hammer,
  in_review: PenLine,
  on_hold: PauseCircle,
  completed: Check,
}

export function ProjectStatusTimeline({ status }: { status: ProjectStatus }) {
  const currentIndex = Math.max(0, PROJECT_STATUS_ORDER.indexOf(status))
  const meta = PROJECT_STATUS_META[status] ?? PROJECT_STATUS_META.kickoff

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          Project status
        </span>
        <Badge className={meta.badge}>{meta.label}</Badge>
      </div>

      <ol className="flex items-center">
        {PROJECT_STATUS_ORDER.map((step, index) => {
          const Icon = STATUS_ICONS[step]
          const isDone = index < currentIndex
          const isCurrent = index === currentIndex
          const isLast = index === PROJECT_STATUS_ORDER.length - 1

          return (
            <li
              key={step}
              className={cn(
                "flex items-center",
                !isLast && "flex-1"
              )}
            >
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border transition-colors",
                    isDone &&
                      "border-success bg-success text-success-foreground",
                    isCurrent &&
                      cn(
                        "border-foreground text-foreground ring-4 ring-foreground/10",
                        meta.dot
                      ),
                    !isDone &&
                      !isCurrent &&
                      "border-foreground/15 bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-tight",
                    isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {PROJECT_STATUS_META[step].label}
                </span>
              </div>

              {!isLast && (
                <span
                  className={cn(
                    "mx-2 h-px flex-1",
                    index < currentIndex
                      ? "bg-success"
                      : "bg-foreground/10"
                  )}
                />
              )}
            </li>
          )
        })}
      </ol>

      <p className="text-sm text-muted-foreground">{meta.description}</p>
    </div>
  )
}
