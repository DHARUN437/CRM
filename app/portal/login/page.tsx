import { PortalLoginForm } from "@/components/portal/login-form"
import { AuthLayout } from "@/components/ui/auth-layout"

export const dynamic = "force-dynamic"

export default async function PortalLoginPage() {
  return (
    <AuthLayout
      title="Client Sign In"
      subtitle="Access your client portal, view project updates, and share documents."
    >
      <PortalLoginForm />
    </AuthLayout>
  )
}
