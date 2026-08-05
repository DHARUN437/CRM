import { Card, CardContent } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { AlertCircle, LayoutDashboard, LogOut } from "lucide-react"
import Link from "next/link"

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
            {email ? `Your account (${email})` : "Your account"} is currently logged in, but is not linked to a Client Profile in the portal database.
          </p>
          <p className="text-xs text-muted-foreground">
            If you are an agency administrator or staff member, please access your Admin CRM Dashboard below.
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/dashboard" className={buttonVariants({ variant: "default", className: "gap-2" })}>
            <LayoutDashboard className="size-4" />
            Go to Admin CRM Dashboard
          </Link>

          <Link href="/portal/login" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
            <LogOut className="size-4" />
            Sign in with Client Account
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
