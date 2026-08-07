"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface CircularProgressProps {
  progress: number // 0 to 100
  size?: number // e.g. 48, 64, 96
  strokeWidth?: number
  className?: string
  showLabel?: boolean
}

export function CircularProgress({
  progress,
  size = 48,
  strokeWidth = 4,
  className,
  showLabel = true,
}: CircularProgressProps) {
  const normalizedProgress = Math.min(100, Math.max(0, Number(progress) || 0))
  const isCompleted = normalizedProgress >= 100

  const center = size / 2
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference

  // Warm Orange (#FB923C) for in-progress, Emerald Green (#16A34A) for completed
  const arcColor = isCompleted ? "#16A34A" : "#FB923C"

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-40"
        />
        {/* Progress Arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={arcColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: "stroke-dashoffset 400ms ease-out, stroke 300ms ease",
          }}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute font-bold text-[var(--text-primary)] select-none"
          style={{ fontSize: Math.max(10, Math.round(size * 0.24)) }}
        >
          {Math.round(normalizedProgress)}%
        </span>
      )}
    </div>
  )
}
