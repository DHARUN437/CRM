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
          <Card className="group relative overflow-hidden glass-card glass-card-hover dark:border-[#2A2A38] dark:bg-[#17171F] p-5 shadow-layered transition-all">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 dark:text-[#9797A8] truncate">{stat.label}</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground/90 dark:text-[#F4F4F6]">
                    {stat.value}
                  </span>
                  {stat.trend && (
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      {stat.trend === "up" && <TrendingUp className="size-3 text-success dark:text-[#34D399]" />}
                      {stat.trend === "down" && <TrendingDown className="size-3 text-destructive dark:text-[#F87171]" />}
                      {stat.trend === "neutral" && <Minus className="size-3 text-muted-foreground/60 dark:text-[#6E6E80]" />}
                      <span
                        className={
                          stat.trend === "up"
                            ? "text-success dark:text-[#34D399]"
                            : stat.trend === "down"
                            ? "text-destructive dark:text-[#F87171]"
                            : "text-muted-foreground/60 dark:text-[#6E6E80]"
                        }
                      >
                        {stat.trendValue}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary/15 dark:bg-[rgba(99,102,241,0.15)] text-primary dark:text-[#818CF8] shadow-sm transition-transform group-hover:scale-110">
                {stat.icon}
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
