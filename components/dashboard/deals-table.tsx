import React from 'react'
import StatusPill, { StatusType } from './status-pill'
import { avatarColor } from '@/lib/crm'

export interface DealTableItem {
  id: string
  company: string
  contact: string
  value: string
  stage: StatusType | string
  owner: {
    name: string
    avatar?: string
  }
  lastActivity: string
}

export interface DealsTableProps {
  deals: DealTableItem[]
}

export const DealsTable: React.FC<DealsTableProps> = ({ deals }) => {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)]/60 rounded-xl p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] capitalize tracking-tight">
            recent deals & opportunities
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            latest active client projects and value pipelines
          </p>
        </div>
        <button
          className="text-xs text-[var(--accent)] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded px-1"
          aria-label="view all deals"
        >
          view all deals
        </button>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr className="border-b border-[var(--border)]/60 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--text-muted)]">
              <th className="py-3 px-3">company</th>
              <th className="py-3 px-3">contact</th>
              <th className="py-3 px-3">value</th>
              <th className="py-3 px-3">stage</th>
              <th className="py-3 px-3">owner</th>
              <th className="py-3 px-3 text-right">last activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]/40 text-xs text-[var(--text-primary)]">
            {deals.map((deal) => {
              const bgAvatar = avatarColor(deal.owner.name)

              return (
                <tr
                  key={deal.id}
                  className="hover:bg-[var(--accent-tint)]/50 transition-colors duration-150 group cursor-pointer"
                >
                  <td className="py-3.5 px-3 font-semibold text-[var(--text-primary)]">
                    {deal.company}
                  </td>
                  <td className="py-3.5 px-3 text-[var(--text-secondary)] font-medium">{deal.contact}</td>
                  <td className="py-3.5 px-3 font-bold text-[var(--text-primary)] tracking-tight">{deal.value}</td>
                  <td className="py-3.5 px-3">
                    <StatusPill status={deal.stage} />
                  </td>
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      {deal.owner.avatar ? (
                        <img
                          src={deal.owner.avatar}
                          alt={deal.owner.name}
                          className="w-6 h-6 rounded-full object-cover border border-[var(--border)]/60"
                        />
                      ) : (
                        <div
                          style={{ backgroundColor: bgAvatar }}
                          className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-[10px] shadow-sm"
                        >
                          {deal.owner.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[var(--text-secondary)] font-medium">{deal.owner.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right text-[var(--text-muted)] font-medium">
                    {deal.lastActivity}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DealsTable
