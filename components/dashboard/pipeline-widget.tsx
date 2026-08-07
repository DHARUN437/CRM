import React from 'react'
import { Inbox } from 'lucide-react'

export interface DealStageItem {
  id: string
  name: string
  count: number
  amount: string
  statusColor?: 'accent' | 'warning' | 'success' | 'danger' | 'neutral'
}

export interface PipelineWidgetProps {
  stages: DealStageItem[]
  totalDealsCount?: number
}

const colorMap: Record<string, { bg: string; text: string }> = {
  accent: {
    bg: 'bg-[var(--accent-tint)]',
    text: 'text-[var(--accent)]',
  },
  warning: {
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#B45309]',
  },
  success: {
    bg: 'bg-[#DCFCE7]',
    text: 'text-[#15803D]',
  },
  danger: {
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#B91C1C]',
  },
  neutral: {
    bg: 'bg-[#F3F4F6]',
    text: 'text-[#4B5563]',
  },
}

export const PipelineWidget: React.FC<PipelineWidgetProps> = ({
  stages,
  totalDealsCount,
}) => {
  const totalDeals = totalDealsCount ?? stages.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)]/60 rounded-xl p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-[var(--text-primary)] capitalize tracking-tight">
          deal pipeline
        </h2>
        <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
          {totalDeals} active projects & opportunities across stages
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {stages.map((stage) => {
          const colors = colorMap[stage.statusColor || 'accent'] || colorMap.accent
          const isEmpty = stage.count === 0

          return (
            <div
              key={stage.id}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isEmpty
                  ? 'bg-[var(--background)]/60 border-[var(--border)]/40'
                  : 'bg-[var(--surface)] border-[var(--border)]/80 shadow-[0_1px_2px_rgba(16,24,40,0.04)] hover:shadow-[0_4px_12px_rgba(16,24,40,0.06)] hover:border-[var(--accent)]/40'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-[var(--text-primary)] capitalize truncate">
                  {stage.name}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                >
                  {stage.count}
                </span>
              </div>

              {isEmpty ? (
                <div className="py-2 flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] font-medium">
                  <Inbox className="w-3.5 h-3.5 text-[var(--text-muted)]/70" />
                  <span>No deals yet</span>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)] tracking-tight">{stage.amount}</p>
                  <p className="text-[11px] font-medium text-[var(--text-muted)] mt-0.5">weighted value</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PipelineWidget
