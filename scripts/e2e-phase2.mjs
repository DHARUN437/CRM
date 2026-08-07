/**
 * JoyCRM — Phase 2 E2E verification (run with node --env-file=.env.local)
 *
 * Verifies data-integrity behaviour with REAL auth sessions so RLS is enforced:
 *   1. Soft-deleted leads are invisible to team, worker (owner + non-owner), client
 *   2. Soft-deleted clients are invisible to team, worker, client
 *   3. Audit rows (lead.deleted / client.deleted) are written by the triggers
 *   4. Workers can only read/update their own active leads (owner_id)
 *   5. Hard-deleting a lead still writes the Phase 1 audit row (safety net)
 *   6. Company duplicate detection query returns the expected matches
 *   7. Cleanup removes all test data
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
const clientEmail = `e2e.p2.client.${ts}@test.local`
const ownerWorkerEmail = `e2e.p2.owner.${ts}@test.local`
const otherWorkerEmail = `e2e.p2.other.${ts}@test.local`
const adminEmail = `e2e.p2.admin.${ts}@test.local`
const password = "E2eTestPass123!"
const company = `Phase2 Corp ${ts}`

let pass = 0
let fail = 0
function step(n, ok, detail) {
  if (ok) pass++
  else fail++
  console.log(`${ok ? "✅" : "❌"}  ${n}. ${detail}`)
}

async function createUser(email, role, name) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
    user_metadata: { full_name: name },
  })
  if (error) throw new Error(`create ${role}: ${error.message}`)
  return data.user
}

async function ensureRow(table, insert, conflictCol) {
  const { data: existing } = await service
    .from(table)
    .select("id")
    .eq(conflictCol, insert[conflictCol])
    .maybeSingle()
  if (existing) return existing
  const { data, error } = await service
    .from(table)
    .upsert(insert, { onConflict: conflictCol })
    .select("id")
    .single()
  if (error) throw new Error(`${table} row: ${error.message}`)
  return data
}

async function main() {
  console.log("Running Phase 2 data-integrity E2E test...\n")

  const clientUser = await createUser(clientEmail, "client", "P2 Client")
  const ownerWorkerUser = await createUser(ownerWorkerEmail, "worker", "P2 Owner Worker")
  const otherWorkerUser = await createUser(otherWorkerEmail, "worker", "P2 Other Worker")
  const adminUser = await createUser(adminEmail, "team", "P2 Admin")
  console.log("   Created client + 2 workers + admin")

  const clientRow = await ensureRow(
    "clients",
    { user_id: clientUser.id, name: "P2 Client", company, email: clientEmail },
    "user_id"
  )
  const ownerWorkerRow = await ensureRow(
    "team_members",
    { user_id: ownerWorkerUser.id, role: "worker", name: "P2 Owner Worker", email: ownerWorkerEmail },
    "user_id"
  )
  const otherWorkerRow = await ensureRow(
    "team_members",
    { user_id: otherWorkerUser.id, role: "worker", name: "P2 Other Worker", email: otherWorkerEmail },
    "user_id"
  )
  const adminRow = await ensureRow(
    "team_members",
    { user_id: adminUser.id, role: "team", name: "P2 Admin", email: adminEmail },
    "user_id"
  )
  console.log("   Profiles ready")

  // 1. Leads: team creates an active lead owned by ownerWorker -----------------
  const { data: lead, error: leadErr } = await service
    .from("leads")
    .insert({
      company: `LeadCo ${ts}`,
      contact: "P2 Contact",
      value: 50000,
      stage: "new",
      score: 40,
      owner_id: ownerWorkerRow.id,
    })
    .select("id, company")
    .single()
  if (leadErr) throw new Error(`lead create: ${leadErr.message}`)

  const admin = createClient(url, anonKey, { auth: { persistSession: false } })
  const owner = createClient(url, anonKey, { auth: { persistSession: false } })
  const other = createClient(url, anonKey, { auth: { persistSession: false } })
  const client = createClient(url, anonKey, { auth: { persistSession: false } })

  await admin.auth.signInWithPassword({ email: adminEmail, password })
  await owner.auth.signInWithPassword({ email: ownerWorkerEmail, password })
  await other.auth.signInWithPassword({ email: otherWorkerEmail, password })
  await client.auth.signInWithPassword({ email: clientEmail, password })

  const { data: aLead1 } = await admin.from("leads").select("id").eq("id", lead.id)
  const { data: oLead1 } = await owner.from("leads").select("id").eq("id", lead.id)
  const { data: cLead1 } = await client.from("leads").select("id").eq("id", lead.id)
  step(
    1,
    aLead1?.length === 1 && oLead1?.length === 1 && cLead1?.length === 0,
    "Active lead visible to team + owning worker, hidden from client (RLS)"
  )

  // Owner worker can read only their own leads ----------------------------------
  const { data: otherLead, error: otherLeadErr } = await service
    .from("leads")
    .insert({
      company: `OtherLead ${ts}`,
      contact: "Other Contact",
      value: 10000,
      stage: "new",
      owner_id: otherWorkerRow.id,
    })
    .select("id")
    .single()
  if (otherLeadErr) throw new Error(`other lead create: ${otherLeadErr.message}`)

  const { data: oReadOther } = await owner.from("leads").select("id").eq("id", otherLead.id)
  step(2, oReadOther?.length === 0, "Worker cannot read another worker's lead (owner_id RLS)")

  // 2. Soft-delete the owner's lead via owner session ---------------------------
  // RLS rejects a direct UPDATE (the new row must pass SELECT policies, which
  // require deleted_at is null), so soft-deletes run through SECURITY DEFINER
  // RPCs that re-check the role + ownership.
  const { data: softDelRes, error: softDelErr } = await owner.rpc("soft_delete_lead", {
    p_lead_id: lead.id,
  })
  step(3, softDelErr == null && softDelRes === true, `Owner worker soft-deletes their lead (${softDelErr?.message ?? "ok"})`)

  const { data: aLead2 } = await admin.from("leads").select("id").eq("id", lead.id)
  const { data: oLead2 } = await owner.from("leads").select("id").eq("id", lead.id)
  const { data: sLead } = await service.from("leads").select("id").eq("id", lead.id)
  step(
    4,
    aLead2?.length === 0 && oLead2?.length === 0 && sLead?.length === 1,
    "Soft-deleted lead hidden from team AND owner, still present via service role"
  )

  // 3. Audit rows written -------------------------------------------------------
  const { data: leadAudit } = await service
    .from("audit_logs")
    .select("actor_id, action, before, after")
    .eq("entity_type", "lead")
    .eq("entity_id", lead.id)
    .order("created_at", { ascending: false })
    .limit(3)
  const leadDel = (leadAudit ?? []).find((a) => a.action === "lead.deleted")
  step(
    5,
    leadDel != null &&
      leadDel.after?.deleted_at != null &&
      leadDel.before?.company === `LeadCo ${ts}`,
    "lead.deleted audit row written with before/after (soft-delete trigger)"
  )

  // 4. Team soft-deletes a client ----------------------------------------------
  const { data: cSoftRes, error: cSoftErr } = await admin.rpc("soft_delete_client", {
    p_client_id: clientRow.id,
  })
  step(6, cSoftErr == null && cSoftRes === true, `Admin soft-deletes the client (${cSoftErr?.message ?? "ok"})`)

  const { data: aClient } = await admin.from("clients").select("id").eq("id", clientRow.id)
  const { data: cClient } = await client.from("clients").select("id").eq("id", clientRow.id)
  const { data: sClient } = await service.from("clients").select("id").eq("id", clientRow.id)
  step(
    7,
    aClient?.length === 0 && cClient?.length === 0 && sClient?.length === 1,
    "Soft-deleted client hidden from team AND the client, still present via service role"
  )

  const { data: clientAudit } = await service
    .from("audit_logs")
    .select("actor_id, action, before, after")
    .eq("entity_type", "client")
    .eq("entity_id", clientRow.id)
    .order("created_at", { ascending: false })
    .limit(3)
  const clientDel = (clientAudit ?? []).find((a) => a.action === "client.deleted")
  step(
    8,
    clientDel != null &&
      clientDel.after?.deleted_at != null &&
      clientDel.before?.company === company,
    "client.deleted audit row written with before/after (soft-delete trigger)"
  )

  // 5. Phase 1 hard-delete audit trigger still works (safety net) ----------------
  const { data: hardLead, error: hardLeadErr } = await service
    .from("leads")
    .insert({ company: `HardLead ${ts}`, contact: "X", value: 1, stage: "new" })
    .select("id")
    .single()
  if (hardLeadErr) throw new Error(`hard lead create: ${hardLeadErr.message}`)
  const { error: hardDelErr } = await service.from("leads").delete().eq("id", hardLead.id)
  const { data: hardAudit } = await service
    .from("audit_logs")
    .select("action")
    .eq("entity_type", "lead")
    .eq("entity_id", hardLead.id)
  step(
    9,
    hardDelErr == null && (hardAudit ?? []).some((a) => a.action === "lead.deleted"),
    `Hard delete still audited (${hardDelErr?.message ?? "lead.deleted written"})`
  )

  // 6. Duplicate detection query (exact company, case-insensitive, active only) --
  const { data: dupMatches } = await admin
    .from("clients")
    .select("company")
    .ilike("company", company.toUpperCase())
    .limit(5)
  step(
    10,
    (dupMatches ?? []).length === 0,
    "Duplicate detection finds no active client with the deleted company (deleted row excluded)"
  )

  // 7. Worker cannot soft-delete another worker's lead ---------------------------
  const { data: crossDelRes } = await owner.rpc("soft_delete_lead", {
    p_lead_id: otherLead.id,
  })
  const { data: otherAfter } = await service
    .from("leads")
    .select("deleted_at")
    .eq("id", otherLead.id)
    .single()
  step(
    11,
    crossDelRes === false && otherAfter?.deleted_at == null,
    "Worker's cross-worker soft-delete attempt is blocked (RPC returns false, deleted_at untouched)"
  )

  // 8. Restore visibility after removing deleted_at ------------------------------
  const { error: restoreErr } = await service
    .from("leads")
    .update({ deleted_at: null })
    .eq("id", lead.id)
  const { data: aLead3 } = await admin.from("leads").select("id").eq("id", lead.id)
  step(
    12,
    restoreErr == null && aLead3?.length === 1,
    `Restoring deleted_at=null brings the lead back for team (${restoreErr?.message ?? "ok"})`
  )

  // 9. Cleanup -------------------------------------------------------------------
  await service.from("leads").delete().eq("id", otherLead.id)
  await service.from("leads").delete().eq("id", lead.id)
  await service.from("clients").delete().eq("id", clientRow.id)

  const cleanupList = [
    { table: "team_members", key: "user_id", val: ownerWorkerUser.id },
    { table: "team_members", key: "user_id", val: otherWorkerUser.id },
    { table: "team_members", key: "user_id", val: adminUser.id },
  ]
  for (const { table, key, val } of cleanupList) {
    await service.from(table).delete().eq(key, val)
  }
  // Clean audit rows created by this run
  await service
    .from("audit_logs")
    .delete()
    .in("entity_id", [lead.id, clientRow.id, hardLead.id])
  await service.auth.admin.deleteUser(clientUser.id)
  await service.auth.admin.deleteUser(ownerWorkerUser.id)
  await service.auth.admin.deleteUser(otherWorkerUser.id)
  await service.auth.admin.deleteUser(adminUser.id)

  const { data: leftovers } = await service
    .from("leads")
    .select("id")
    .or(`company.eq.LeadCo ${ts},company.eq.OtherLead ${ts},company.eq.HardLead ${ts}`)
  step(13, (leftovers ?? []).length === 0, "Cleanup removed all test leads")

  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error("FATAL:", err.message)
  process.exit(1)
})
