import Link from "next/link"
import { CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, MessageSquareText, Users } from "lucide-react"

interface ProjectCardProps {
  id: string
  name: string
  client: string
  statusLabel: string
  statusBadge: string
  progress: number
  dueDate: string
  messages: number
  workers: number
}

export function ProjectCard({
  id,
  name,
  client,
  statusLabel,
  statusBadge,
  progress,
  dueDate,
  messages,
  workers,
}: ProjectCardProps) {
  return (
    <Link
      href={`/projects/${id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-foreground/10 bg-background transition-colors hover:border-foreground/25"
    >
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{client}</p>
          </div>
          <Badge className={statusBadge}>{statusLabel}</Badge>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Due {dueDate}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {workers}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageSquareText className="size-3.5" />
            {messages}
          </span>
        </div>
      </CardContent>
    </Link>
  )
}