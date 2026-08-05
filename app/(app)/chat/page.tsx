import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/session"
import { TeamChat } from "@/components/chat/team-chat"
import { type TeamDirectoryMember } from "@/lib/portal-types"

export const dynamic = "force-dynamic"

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>
}) {
  const supabase = await createClient()
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  if (user.role === "client") redirect("/portal")

  const { channel } = await searchParams

  const { data: members } = await supabase
    .from("team_members")
    .select("id, user_id, name, role")
    .order("name", { ascending: true })

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team Chat</h1>
        <p className="text-sm text-muted-foreground">
          Internal chat for the team — clients can&apos;t see this.
        </p>
      </div>
      <TeamChat
        currentUserId={user.id}
        members={(members ?? []) as unknown as TeamDirectoryMember[]}
        projects={(projects ?? []).map((p) => ({ id: p.id, name: p.name }))}
        initialChannelKey={channel}
      />
    </div>
  )
}
