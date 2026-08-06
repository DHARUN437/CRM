"use client"

import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

interface EmptyStateProps {
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/40 px-6 py-16 text-center backdrop-blur-md"
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-6 ring-8 ring-primary/5">
        {icon}
      </div>
      <h3 className="text-xl font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button render={<Link href={action.href} />} className="mt-8 rounded-full shadow-md shadow-primary/20 transition-transform hover:-translate-y-0.5">
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}
