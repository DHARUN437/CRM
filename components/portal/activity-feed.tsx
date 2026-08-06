"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { FileText, CheckCircle, Activity } from "lucide-react"
import { cn } from "@/lib/utils"

export type PortalActivity = {
  id: string
  title: string
  project: string
  time: string
  type?: string
}

const typeMeta = {
  upload: { icon: FileText, color: "text-primary dark:text-[#818CF8]", bg: "bg-primary/15 dark:bg-[rgba(99,102,241,0.15)]" },
  task: { icon: CheckCircle, color: "text-success dark:text-[#34D399]", bg: "bg-success/15 dark:bg-[rgba(52,211,153,0.12)]" },
} as const

export function ActivityFeed({ activities }: { activities: PortalActivity[] }) {
  if (!activities.length) {
    return (
      <Card className="rounded-[24px] border border-border/40 dark:border-[#2A2A38] glass-card dark:bg-[#17171F] h-full p-6">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-base font-bold text-foreground/90 dark:text-[#F4F4F6]">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex flex-col items-center gap-3 text-center">
          <Activity className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground dark:text-[#9797A8]">
            Activity like document uploads and task updates will appear here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-[24px] border border-border/40 dark:border-[#2A2A38] glass-card dark:bg-[#17171F] h-full p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-base font-bold text-foreground/90 dark:text-[#F4F4F6]">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-col gap-6">
        {activities.map((activity, i) => {
          const meta = typeMeta[activity.type as keyof typeof typeMeta] ?? typeMeta.upload
          const Icon = meta.icon
          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex gap-4 group"
            >
              <div className="relative flex flex-col items-center">
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm z-10 transition-transform group-hover:scale-110", meta.bg, meta.color)}>
                  <Icon className="size-4" />
                </div>
                {i !== activities.length - 1 && (
                  <div className="absolute top-10 bottom-[-24px] w-px bg-border/40 dark:bg-[#2A2A38]" />
                )}
              </div>
              <div className="flex flex-col pt-1 min-w-0">
                <span className="text-sm font-bold text-foreground/90 dark:text-[#F4F4F6] truncate">
                  {activity.title}
                </span>
                <span className="text-xs font-semibold text-muted-foreground/80 dark:text-[#9797A8] mt-0.5">
                  {activity.project} • {activity.time}
                </span>
              </div>
            </motion.div>
          )
        })}
      </CardContent>
    </Card>
  )
}
