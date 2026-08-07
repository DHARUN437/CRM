import React from 'react'
import { PhoneCall, Mail, Calendar, DollarSign, FileText, CheckCircle2 } from 'lucide-react'

export interface ActivityFeedItem {
  id: string
  type?: string
  description: string
  timestamp: string
  user?: {
    name: string
    avatar?: string
  }
}

export interface ActivityFeedProps {
  activities: ActivityFeedItem[]
}

const iconMap: Record<string, React.ElementType> = {
  call: PhoneCall,
  email: Mail,
  meeting: Calendar,
  deal: DollarSign,
  upload: FileText,
  task: CheckCircle2,
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)]/60 rounded-xl p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)] h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)] capitalize tracking-tight">
              recent activity
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
              realtime log of portal interactions
            </p>
          </div>
          <span className="text-xs text-[var(--accent)] font-semibold cursor-pointer hover:underline">
            view all
          </span>
        </div>

        <div className="space-y-4 mt-5">
          {activities.map((item) => {
            const Icon = iconMap[item.type || 'deal'] || DollarSign

            return (
              <div key={item.id} className="flex items-start gap-3.5 text-sm group">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-tint)] text-[var(--accent)] flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--text-primary)] leading-snug">
                    {item.user?.name && (
                      <span className="font-semibold text-[var(--text-primary)]">
                        {item.user.name}{' '}
                      </span>
                    )}
                    <span className="text-[var(--text-secondary)]">{item.description}</span>
                  </p>
                  <p className="text-[11px] font-medium text-[var(--text-muted)] mt-0.5">{item.timestamp}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ActivityFeed
