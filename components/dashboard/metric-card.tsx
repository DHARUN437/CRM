import React from 'react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export interface MetricCardProps {
  label: string
  value: string
  trend?: string | null
  trendDirection?: 'up' | 'down'
  className?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  trend,
  trendDirection = 'up',
  className = '',
}) => {
  const isUp = trendDirection === 'up'

  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)]/60 rounded-xl p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)] hover:border-[var(--border)] ${className}`}
    >
      <p className="text-[13px] font-medium text-[var(--text-secondary)] tracking-[0.01em] lowercase first-letter:uppercase">
        {label}
      </p>
      <div className="flex items-baseline justify-between mt-1 gap-2">
        <h3 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
          {value}
        </h3>
        {trend && (
          <div
            className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-md ${
              isUp
                ? 'bg-[#DCFCE7] text-[#15803D]'
                : 'bg-[#FEE2E2] text-[#B91C1C]'
            }`}
            aria-label={`trend ${isUp ? 'increase' : 'decrease'} ${trend}`}
          >
            {isUp ? (
              <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
            )}
            <span>{trend}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default MetricCard
