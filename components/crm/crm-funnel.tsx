import { MeterBar } from "@/components/app/meter-bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { leadStages, type Lead } from "@/lib/crm"

const colors = leadStages.map((s) => s.accent)

export function CrmFunnel({ leads }: { leads: Lead[] }) {
  const total = leads.length || 1
  const steps = leadStages.map((stage) => {
    const count = leads.filter((l) => l.stage === stage.id).length
    return {
      label: stage.label,
      count,
      value: Math.round((count / total) * 100),
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Funnel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Share of the pipeline sitting at each stage
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{step.label}</span>
              <span className="text-muted-foreground">
                {step.count} · {step.value}%
              </span>
            </div>
            <MeterBar value={step.value} color={colors[i]} className="h-2.5" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
