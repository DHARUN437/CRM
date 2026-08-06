import { LoginForm } from "@/components/app/login-form"
import { AuthLayout } from "@/components/ui/auth-layout"

export default function LoginPage() {
  return (
    <AuthLayout
      title="Staff Sign In"
      subtitle="Access your agency dashboard, tasks, team chats, and CRM records."
    >
      <LoginForm />
    </AuthLayout>
  )
}
