import React from 'react'

export type StatusType =
  | 'won'
  | 'lost'
  | 'pending'
  | 'in_progress'
  | 'in_review'
  | 'on_hold'
  | 'archived'

export interface StatusPillProps {
  status: StatusType | string
  className?: string
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  won: {
    bg: 'bg-[#DCFCE7]',
    text: 'text-[#15803D]',
    label: 'won',
  },
  lost: {
    bg: 'bg-[#FEE2E2]',
    text: 'text-[#B91C1C]',
    label: 'lost',
  },
  pending: {
    bg: 'bg-[#FEF3C7]',
    text: 'text-[#B45309]',
    label: 'pending',
  },
  in_progress: {
    bg: 'bg-[#EAF1FF]',
    text: 'text-[#2F6FED]',
    label: 'in progress',
  },
  in_review: {
    bg: 'bg-[#F3E8FF]',
    text: 'text-[#7E22CE]',
    label: 'in review',
  },
  on_hold: {
    bg: 'bg-[#FFEDD5]',
    text: 'text-[#C2410C]',
    label: 'on hold',
  },
  archived: {
    bg: 'bg-[#F3F4F6]',
    text: 'text-[#4B5563]',
    label: 'archived',
  },
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, className = '' }) => {
  const key = String(status).toLowerCase().replace(/\s+/g, '_')
  const current = statusStyles[key] || statusStyles.pending

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide lowercase ${current.bg} ${current.text} ${className}`}
      aria-label={`status: ${current.label}`}
    >
      {current.label}
    </span>
  )
}

export default StatusPill
