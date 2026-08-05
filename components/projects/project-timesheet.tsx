import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, UserRound } from "lucide-react"
import { formatDate, type TimeEntry } from "@/lib/portal-types"

export function ProjectTimesheet({ entries }: { entries: TimeEntry[] }) {
  const totalHours = entries.reduce((acc, e) => acc + e.hours, 0)

  if (!entries.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
          <Clock className="size-8 text-muted-foreground/50" />
          No time logged yet — developers can log hours using the &quot;Log Hours&quot; button.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="size-4" />
          Project Timesheet
        </CardTitle>
        <span className="text-xs font-semibold rounded-full bg-primary/10 text-primary px-2.5 py-1">
          Total: {totalHours.toFixed(1)} hrs
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-foreground/10 p-3 text-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground">
                <UserRound className="size-4" />
              </span>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{entry.user_name}</span>
                  {entry.task_title && (
                    <span className="text-xs text-muted-foreground truncate">
                      · {entry.task_title}
                    </span>
                  )}
                </div>
                {entry.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {entry.description}
                  </p>
                )}
                <span className="text-[11px] text-muted-foreground/70">
                  {formatDate(entry.logged_at)}
                </span>
              </div>
            </div>

            <span className="font-bold text-sm shrink-0">{entry.hours.toFixed(1)} h</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
