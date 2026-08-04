import { redirect } from "next/navigation"
import { AppShell } from "@/components/app/app-shell"
import { getCurrentUser } from "@/lib/supabase/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  return (
    <AppShell
      role={user.role}
      userName={user.name}
      userEmail={user.email}
    >
      {children}
    </AppShell>
  )
}