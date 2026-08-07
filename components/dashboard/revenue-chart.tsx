'use client'

import React from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'

export interface RevenueDataPoint {
  month: string
  revenue: number
  target: number
}

export interface RevenueChartProps {
  data: RevenueDataPoint[]
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ data }) => {
  const formatCurrency = (val: number) => `$${(val / 1000).toFixed(0)}k`

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)]/60 rounded-xl p-6 shadow-[0_1px_3px_rgba(16,24,40,0.06),0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] capitalize tracking-tight">
            revenue performance
          </h2>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
            last 6 months actual earnings vs target projection
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
            <span className="text-[var(--text-secondary)]">revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[var(--warning)]" />
            <span className="text-[var(--text-secondary)]">target</span>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.4} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatCurrency}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: '600',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)',
                padding: '10px 14px',
              }}
              formatter={(value: any) => [`$${Number(value || 0).toLocaleString()}`, '']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--accent)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="var(--warning)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default RevenueChart
