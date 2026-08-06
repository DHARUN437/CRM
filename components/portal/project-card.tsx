"use client"

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
import { ArrowRight, CalendarDays } from "lucide-react"
import { PROJECT_STATUS_META, formatDate, initials, type Project } from "@/lib/portal-types"
import { motion } from "framer-motion"

export function ProjectCard({
  project,
  team = [],
}: {
  project: Project
  team?: { name: string }[]
}) {
  const meta =
    PROJECT_STATUS_META[project.status] ??
    PROJECT_STATUS_META.kickoff

  // Progress ring variables
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (project.progress / 100) * circumference

  return (
    <motion.div
      whileHover="hover"
      className="group block h-full relative"
    >
      {/* Gradient Hover Border */}
      <div className="absolute -inset-0.5 rounded-[26px] bg-gradient-to-br from-primary/30 to-secondary/30 opacity-0 blur transition-all duration-300 group-hover:opacity-100" />
      
      <Link href={`/portal/projects/${project.id}`} className="relative block h-full">
        <Card className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1.5">
                <Badge className={meta.badge + " w-fit"}>{meta.label}</Badge>
                <CardTitle className="text-xl tracking-tight text-foreground">{project.name}</CardTitle>
              </div>
              <div className="relative flex items-center justify-center">
                {/* Progress Ring */}
                <svg className="size-14 -rotate-90 transform">
                  <circle
                    className="text-primary/10"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="28"
                    cy="28"
                  />
                  <circle
                    className="text-primary transition-all duration-1000 ease-in-out"
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="28"
                    cy="28"
                  />
                </svg>
                <span className="absolute text-xs font-bold text-foreground">
                  {project.progress}%
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-2">
            {project.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}

            <div className="flex items-center justify-between">
              {team.length > 0 ? (
                <AvatarGroup>
                  {team.slice(0, 4).map((member) => (
                    <Avatar key={member.name} size="sm" className="ring-2 ring-background">
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {team.length > 4 && (
                    <AvatarGroupCount className="ring-2 ring-background">+{team.length - 4}</AvatarGroupCount>
                  )}
                </AvatarGroup>
              ) : (
                <span className="text-xs text-muted-foreground">No team assigned</span>
              )}
            </div>
          </CardContent>
          <CardFooter className="mt-auto flex items-center justify-between border-t border-border/40 bg-muted/30 px-6 py-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="size-4" />
              Due {formatDate(project.due_date)}
            </span>
            <div className="flex items-center justify-center size-8 rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  )
}
