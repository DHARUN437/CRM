import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowUpRight, CalendarDays } from "lucide-react"
import { PROJECT_STATUS_META, formatDate, type Project } from "@/lib/portal-types"

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ProjectCard({
  project,
  team = [],
}: {
  project: Project
  team?: { name: string }[]
}) {
  const meta = PROJECT_STATUS_META[project.status]

  return (
    <Link href={`/portal/projects/${project.id}`} className="group block h-full">
      <Card className="flex h-full flex-col transition-colors group-hover:border-foreground/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">{project.name}</CardTitle>
            <Badge className={meta.badge}>{meta.label}</Badge>
          </div>
          {project.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium text-foreground">{project.progress}%</span>
            </div>
            <Progress value={project.progress} />
          </div>

          {team.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Your team
                <span className="font-medium text-foreground">{team.length}</span>
              </span>
              <AvatarGroup>
                {team.slice(0, 4).map((member) => (
                  <Avatar key={member.name} size="sm">
                    <AvatarFallback>{initials(member.name)}</AvatarFallback>
                  </Avatar>
                ))}
                {team.length > 4 && (
                  <AvatarGroupCount>+{team.length - 4}</AvatarGroupCount>
                )}
              </AvatarGroup>
            </div>
          )}
        </CardContent>
        <CardFooter className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Due {formatDate(project.due_date)}
          </span>
          <span className="flex items-center gap-1 text-foreground/80 transition-colors group-hover:text-foreground">
            View details
            <ArrowUpRight className="size-3.5" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  )
}
