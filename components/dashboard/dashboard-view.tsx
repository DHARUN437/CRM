'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import MetricCard, { MetricCardProps } from './metric-card'
import PipelineWidget, { DealStageItem } from './pipeline-widget'
import ActivityFeed, { ActivityFeedItem } from './activity-feed'
import DealsTable, { DealTableItem } from './deals-table'
import type { RevenueDataPoint } from './revenue-chart'

const RevenueChart = dynamic(() => import('./revenue-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full animate-pulse rounded-xl bg-foreground/5" />
  ),
})

export interface DashboardViewProps {
  metrics: MetricCardProps[]
  pipelineStages: DealStageItem[]
  revenueChartData: RevenueDataPoint[]
  activities: ActivityFeedItem[]
  deals: DealTableItem[]
  needsAttentionSection?: React.ReactNode
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  pipelineStages,
  revenueChartData,
  activities,
  deals,
  needsAttentionSection,
}) => {
  return (
    <div className="space-y-6">
      {/* Needs Attention Section (if present) */}
      {needsAttentionSection}

      {/* Key Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.label || index}
            label={metric.label}
            value={metric.value}
            trend={metric.trend}
            trendDirection={metric.trendDirection}
          />
        ))}
      </section>

      {/* Deal Pipeline Bar */}
      <section>
        <PipelineWidget stages={pipelineStages} />
      </section>

      {/* Revenue Chart & Activity Feed Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueChartData} />
        </div>
        <div className="lg:col-span-1">
          <ActivityFeed activities={activities} />
        </div>
      </section>

      {/* Recent Deals Table */}
      <section>
        <DealsTable deals={deals} />
      </section>
    </div>
  )
}

export default DashboardView
