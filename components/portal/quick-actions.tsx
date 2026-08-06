"use client"

import { Button } from "@/components/ui/button"
import { Plus, HelpCircle, Upload, Calendar, Receipt } from "lucide-react"
import { motion } from "framer-motion"

const actions = [
  { label: "New Project", icon: Plus },
  { label: "Request Support", icon: HelpCircle },
  { label: "Upload Document", icon: Upload },
  { label: "Schedule Meeting", icon: Calendar },
  { label: "View Invoices", icon: Receipt },
]

export function QuickActions() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="flex flex-wrap items-center gap-3 mt-4"
    >
      {actions.map((action, idx) => (
        <Button
          key={idx}
          variant="outline"
          className="rounded-full bg-white/40 backdrop-blur-md hover:bg-white/80 hover:-translate-y-0.5 transition-all shadow-sm hover:shadow text-sm border-white/40"
        >
          <action.icon className="mr-2 size-4 text-primary" />
          {action.label}
        </Button>
      ))}
    </motion.div>
  )
}
