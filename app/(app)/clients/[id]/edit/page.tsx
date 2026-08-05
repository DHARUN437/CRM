import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { EditClientForm } from "@/components/clients/edit-client-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hasPermission } from "@/lib/permissions"
import { ArrowLeft, Building2 } from "lucide-react"

export const dynamic = "force-dynamic"

interface EditClientPageProps {
  params: Promise<{ id: string }>
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (!hasPermission(user.role, "clients.view")) redirect("/dashboard")

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single()

  if (!client) notFound()

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/clients/${id}`}
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to {client.company || client.name}
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
          <Building2 className="size-4 text-muted-foreground" />
        </span>
        <div className="flex flex-col">
          <h2 className="text-2xl font-semibold tracking-tight">Edit client</h2>
          <p className="text-sm text-muted-foreground">
            {client.company || client.name} · {client.email}
          </p>
        </div>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Contact details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditClientForm client={client} />
        </CardContent>
      </Card>
    </div>
  )
}
