import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

export function NoClientNotice({ email }: { email?: string }) {
  return (
    <Card className="my-8">
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:p-12">
        <div className="flex size-12 items-center justify-center rounded-full bg-warning/15 text-warning">
          <AlertCircle className="size-6" />
        </div>
        <div className="flex flex-col gap-1.5 max-w-md">
          <h3 className="text-lg font-semibold">Client Profile Not Found</h3>
          <p className="text-sm text-muted-foreground">
            {email ? `Your account (${email})` : "Your account"} is signed in, but has not been linked to a client profile in the system.
          </p>
          <p className="text-xs text-muted-foreground">
            Please ask your agency administrator to link your email to your client account in the CRM admin dashboard.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
