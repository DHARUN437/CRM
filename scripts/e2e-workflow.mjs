/**
 * AgencyOS — E2E workflow verification (run with node --env-file=.env.local)
 *
 * Simulates the real user flow through actual auth sessions so RLS is enforced:
 *   1. Create client + worker auth users (service role = admin)
 *   2. Create a project for the client, assign the worker
 *   3. Worker session: see project, send chat message, create document request
 *   4. Client session: see project/team/messages/request, reply in chat,
 *      fulfill the request with a text response, submit a feature request
 *   5. Worker re-checks: sees client's reply + fulfilled request + feature request
 *   6. Admin session: sees the client's feature request
 *   7. Chat attachments (storage RLS) uploaded + read by both sides
 *   8. Team chat: #general both ways, project channel, DM, client excluded
 *   9. Team chat read receipts: unread counts, notifications, mark-read ticks
 *  10. Invoice lifecycle: issue → partial payment → paid, client visibility
 *  11. Clean up all test data
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !serviceKey || !anonKey) {
  console.error("Missing env vars in .env.local")
  process.exit(1)
}

const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ts = Date.now()
const clientEmail = `e2e.client.${ts}@test.local`
const workerEmail = `e2e.worker.${ts}@test.local`
const adminEmail = `e2e.admin.${ts}@test.local`
const password = "E2eTestPass123!"
const clientName = "E2E Client"
const company = "E2E Corp"
const workerName = "E2E Worker"
const projectName = "E2E Project"

let pass = 0
let fail = 0
function step(n, ok, detail) {
  if (ok) pass++
  else fail++
  console.log(`${ok ? "✅" : "❌"}  ${n}. ${detail}`)
}

async function main() {
  console.log("Running E2E workflow test...\n")

  // 1. Create users ----------------------------------------------------------
  const { data: clientRes, error: cErr } = await service.auth.admin.createUser({
    email: clientEmail,
    password,
    email_confirm: true,
    app_metadata: { role: "client" },
    user_metadata: { full_name: clientName, company },
  })
  if (cErr) throw new Error(`client create: ${cErr.message}`)
  const clientUser = clientRes.user

  const { data: workerRes, error: wErr } = await service.auth.admin.createUser({
    email: workerEmail,
    password,
    email_confirm: true,
    app_metadata: { role: "worker" },
    user_metadata: { full_name: workerName },
  })
  if (wErr) throw new Error(`worker create: ${wErr.message}`)
  const workerUser = workerRes.user
  console.log(`   Created client ${clientEmail} + worker ${workerEmail}`)

  // 2. Profiles (auto-created by triggers; upsert fallback) -------------------
  let { data: clientRow } = await service
    .from("clients")
    .select("id")
    .eq("user_id", clientUser.id)
    .single()
  if (!clientRow) {
    const { data, error } = await service
      .from("clients")
      .upsert(
        { user_id: clientUser.id, name: clientName, company, email: clientEmail },
        { onConflict: "user_id" }
      )
      .select("id")
      .single()
    if (error) throw new Error(`client row: ${error.message}`)
    clientRow = data
  }
  let { data: workerRow } = await service
    .from("team_members")
    .select("id")
    .eq("user_id", workerUser.id)
    .single()
  if (!workerRow) {
    const { data, error } = await service
      .from("team_members")
      .upsert(
        { user_id: workerUser.id, role: "worker", name: workerName, email: workerEmail },
        { onConflict: "user_id" }
      )
      .select("id")
      .single()
    if (error) throw new Error(`worker row: ${error.message}`)
    workerRow = data
  }
  console.log("   Client profile + worker profile ready")

  const { data: adminRes, error: aCreateErr } = await service.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    app_metadata: { role: "team" },
    user_metadata: { full_name: "E2E Admin" },
  })
  if (aCreateErr) throw new Error(`admin create: ${aCreateErr.message}`)
  const adminUser = adminRes.user
  let { data: adminRow } = await service
    .from("team_members")
    .select("id")
    .eq("user_id", adminUser.id)
    .single()
  if (!adminRow) {
    const { data, error } = await service
      .from("team_members")
      .upsert(
        { user_id: adminUser.id, role: "team", name: "E2E Admin", email: adminEmail },
        { onConflict: "user_id" }
      )
      .select("id")
      .single()
    if (error) throw new Error(`admin row: ${error.message}`)
    adminRow = data
  }
  console.log(`   Created admin ${adminEmail}`)

  // 3. Project + assignment (admin action via service role) -------------------
  const { data: project, error: pErr } = await service
    .from("projects")
    .insert({ client_id: clientRow.id, name: projectName, status: "kickoff", progress: 0 })
    .select("id")
    .single()
  if (pErr) throw new Error(`project create: ${pErr.message}`)

  const { error: aErr } = await service
    .from("project_assignments")
    .insert({ project_id: project.id, team_member_id: workerRow.id })
  if (aErr) throw new Error(`assign worker: ${aErr.message}`)
  console.log(`   Created project "${projectName}" + assigned worker`)

  // 4. Worker session ---------------------------------------------------------
  const worker = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error: wSignErr } = await worker.auth.signInWithPassword({
    email: workerEmail,
    password,
  })
  if (wSignErr) throw new Error(`worker signin: ${wSignErr.message}`)

  const { data: wProjects, error: wProjErr } = await worker
    .from("projects")
    .select("id")
    .eq("id", project.id)
  step(1, wProjErr == null && wProjects?.length === 1, "Worker sees the assigned project (RLS)")

  const { error: wMsgErr } = await worker.from("project_messages").insert({
    project_id: project.id,
    sender_id: workerUser.id,
    body: "Hi from E2E worker — need your logo files (SVG + PNG).",
  })
  step(2, wMsgErr == null, `Worker sends a chat message (${wMsgErr?.message ?? "ok"})`)

  const { data: request, error: wReqErr } = await worker
    .from("document_requests")
    .insert({
      project_id: project.id,
      title: "E2E logo pack",
      description: "SVG + high-res PNG",
      request_type: "document",
      priority: "urgent",
    })
    .select("id")
    .single()
  step(3, wReqErr == null, `Worker creates a document request (${wReqErr?.message ?? "ok"})`)
  const requestId = request?.id

  // 5. Client session ---------------------------------------------------------
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error: cSignErr } = await client.auth.signInWithPassword({
    email: clientEmail,
    password,
  })
  if (cSignErr) throw new Error(`client signin: ${cSignErr.message}`)

  const { data: cProjects } = await client
    .from("projects")
    .select("id, name")
    .eq("id", project.id)
  step(4, cProjects?.length === 1, "Client sees the project in their portal")

  const { data: cMsgs } = await client
    .from("project_messages")
    .select("body")
  step(5, cMsgs?.some((m) => m.body.includes("E2E worker")), "Client sees the worker's message")

  const { data: cTeam } = await client
    .from("project_assignments")
    .select("team_members(name)")
  step(6, cTeam?.length === 1, "Client sees the assigned team")

  const { data: cReqs } = await client
    .from("document_requests")
    .select("id, title, priority")
    .eq("id", requestId)
  step(7, cReqs?.[0]?.title === "E2E logo pack" && cReqs?.[0]?.priority === "urgent", "Client sees the document request (with priority)")

  const { error: cMsgErr } = await client.from("project_messages").insert({
    project_id: project.id,
    sender_id: clientUser.id,
    body: "Hi, uploading now — here is the E2E client reply.",
  })
  step(8, cMsgErr == null, `Client replies in the chat (${cMsgErr?.message ?? "ok"})`)

  const { error: cUpdErr } = await client
    .from("document_requests")
    .update({ status: "fulfilled", text_response: "E2E client provided the logo pack." })
    .eq("id", requestId)
  step(9, cUpdErr == null, `Client fulfills the request with a text reply (${cUpdErr?.message ?? "ok"})`)

  const { error: cFeatErr } = await client.from("feature_requests").insert({
    project_id: project.id,
    client_id: clientRow.id,
    title: "E2E dark mode toggle",
    description: "Please add a dark mode toggle.",
    priority: "high",
  })
  step(10, cFeatErr == null, `Client submits a feature request (${cFeatErr?.message ?? "ok"})`)

  // 6. Worker re-checks (the realtime loop) -----------------------------------
  const { data: wMsgs2 } = await worker
    .from("project_messages")
    .select("body")
  step(11, wMsgs2?.some((m) => m.body.includes("client reply")), "Worker sees the client's chat reply")

  const { data: wReqs2 } = await worker
    .from("document_requests")
    .select("status, text_response")
    .eq("id", requestId)
  step(
    12,
    wReqs2?.[0]?.status === "fulfilled" && (wReqs2?.[0]?.text_response ?? "").includes("logo"),
    "Worker sees the fulfilled request + client's text response"
  )

  const { error: wDocsErr } = await worker
    .from("project_documents")
    .select("id")
    .eq("project_id", project.id)
  step(13, wDocsErr == null, `Worker can read project documents (${wDocsErr?.message ?? "ok"})`)

  // 7. Chat attachments (storage RLS) ------------------------------------------
  const workerFile = Buffer.from("worker attachment")
  const clientFile = Buffer.from("client attachment")
  const workerPath = `${project.id}/e2e-worker.txt`
  const clientPath = `${project.id}/e2e-client.txt`

  const { error: wUpErr } = await worker.storage
    .from("chat-attachments")
    .upload(workerPath, workerFile, { contentType: "text/plain", upsert: true })
  step(14, wUpErr == null, `Worker uploads a chat attachment (${wUpErr?.message ?? "ok"})`)

  const { error: cUpErr } = await client.storage
    .from("chat-attachments")
    .upload(clientPath, clientFile, { contentType: "text/plain", upsert: true })
  step(15, cUpErr == null, `Client uploads a chat attachment (${cUpErr?.message ?? "ok"})`)

  const { error: wReadErr } = await worker.storage.from("chat-attachments").download(clientPath)
  const { error: cReadErr } = await client.storage.from("chat-attachments").download(workerPath)
  step(16, wReadErr == null && cReadErr == null, `Both sides can read the attachments (${wReadErr?.message ?? cReadErr?.message ?? "ok"})`)

  // 8. Feature request visibility ------------------------------------------------
  const { data: wFeats } = await worker
    .from("feature_requests")
    .select("id, title, status")
    .eq("project_id", project.id)
  step(17, wFeats?.some((f) => f.title === "E2E dark mode toggle"), "Worker sees the client's feature request (RLS)")

  const admin = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error: aSignErr } = await admin.auth.signInWithPassword({
    email: adminEmail,
    password,
  })
  if (aSignErr) throw new Error(`admin signin: ${aSignErr.message}`)
  const { data: aFeats } = await admin
    .from("feature_requests")
    .select("id, title, status")
    .eq("project_id", project.id)
  step(18, aFeats?.some((f) => f.title === "E2E dark mode toggle"), "Admin sees the client's feature request (RLS)")

  // 9. Team chat --------------------------------------------------------------
  const { error: aGenErr } = await admin.from("team_messages").insert({
    sender_id: adminUser.id,
    channel_type: "general",
    body: "Standup at 10am — E2E general message.",
  })
  step(19, aGenErr == null, `Admin posts to #general (${aGenErr?.message ?? "ok"})`)

  const { data: wGen } = await worker
    .from("team_messages")
    .select("body")
    .eq("channel_type", "general")
  step(20, wGen?.some((m) => m.body.includes("E2E general message")), "Worker sees the #general message (RLS)")

  const { error: wProjChatErr } = await worker.from("team_messages").insert({
    sender_id: workerUser.id,
    channel_type: "project",
    project_id: project.id,
    body: "E2E internal note on this project.",
  })
  const { data: aProj } = await admin
    .from("team_messages")
    .select("body")
    .eq("channel_type", "project")
    .eq("project_id", project.id)
  step(
    21,
    wProjChatErr == null && aProj?.some((m) => m.body.includes("E2E internal note")),
    `Worker posts to the project channel + admin sees it (${wProjChatErr?.message ?? "ok"})`
  )

  const { error: aDmErr } = await admin.from("team_messages").insert({
    sender_id: adminUser.id,
    channel_type: "dm",
    dm_peer_id: workerUser.id,
    body: "E2E DM — did you finish the logo work?",
  })
  const { data: wDm } = await worker
    .from("team_messages")
    .select("body")
    .eq("channel_type", "dm")
  step(22, aDmErr == null && wDm?.some((m) => m.body.includes("E2E DM")), `Admin DMs the worker + worker sees it (${aDmErr?.message ?? "ok"})`)

  // 10. Team chat read receipts + notifications --------------------------------
  const { data: wUnread1 } = await worker.rpc("team_unread_counts")
  const dmUnread1 = (wUnread1 ?? []).find((r) => r.channel_key === `dm:${adminUser.id}`)
  step(
    23,
    (dmUnread1?.unread ?? 0) >= 1,
    "Worker's unread count includes the new DM (before reading)"
  )

  const { data: notifs } = await worker
    .from("notifications")
    .select("type, link")
    .eq("user_id", workerUser.id)
  step(
    24,
    (notifs ?? []).some(
      (n) => n.type === "chat" && n.link?.startsWith("/chat?channel=")
    ),
    "Worker received a chat notification for the team message"
  )

  const { data: dmMsg } = await admin
    .from("team_messages")
    .select("read_by")
    .eq("channel_type", "dm")
    .single()
  step(
    25,
    !(dmMsg?.read_by ?? []).includes(workerUser.id),
    "Admin's DM is unread by the worker (empty read_by)"
  )

  const { data: marked } = await worker.rpc("team_messages_mark_read", {
    p_channel_key: `dm:${adminUser.id}`,
  })
  const { data: dmMsg2 } = await admin
    .from("team_messages")
    .select("read_by")
    .eq("channel_type", "dm")
    .single()
  step(
    26,
    (marked ?? 0) >= 1 && (dmMsg2?.read_by ?? []).includes(workerUser.id),
    "Worker marks DM read → admin sees the read receipt (read_by updated)"
  )

  const { data: wUnread2 } = await worker.rpc("team_unread_counts")
  const dmUnread2 = (wUnread2 ?? []).find((r) => r.channel_key === `dm:${adminUser.id}`)
  const genUnread = (wUnread2 ?? []).find((r) => r.channel_key === "general")
  step(
    27,
    (dmUnread2?.unread ?? 0) === 0 && (genUnread?.unread ?? 0) >= 1,
    "Worker's DM unread cleared; #general still unread (per-channel)"
  )

  const { data: cTeamMsgs } = await client
    .from("team_messages")
    .select("id")
  step(28, cTeamMsgs?.length === 0, "Client cannot see team chat (RLS)")

  // 12. Invoice lifecycle (payment recording + client visibility) --------------
  const { data: invoice, error: invErr } = await service
    .from("invoices")
    .insert({
      invoice_number: `E2E-INV-${ts}`,
      client_id: clientRow.id,
      project_id: project.id,
      amount: 1000,
      tax: 0,
      total: 1000,
      status: "pending",
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      items: [{ description: "E2E milestone", quantity: 1, unit_price: 1000 }],
    })
    .select("*")
    .single()
  step(29, invErr == null, `Invoice issued for the client (${invErr?.message ?? "ok"})`)

  const { data: cInv1 } = await client
    .from("invoices")
    .select("total, amount_paid, status")
    .eq("id", invoice.id)
  step(
    30,
    cInv1?.[0]?.total === 1000 &&
      cInv1?.[0]?.amount_paid === 0 &&
      cInv1?.[0]?.status === "pending",
    "Client sees the issued invoice (RLS, amount_paid 0)"
  )

  // Partial payment via GPay
  await service.from("invoice_payments").insert({
    invoice_id: invoice.id,
    amount: 400,
    method: "gpay",
  })
  await service
    .from("invoices")
    .update({ amount_paid: 400, status: "pending", updated_at: new Date().toISOString() })
    .eq("id", invoice.id)
  const { data: cInv2 } = await client
    .from("invoices")
    .select("amount_paid, status")
    .eq("id", invoice.id)
  step(
    31,
    cInv2?.[0]?.amount_paid === 400 && cInv2?.[0]?.status === "pending",
    "Partial payment reflected: client sees amount paid + pending status"
  )

  const { data: cPay1 } = await client
    .from("invoice_payments")
    .select("amount, method")
    .eq("invoice_id", invoice.id)
  step(
    32,
    cPay1?.[0]?.amount === 400 && cPay1?.[0]?.method === "gpay",
    "Client sees the GPay payment with its method (RLS on invoice_payments)"
  )

  // Full payment via Net Banking
  await service.from("invoice_payments").insert({
    invoice_id: invoice.id,
    amount: 600,
    method: "netbanking",
  })
  await service
    .from("invoices")
    .update({
      amount_paid: 1000,
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)
  const { data: cInv3 } = await client
    .from("invoices")
    .select("amount_paid, status")
    .eq("id", invoice.id)
  step(
    33,
    cInv3?.[0]?.amount_paid === 1000 && cInv3?.[0]?.status === "paid",
    "Full payment reflected: client sees the invoice marked paid"
  )

  const { data: cPay2 } = await client
    .from("invoice_payments")
    .select("amount, method")
    .eq("invoice_id", invoice.id)
    .order("created_at", { ascending: true })
  const methods = (cPay2 ?? [])
    .map((p) => `${p.method}:${p.amount}`)
    .sort()
    .join(",")
  step(
    34,
    methods === "gpay:400,netbanking:600",
    "Client sees the full payment history across methods (cash/gpay/netbanking)"
  )

  // 13. Cleanup ---------------------------------------------------------------
  await worker.storage.from("chat-attachments").remove([workerPath, clientPath])
  await client.storage.from("chat-attachments").remove([workerPath, clientPath])

  const tables = [
    "document_requests",
    "project_documents",
    "project_tasks",
    "feature_requests",
    "project_messages",
    "project_assignments",
    "team_messages",
    "invoices",
  ]
  for (const table of tables) {
    await service.from(table).delete().eq("project_id", project.id)
  }
  await service.from("projects").delete().eq("id", project.id)
  await service.auth.admin.deleteUser(clientUser.id)
  await service.auth.admin.deleteUser(workerUser.id)
  await service.auth.admin.deleteUser(adminUser.id)

  const [{ data: leftProjects }, { data: leftClients }, { data: leftMsgs }] =
    await Promise.all([
      service.from("projects").select("id").eq("name", projectName),
      service.from("clients").select("id").eq("user_id", clientUser.id),
      service.from("project_messages").select("id").eq("project_id", project.id),
    ])
  step(
    35,
    leftProjects?.length === 0 && leftClients?.length === 0 && leftMsgs?.length === 0,
    "Cleanup removed all test data"
  )

  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error("FATAL:", err.message)
  process.exit(1)
})
