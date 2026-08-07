"use client"

import { Card } from "@/components/ui/card"
import { motion, Variants } from "framer-motion"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export interface KPICardProps {
  label: string
  value: number
  icon: React.ReactNode
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  sparklineData?: number[]
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
}

export function KPICards({ stats }: { stats: KPICardProps[] }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      {stats.map((stat) => (
        <motion.div key={stat.label} variants={itemVariants}>
          <Card className="group relative overflow-hidden bg-[var(--surface)] border border-[var(--border)]/60 p-5 shadow-sm rounded-2xl transition-all">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] truncate">{stat.label}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                    {stat.value}
                  </span>
                  {stat.trend && (
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      {stat.trend === "up" && <TrendingUp className="size-3 text-success" />}
                      {stat.trend === "down" && <TrendingDown className="size-3 text-destructive" />}
                      {stat.trend === "neutral" && <Minus className="size-3 text-[var(--text-muted)]" />}
                      <span
                        className={
                          stat.trend === "up"
                            ? "text-success"
                            : stat.trend === "down"
                            ? "text-destructive"
                            : "text-[var(--text-muted)]"
                        }
                      >
                        {stat.trendValue}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-tint)] text-[var(--accent)] font-semibold shadow-xs transition-transform group-hover:scale-105">
                {stat.icon}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
