"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col gap-2">
        <div className="h-4 w-40 rounded bg-muted/40 dark:bg-[#1E1E28]" />
        <div className="h-8 w-80 rounded-lg bg-muted/40 dark:bg-[#1E1E28]" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass-card dark:border-[#2A2A38]">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <div className="size-10 rounded-xl bg-muted/40 dark:bg-[#1E1E28]" />
                <div className="h-5 w-12 rounded-full bg-muted/40 dark:bg-[#1E1E28]" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-8 w-16 rounded bg-muted/40 dark:bg-[#1E1E28]" />
                <div className="h-3 w-28 rounded bg-muted/40 dark:bg-[#1E1E28]" />
              </div>
              <div className="h-6 w-full rounded bg-muted/40 dark:bg-[#1E1E28]" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main grid skeleton */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* Projects section */}
          <div className="flex flex-col gap-3">
            <div className="h-6 w-36 rounded bg-muted/40 dark:bg-[#1E1E28]" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="glass-card dark:border-[#2A2A38] p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <div className="h-5 w-20 rounded-full bg-muted/40 dark:bg-[#1E1E28]" />
                      <div className="h-6 w-16 rounded-full bg-muted/40 dark:bg-[#1E1E28]" />
                    </div>
                    <div className="h-6 w-3/4 rounded bg-muted/40 dark:bg-[#1E1E28]" />
                    <div className="h-2 w-full rounded bg-muted/40 dark:bg-[#1E1E28]" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Messages section */}
          <div className="flex flex-col gap-3">
            <div className="h-6 w-40 rounded bg-muted/40 dark:bg-[#1E1E28]" />
            <Card className="glass-card dark:border-[#2A2A38] p-4 flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex flex-col gap-2 border-b border-border/20 dark:border-[#2A2A38] pb-3 last:border-0">
                  <div className="h-4 w-1/2 rounded bg-muted/40 dark:bg-[#1E1E28]" />
                  <div className="h-3 w-5/6 rounded bg-muted/40 dark:bg-[#1E1E28]" />
                </div>
              ))}
            </Card>
          </div>
        </div>

        {/* Right column skeleton */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="h-6 w-44 rounded bg-muted/40 dark:bg-[#1E1E28]" />
            {[1, 2].map((i) => (
              <Card key={i} className="glass-card dark:border-[#2A2A38] p-5 flex flex-col gap-2">
                <div className="h-5 w-2/3 rounded bg-muted/40 dark:bg-[#1E1E28]" />
                <div className="h-4 w-1/3 rounded bg-muted/40 dark:bg-[#1E1E28]" />
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <div className="h-6 w-36 rounded bg-muted/40 dark:bg-[#1E1E28]" />
            <Card className="glass-card dark:border-[#2A2A38] p-6 flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 items-center">
                  <div className="size-3 rounded-full bg-muted/40 dark:bg-[#1E1E28]" />
                  <div className="flex flex-col gap-1 flex-1">
                    <div className="h-4 w-3/4 rounded bg-muted/40 dark:bg-[#1E1E28]" />
                    <div className="h-3 w-1/2 rounded bg-muted/40 dark:bg-[#1E1E28]" />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
