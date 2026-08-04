/**
 * AgencyOS — demo seed script.
 *
 * Creates team/admin + worker auth users, a demo client user, projects,
 * worker assignments, document requests and chat messages.
 * Uses the service role key (server-side only) — never expose it in the app.
 *
 * Usage (after filling .env.local):
 *   node --env-file=.env.local scripts/seed.mjs
 *
 * Demo logins:
 *   admin:  admin@agencyos.test   / AdminPass123!
 *   worker: maya@agencyos.test    / MayaPass123!
 *   worker: daniel@agencyos.test  / DanielPass123!
 *   client: acme@agencyos.test    / AcmePass123!
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey || url.includes("YOUR-")) {
  console.error(
    "❌ Missing Supabase credentials. Fill in .env.local first:\n" +
      "   NEXT_PUBLIC_SUPABASE_URL\n" +
      "   NEXT_PUBLIC_SUPABASE_ANON_KEY\n" +
      "   SUPABASE_SERVICE_ROLE_KEY\n" +
      "   (Project Settings → API in the Supabase dashboard)"
  )
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function upsertUser(email, password, meta) {
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const found = existing?.users?.find((u) => u.email === email)
  if (found) {
    await admin.auth.admin.updateUserById(found.id, { password, app_metadata: meta.app_metadata })
    console.log(`ℹ️  User exists, updated: ${email}`)
    return found
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: meta.app_metadata,
    user_metadata: meta.user_metadata,
  })
  if (error) throw new Error(`Failed to create ${email}: ${error.message}`)
  console.log(`✅ Created user: ${email}`)
  return data.user
}

async function main() {
  console.log("🌱 Seeding AgencyOS demo data...\n")

  const adminUser = await upsertUser("admin@agencyos.test", "AdminPass123!", {
    app_metadata: { role: "team" },
    user_metadata: { full_name: "Evan Carter" },
  })

  const mayaUser = await upsertUser("maya@agencyos.test", "MayaPass123!", {
    app_metadata: { role: "worker" },
    user_metadata: { full_name: "Maya Rodriguez" },
  })

  const danielUser = await upsertUser("daniel@agencyos.test", "DanielPass123!", {
    app_metadata: { role: "worker" },
    user_metadata: { full_name: "Daniel Kim" },
  })

  const clientUser = await upsertUser("acme@agencyos.test", "AcmePass123!", {
    app_metadata: { role: "client" },
    user_metadata: { full_name: "Sarah Mitchell", company: "Acme Corporation" },
  })

  // Team member profiles (auto-created by the auth trigger, or upserted here
  // if the trigger was not installed when the users were created).
  const { data: members } = await admin
    .from("team_members")
    .upsert(
      [
        {
          user_id: adminUser.id,
          role: "team",
          name: "Evan Carter",
          email: adminUser.email,
        },
        {
          user_id: mayaUser.id,
          role: "worker",
          name: "Maya Rodriguez",
          email: mayaUser.email,
        },
        {
          user_id: danielUser.id,
          role: "worker",
          name: "Daniel Kim",
          email: danielUser.email,
        },
      ],
      { onConflict: "user_id" }
    )
    .select("id, user_id")
  const memberByUser = new Map((members ?? []).map((m) => [m.user_id, m.id]))
  console.log(`ℹ️  Team members: ${members?.length ?? 0} profile(s)`)

  // Client profile (auto-created by the auth trigger, or created here if the
  // trigger did not fire).
  const { data: client, error: clientErr } = await admin
    .from("clients")
    .upsert(
      {
        user_id: clientUser.id,
        name: "Sarah Mitchell",
        company: "Acme Corporation",
        email: clientUser.email,
      },
      { onConflict: "user_id" }
    )
    .select("id, name, company")
    .single()
  if (clientErr) throw new Error(`Client profile missing: ${clientErr.message}`)
  console.log(`ℹ️  Client profile: ${client.name} (${client.company})`)

  // Projects
  const demoProjects = [
    {
      name: "Website Redesign",
      description:
        "Complete redesign of acme.com — new brand system, marketing pages and CMS integration.",
      status: "in_progress",
      progress: 60,
      tech_stack: ["Next.js", "Tailwind", "Sanity"],
      start_date: "2026-05-01",
      due_date: "2026-09-15",
    },
    {
      name: "Mobile App MVP",
      description:
        "Customer-facing iOS/Android app for order tracking with push notifications.",
      status: "kickoff",
      progress: 10,
      tech_stack: ["React Native", "Node.js"],
      start_date: "2026-06-10",
      due_date: "2026-11-01",
    },
    {
      name: "Brand Identity",
      description: "Logo suite, color tokens, typography and brand guidelines.",
      status: "in_review",
      progress: 85,
      tech_stack: ["Figma"],
      start_date: "2026-04-01",
      due_date: "2026-07-30",
    },
  ]

  const createdProjects = new Map()
  for (const p of demoProjects) {
    const { data: existing } = await admin
      .from("projects")
      .select("id")
      .eq("client_id", client.id)
      .eq("name", p.name)
      .maybeSingle()

    if (existing) {
      console.log(`ℹ️  Project exists, skipped: ${p.name}`)
      createdProjects.set(p.name, existing.id)
      continue
    }

    const { data: project, error: pErr } = await admin
      .from("projects")
      .insert({ client_id: client.id, ...p })
      .select("id")
      .single()
    if (pErr) throw new Error(`Failed to create project ${p.name}: ${pErr.message}`)
    createdProjects.set(p.name, project.id)
    console.log(`✅ Project: ${p.name}`)

    if (p.name === "Website Redesign") {
      const { error: rErr } = await admin.from("document_requests").insert([
        {
          project_id: project.id,
          title: "Content & copy for all pages",
          description:
            "Final marketing copy for Home, About, Pricing and Contact pages (Word or Google Docs).",
        },
        {
          project_id: project.id,
          title: "Brand assets — logo pack",
          description: "SVG + high-res PNG logo files for the new design system.",
        },
      ])
      if (rErr) throw new Error(`Failed to create requests: ${rErr.message}`)
      console.log(`✅ Document requests for ${p.name}`)
    }
  }

  // ---------------------------------------------------------------------------
  // Worker assignments
  // ---------------------------------------------------------------------------
  const demoAssignments = [
    { project: "Website Redesign", member: mayaUser.id, label: "Maya" },
    { project: "Website Redesign", member: danielUser.id, label: "Daniel" },
    { project: "Mobile App MVP", member: danielUser.id, label: "Daniel" },
    { project: "Brand Identity", member: mayaUser.id, label: "Maya" },
  ]

  for (const { project, member, label } of demoAssignments) {
    const projectId = createdProjects.get(project)
    const memberId = memberByUser.get(member)
    if (!projectId || !memberId) continue
    const { data: existing } = await admin
      .from("project_assignments")
      .select("id")
      .eq("project_id", projectId)
      .eq("team_member_id", memberId)
      .maybeSingle()
    if (existing) continue

    const { error: aErr } = await admin
      .from("project_assignments")
      .insert({ project_id: projectId, team_member_id: memberId })
    if (aErr) throw new Error(`Assignment failed (${label}): ${aErr.message}`)
    console.log(`✅ Assigned ${label} → ${project}`)
  }

  // ---------------------------------------------------------------------------
  // Chat messages (client <-> team)
  // ---------------------------------------------------------------------------
  const webProjectId = createdProjects.get("Website Redesign")
  if (webProjectId) {
    const existing = await admin
      .from("project_messages")
      .select("id")
      .eq("project_id", webProjectId)
      .limit(1)
    if (!existing.data?.length) {
      await admin.from("project_messages").insert([
        {
          project_id: webProjectId,
          sender_id: clientUser.id,
          body: "Hi team! I'll be uploading our new logo and the about-us copy later today. Anything else you need from our side?",
        },
        {
          project_id: webProjectId,
          sender_id: mayaUser.id,
          body: "Great, thank you Sarah! A vector version of the logo (SVG) and your brand colors would help a lot. We're on track for the Home page this week.",
        },
        {
          project_id: webProjectId,
          sender_id: clientUser.id,
          body: "Uploaded now — logo pack (SVG + PNG) and the About page copy.",
        },
      ])
      console.log("✅ Chat messages for Website Redesign")
    }
  }

  console.log("\n🎉 Seed complete!")
  console.log("\nDemo logins:")
  console.log("  Admin  → admin@agencyos.test  / AdminPass123!")
  console.log("  Worker → maya@agencyos.test    / MayaPass123!")
  console.log("  Worker → daniel@agencyos.test  / DanielPass123!")
  console.log("  Client → acme@agencyos.test    / AcmePass123!")
  console.log("\nLog into the client portal with the Acme account to upload docs")
  console.log("and chat; the admin/worker accounts see projects under the")
  console.log("agency dashboard (admin creates & assigns workers).")
}

main().catch((err) => {
  console.error("\n❌ Seed failed:", err.message)
  process.exit(1)
})
