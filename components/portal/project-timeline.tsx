"use client"

import { motion } from "framer-motion"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const milestones = [
  { label: "Kickoff", completed: true },
  { label: "Planning", completed: true },
  { label: "Design", completed: true },
  { label: "Development", completed: false, current: true },
  { label: "Testing", completed: false },
  { label: "Deployment", completed: false },
]

export function ProjectTimeline() {
  return (
    <div className="py-6 px-4">
      <div className="relative flex items-center justify-between w-full max-w-4xl mx-auto">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border/50 rounded-full" />
        
        {/* Animated Progress Line */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "50%" }} // Mocked progress based on 'Development'
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full z-0" 
        />

        {milestones.map((milestone, i) => (
          <div key={milestone.label} className="relative z-10 flex flex-col items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border-2 transition-colors duration-300",
                milestone.completed
                  ? "bg-primary border-primary text-primary-foreground"
                  : milestone.current
                  ? "bg-background border-primary text-primary ring-4 ring-primary/20"
                  : "bg-background border-border text-muted-foreground"
              )}
            >
              {milestone.completed ? (
                <Check className="size-4" />
              ) : (
                <span className="text-xs font-bold">{i + 1}</span>
              )}
            </motion.div>
            <span className={cn(
              "text-xs font-medium absolute -bottom-6 whitespace-nowrap",
              milestone.completed || milestone.current ? "text-foreground" : "text-muted-foreground"
            )}>
              {milestone.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
