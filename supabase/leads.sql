-- ============================================================================
-- AgencyOS — CRM leads (replaces the static mock data in lib/data.ts)
-- Run AFTER roles.sql in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================
--   1. leads — a sales pipeline card, owned by a team member
--   2. RLS  — admins (is_team) can do everything; everyone else sees nothing
--   3. Seed — a handful of sample leads so the pipeline isn't empty
-- ============================================================================

create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  company     text not null,
  contact     text not null,
  value       integer not null default 0 check (value >= 0),
  stage       text not null default 'new'
    check (stage in ('new', 'qualified', 'proposal', 'negotiation', 'won')),
  score       integer not null default 0 check (score between 0 and 100),
  source      text,
  owner_id    uuid references public.team_members(id) on delete set null,
  tags        text[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "leads_team_all" on public.leads;
create policy "leads_team_all" on public.leads
  for all to authenticated
  using ( public.is_team() )
  with check ( public.is_team() );

create index if not exists idx_leads_stage on public.leads (stage);
create index if not exists idx_leads_owner on public.leads (owner_id);

-- ---------------------------------------------------------------------------
-- Seed sample leads (owner resolves to a real team member by name if present)
-- ---------------------------------------------------------------------------
insert into public.leads (company, contact, value, stage, score, source, owner_id, tags, updated_at)
select *
from (values
  ('Lumen Health',       'Dr. Elena Ross',  84000,  'negotiation', 92, 'Referral',   'Marcus Webb',  array['Healthcare','Retainer'],        now() - interval '2 hours'),
  ('Vertex Labs',        'Tom Bradley',     128000, 'proposal',    87, 'Inbound',    'Marcus Webb',  array['SaaS','Enterprise'],           now() - interval '5 hours'),
  ('Aria Commerce',      'Nina Patel',      46000,  'qualified',   74, 'LinkedIn',   'Sofia Alvarez', array['E-commerce'],                 now() - interval '1 day'),
  ('Northstar Capital',  'Greg Munoz',      210000, 'negotiation', 95, 'Event',      'Marcus Webb',  array['Fintech','Enterprise'],         now() - interval '3 hours'),
  ('Pixel Forge',        'Amelia Cruz',     32000,  'new',         58, 'Website',    'Sofia Alvarez', array['Startup'],                    now() - interval '20 minutes'),
  ('GreenLeaf',          'Owen Park',       54000,  'new',         61, 'Referral',   'Marcus Webb',  array['Sustainability'],               now() - interval '1 hour'),
  ('Cobalt AI',          'Yuki Tanaka',     176000, 'qualified',   83, 'Inbound',    'Marcus Webb',  array['AI','Enterprise'],              now() - interval '8 hours'),
  ('Harbor Point',       'Lena Fischer',    68000,  'proposal',    79, 'Referral',   'Sofia Alvarez', array['Hospitality'],                 now() - interval '1 day'),
  ('Meridian Group',     'Carl Estevez',    92000,  'won',         100, 'Referral',  'Marcus Webb',  array['Retail','Retainer'],            now() - interval '2 days'),
  ('Solace Media',       'Ruby Adeyemi',    38000,  'won',         100, 'Inbound',    'Sofia Alvarez', array['Media'],                      now() - interval '3 days'),
  ('Bluewave',           'Ian McGregor',    71000,  'qualified',   70, 'Event',      'Marcus Webb',  array['Logistics'],                    now() - interval '6 hours'),
  ('Zenith Studios',     'Farah Khan',      44000,  'proposal',    66, 'LinkedIn',   'Sofia Alvarez', array['Creative'],                    now() - interval '12 hours')
) as seed(company, contact, value, stage, score, source, owner_name, tags, updated_at)
where not exists (select 1 from public.leads limit 1)
on conflict do nothing;
