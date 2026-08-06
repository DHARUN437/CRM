"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  PROJECT_STATUS_META,
  PROJECT_STATUS_ORDER,
  type ProjectStatus,
} from "@/lib/portal-types"

interface ProjectTimelineProps {
  status?: ProjectStatus | string
  progress?: number
}

export function ProjectTimeline({ status = "kickoff", progress }: ProjectTimelineProps) {
  const currentStatusIndex = Math.max(
    0,
    PROJECT_STATUS_ORDER.indexOf(status as ProjectStatus)
  )

  const totalSteps = PROJECT_STATUS_ORDER.length
  const progressPercent =
    status === "completed"
      ? 100
      : Math.round((currentStatusIndex / (totalSteps - 1)) * 100)

  return (
    <div className="py-6 px-4">
      <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border/50 rounded-full" />
        
        {/* Animated Progress Line */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0" 
        />

        {PROJECT_STATUS_ORDER.map((stepKey, i) => {
          const meta = PROJECT_STATUS_META[stepKey]
          const isCompleted = status === "completed" ? true : i < currentStatusIndex
          const isCurrent = status !== "completed" && i === currentStatusIndex

          return (
            <div key={stepKey} className="relative z-10 flex flex-col items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border-2 transition-colors duration-300",
                  isCompleted
                    ? "bg-primary border-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-background border-primary text-primary ring-4 ring-primary/20 font-bold"
                    : "bg-background border-border text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="size-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </motion.div>
              <span
                className={cn(
                  "text-xs font-medium absolute -bottom-6 whitespace-nowrap",
                  isCompleted || isCurrent ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {meta?.label ?? stepKey}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

