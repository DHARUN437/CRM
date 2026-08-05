import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Mail, Phone, CalendarDays } from "lucide-react"
import { formatDate, type ClientProfile } from "@/lib/portal-types"

export function ClientContactsTab({ client }: { client: ClientProfile }) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Primary Contact</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-foreground font-semibold text-lg">
              {client.name.charAt(0).toUpperCase()}
            </span>
            <div className="flex flex-col">
              <h3 className="text-base font-semibold">{client.name}</h3>
              <p className="text-sm text-muted-foreground">
                {client.company ? `Representative at ${client.company}` : "Primary Point of Contact"}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="size-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-20 shrink-0">Email</span>
              <a
                href={`mailto:${client.email}`}
                className="font-medium text-primary hover:underline truncate"
              >
                {client.email}
              </a>
            </div>

            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="size-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground w-20 shrink-0">Phone</span>
                <a
                  href={`tel:${client.phone}`}
                  className="font-medium text-primary hover:underline truncate"
                >
                  {client.phone}
                </a>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <Building2 className="size-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-20 shrink-0">Company</span>
              <span className="font-medium truncate">{client.company ?? "—"}</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="size-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground w-20 shrink-0">Added</span>
              <span className="font-medium">{formatDate(client.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              render={<a href={`mailto:${client.email}`} />}
            >
              <Mail className="size-4" />
              Send Email
            </Button>
            {client.phone && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                render={<a href={`tel:${client.phone}`} />}
              >
                <Phone className="size-4" />
                Call Phone
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-foreground/5 text-muted-foreground">
              <Building2 className="size-6" />
            </span>
            <div className="flex flex-col">
              <h3 className="text-base font-semibold">{client.company ?? client.name}</h3>
              <p className="text-xs text-muted-foreground">Client Account ID: {client.id.slice(0, 8)}...</p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
            All portal invitations, notification emails, and document requests for this account are sent directly to <strong className="text-foreground">{client.email}</strong>.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
