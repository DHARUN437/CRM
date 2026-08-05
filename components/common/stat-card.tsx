import { Card, CardContent } from "@/components/ui/card"

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  description?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-muted-foreground">
          <Icon className="size-5" />
        </span>
        <div className="flex flex-col">
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
          <span className="text-sm text-muted-foreground">{title}</span>
          {description && (
            <span className="text-xs text-muted-foreground/70">{description}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}