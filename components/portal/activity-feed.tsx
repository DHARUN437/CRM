"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { FileText, CheckCircle, CreditCard, MessageSquare } from "lucide-react"

const mockActivities = [
  {
    id: 1,
    title: "New Design Uploaded",
    project: "Web Project",
    time: "5 min ago",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    id: 2,
    title: "Invoice Paid",
    project: "Branding",
    time: "2 hrs ago",
    icon: CreditCard,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    id: 3,
    title: "Document Approved",
    project: "Web Project",
    time: "Yesterday",
    icon: CheckCircle,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    id: 4,
    title: "New Message",
    project: "Marketing Campaign",
    time: "2 days ago",
    icon: MessageSquare,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
]

export function ActivityFeed() {
  return (
    <Card className="rounded-2xl border-border/50 bg-white/60 shadow-sm backdrop-blur-xl h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-tight">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {mockActivities.map((activity, i) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="flex gap-4 group"
          >
            <div className="relative flex flex-col items-center">
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${activity.bg} ${activity.color} ring-4 ring-white shadow-sm z-10 transition-transform group-hover:scale-110`}>
                <activity.icon className="size-4" />
              </div>
              {i !== mockActivities.length - 1 && (
                <div className="absolute top-10 bottom-[-24px] w-px bg-border/60" />
              )}
            </div>
            <div className="flex flex-col pt-1">
              <span className="text-sm font-semibold text-foreground">
                {activity.title}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {activity.project} • {activity.time}
              </span>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  )
}
