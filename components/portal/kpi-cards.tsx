"use client"

import { Card, CardContent } from "@/components/ui/card"
import { motion, Variants } from "framer-motion"
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react"

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
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat, i) => (
        <motion.div key={stat.label} variants={itemVariants}>
          <Card className="group relative overflow-hidden rounded-2xl border border-border/50 bg-white/60 p-6 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-layered glass-card-hover">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </span>
                  {stat.trend && (
                    <div className="flex items-center gap-1 text-xs font-semibold">
                      {stat.trend === "up" && <TrendingUp className="size-3 text-success" />}
                      {stat.trend === "down" && <TrendingDown className="size-3 text-destructive" />}
                      {stat.trend === "neutral" && <Minus className="size-3 text-muted-foreground" />}
                      <span
                        className={
                          stat.trend === "up"
                            ? "text-success"
                            : stat.trend === "down"
                            ? "text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {stat.trendValue}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-sm transition-transform group-hover:scale-110">
                {stat.icon}
              </div>
            </div>
            {/* Minimal abstract sparkline decoration */}
            <div className="absolute -bottom-4 -right-4 size-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors" />
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
