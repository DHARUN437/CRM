import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveClient } from "@/lib/supabase/portal"
import { getInvoicesForClient } from "@/lib/invoices"
import { PortalInvoices } from "@/components/portal/portal-invoices"

import { NoClientNotice } from "@/components/portal/no-client-notice"

export const dynamic = "force-dynamic"

export default async function ClientInvoicesPage() {
  const supabase = await createClient()
  const client = await getActiveClient(supabase)
  if (!client) redirect("/portal/login")

  const invoices = await getInvoicesForClient(client.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Invoices & Billing</h2>
        <p className="text-sm text-muted-foreground">
          View past statements, outstanding amounts, and payment histories.
        </p>
      </div>

      <PortalInvoices invoices={invoices} />
    </div>
  )
}
