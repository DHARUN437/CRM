import Link from "next/link"
import { StatusBadge } from "@/components/common/status-badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CalendarDays, FolderOpen, MessageSquareText, Users } from "lucide-react"
import {
  PROJECT_STATUS_META,
  formatDate,
} from "@/lib/portal-types"

interface ProjectRow {
  id: string
  name: string
  description: string | null
  status: string
  progress: number
  tech_stack: string[]
  start_date: string | null
  due_date: string | null
  created_at: string
  message_count?: number
  worker_count?: number
}

export function ClientProjectsTab({ projects }: { projects: ProjectRow[] }) {
  if (!projects.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
          <FolderOpen className="size-8 text-muted-foreground/50" />
          No projects for this client yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {projects.map((project) => {
        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="group flex flex-col gap-3 rounded-xl border border-foreground/10 bg-background p-5 transition-colors hover:border-foreground/25"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm font-semibold">{project.name}</p>
                {project.description && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </div>
              <StatusBadge status={project.status} meta={PROJECT_STATUS_META} />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-1.5" />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {project.due_date && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  Due {formatDate(project.due_date)}
                </span>
              )}
              {project.worker_count !== undefined && (
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {project.worker_count}
                </span>
              )}
              {project.message_count !== undefined && (
                <span className="flex items-center gap-1.5">
                  <MessageSquareText className="size-3.5" />
                  {project.message_count}
                </span>
              )}
              {project.tech_stack.length > 0 && (
                <span className="truncate">
                  {project.tech_stack.slice(0, 3).join(", ")}
                  {project.tech_stack.length > 3 && ` +${project.tech_stack.length - 3}`}
                </span>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}