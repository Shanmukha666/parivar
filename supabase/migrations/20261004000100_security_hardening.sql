-- =====================================================================
-- Security hardening + working counsellor/admin pipeline.
-- Forward-only: apply AFTER 20261002 and 20261003 (corrected).
--
-- Fixes (each one was reproduced with a failing test before this file existed):
--  1. messages_session_read / messages_staff_insert compared e.session_id to ITSELF
--     (unqualified column inside the subquery), so ANY assigned counsellor could read
--     and write EVERY family's chat.
--  2. Families could insert pre-resolved tickets, set priority/SLA, fake
--     family_changed_mind, assign any counsellor, and set contact expiry decades out.
--  3. insert_ai_message() let a family forge messages in the AI's voice.
--  4. Counsellors could neither see nor claim 'new' tickets (RLS), so the queue was empty.
--  5. Admin policies existed but SELECT had been revoked; the admin RPCs the API calls
--     did not exist; nothing ever wrote audit_log.
--  6. Admins could read every raw family chat (privacy: aggregates only).
--  7. No indexes behind RLS predicates; auth.uid() evaluated per row.
--  8. No quotas (unbounded LLM cost), unbounded event/metadata size, duplicate tickets.
--  9. purge_expired_escalation_contacts() executable by anon.
-- 10. outcomes/schemes defaulted is_synthetic=false (unverified data looked real).
-- =====================================================================

create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 0. Role helper with an empty search_path (definer functions must not
--    resolve names through a user-controlled path)
-- ---------------------------------------------------------------------
create or replace function public.is_staff(required_role text default null)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.staff_roles r
    where r.user_id = (select auth.uid())
      and (required_role is null or r.role = required_role)
  )
$$;
revoke execute on function public.is_staff(text) from public, anon;
grant  execute on function public.is_staff(text) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- 1. Cross-table checks as SECURITY DEFINER helpers. They answer one narrow
--    yes/no question, which also prevents policy recursion between
--    sessions <-> escalations <-> messages.
-- ---------------------------------------------------------------------
create or replace function app.owns_session(p_session uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.sessions s
                     where s.id = p_session and s.owner_id = (select auth.uid())) $$;

create or replace function app.owns_escalation(p_escalation bigint) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.escalations e
                     join public.sessions s on s.id = e.session_id
                     where e.id = p_escalation and s.owner_id = (select auth.uid())) $$;

-- A counsellor may claim 'new' tickets for their district (NULL district = all).
create or replace function app.counsellor_may_claim(p_district text) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.staff_roles r
                     where r.user_id = (select auth.uid()) and r.role = 'counsellor'
                       and (r.district is null or r.district = p_district)) $$;

-- Transcript access: tickets assigned to me, or 'new' tickets I may claim (to triage).
create or replace function app.counsellor_can_triage_session(p_session uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_staff('counsellor')
          and exists (select 1 from public.escalations e
                      where e.session_id = p_session
                        and (e.counsellor_id = (select auth.uid())
                             or (e.status = 'new' and app.counsellor_may_claim(e.district)))) $$;

-- Writing as 'counsellor': only on a ticket assigned to me and still open.
create or replace function app.counsellor_on_session(p_session uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_staff('counsellor')
          and exists (select 1 from public.escalations e
                      where e.session_id = p_session
                        and e.counsellor_id = (select auth.uid())
                        and e.status in ('assigned', 'contacted')) $$;

-- Phone numbers: only the counsellor who accepted the ticket, while it is open.
create or replace function app.counsellor_owns_ticket(p_escalation bigint) returns boolean
language sql stable security definer set search_path = ''
as $$ select public.is_staff('counsellor')
          and exists (select 1 from public.escalations e
                      where e.id = p_escalation
                        and e.counsellor_id = (select auth.uid())
                        and e.status in ('assigned', 'contacted')) $$;

revoke execute on function app.owns_session(uuid), app.owns_escalation(bigint),
  app.counsellor_may_claim(text), app.counsellor_can_triage_session(uuid),
  app.counsellor_on_session(uuid), app.counsellor_owns_ticket(bigint) from public, anon;
grant execute on function app.owns_session(uuid), app.owns_escalation(bigint),
  app.counsellor_may_claim(text), app.counsellor_can_triage_session(uuid),
  app.counsellor_on_session(uuid), app.counsellor_owns_ticket(bigint) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Constraints and defaults
-- ---------------------------------------------------------------------
alter table public.outcomes alter column is_synthetic set default true;   -- unverified until proven
alter table public.schemes  alter column is_synthetic set default true;
alter table public.outcomes drop constraint if exists outcomes_salary_order;
alter table public.outcomes add  constraint outcomes_salary_order
  check (salary_3yr_min is null or salary_3yr_max is null or salary_3yr_min <= salary_3yr_max);
alter table public.providers drop constraint if exists providers_fee_nonneg;
alter table public.providers add  constraint providers_fee_nonneg check (fee_inr is null or fee_inr >= 0);

alter table public.events drop constraint if exists events_type_allowed;
alter table public.events add  constraint events_type_allowed
  check (type in ('trade_viewed', 'summary_viewed', 'summary_shared', 'voice_used'));
alter table public.events drop constraint if exists events_metadata_small;
alter table public.events add  constraint events_metadata_small check (pg_column_size(metadata) <= 2048);

alter table public.escalations drop constraint if exists escalations_slot_len;
alter table public.escalations add  constraint escalations_slot_len check (callback_slot is null or char_length(callback_slot) <= 60);
alter table public.escalations drop constraint if exists escalations_note_len;
alter table public.escalations add  constraint escalations_note_len check (resolution_note is null or char_length(resolution_note) <= 1000);

-- ---------------------------------------------------------------------
-- 3. Indexes behind every RLS predicate and the open-ticket rule
-- ---------------------------------------------------------------------
create index if not exists sessions_owner_idx          on public.sessions (owner_id, created_at desc);
create index if not exists escalations_session_idx     on public.escalations (session_id);
create index if not exists escalations_counsellor_idx  on public.escalations (counsellor_id) where counsellor_id is not null;
create index if not exists escalations_district_new_idx on public.escalations (district, created_at) where status = 'new';
create index if not exists messages_created_idx        on public.messages (created_at);
create index if not exists analysis_category_idx       on public.message_analysis (objection_category);
-- One open ticket per session: stops queue flooding and duplicate callbacks.
create unique index if not exists escalations_one_open_per_session
  on public.escalations (session_id) where status in ('new', 'assigned', 'contacted');

-- ---------------------------------------------------------------------
-- 4. Triggers
--    Normalisers are SECURITY INVOKER on purpose: current_user is then the real
--    caller ('authenticated'), while service_role and the definer RPCs below
--    (current_user = owner) are trusted.
-- ---------------------------------------------------------------------
create or replace function app.escalation_normalize() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  new.status := 'new';
  new.counsellor_id := null;
  new.accepted_at := null;
  new.resolved_at := null;
  new.resolution_note := null;
  new.family_changed_mind := null;
  if new.priority not in ('normal', 'high') then new.priority := 'normal'; end if;   -- 'urgent' is server-only
  new.sla_due_at := now() + case when new.priority = 'high' then interval '4 hours' else interval '24 hours' end;
  select s.lang, s.district into new.language, new.district
    from public.sessions s where s.id = new.session_id;
  return new;
end $$;
drop trigger if exists escalation_normalize on public.escalations;
create trigger escalation_normalize before insert on public.escalations
  for each row execute function app.escalation_normalize();

create or replace function app.escalation_guard() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then return new; end if;
  if new.status is distinct from old.status then
    if not (
         (old.status = 'new'      and new.status = 'assigned')
      or (old.status = 'assigned' and new.status in ('contacted', 'resolved', 'closed_no_response'))
      or (old.status = 'contacted' and new.status in ('resolved', 'closed_no_response'))
      or public.is_staff('admin')
    ) then
      raise exception 'illegal status transition % -> %', old.status, new.status using errcode = '23514';
    end if;
    if new.status = 'assigned' then
      if not public.is_staff('admin') then new.counsellor_id := (select auth.uid()); end if;
      new.accepted_at := now();
    end if;
    if new.status in ('resolved', 'closed_no_response') then new.resolved_at := now(); end if;
  end if;
  return new;
end $$;
drop trigger if exists escalation_guard on public.escalations;
create trigger escalation_guard before update on public.escalations
  for each row execute function app.escalation_guard();

create or replace function app.escalation_audit() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, entity, entity_id, action)
    values ((select auth.uid()), 'escalations', new.id::text, 'created:' || new.priority);
  elsif new.status is distinct from old.status then
    insert into public.audit_log (actor_id, entity, entity_id, action)
    values ((select auth.uid()), 'escalations', new.id::text, 'status:' || old.status || '->' || new.status);
  end if;
  return null;
end $$;
drop trigger if exists escalation_audit on public.escalations;
create trigger escalation_audit after insert or update on public.escalations
  for each row execute function app.escalation_audit();

create or replace function app.contact_normalize() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if current_user = 'authenticated' then new.expires_at := now() + interval '30 days'; end if;
  return new;
end $$;
drop trigger if exists contact_normalize on public.escalation_contacts;
create trigger contact_normalize before insert on public.escalation_contacts
  for each row execute function app.contact_normalize();

-- Cost / abuse limits enforced in the database so every client path is covered.
create or replace function app.message_quota() returns trigger
language plpgsql set search_path = ''
as $$
declare used integer;
begin
  if current_user = 'authenticated' and new.speaker in ('learner', 'parent') then
    select count(*) into used
      from public.messages m join public.sessions s on s.id = m.session_id
     where s.owner_id = (select auth.uid())
       and m.speaker in ('learner', 'parent')
       and m.created_at > now() - interval '1 day';
    if used >= 100 then
      raise exception 'daily_message_quota' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists message_quota on public.messages;
create trigger message_quota before insert on public.messages
  for each row execute function app.message_quota();

create or replace function app.session_quota() returns trigger
language plpgsql set search_path = ''
as $$
declare used integer;
begin
  if current_user = 'authenticated' then
    select count(*) into used from public.sessions
     where owner_id = (select auth.uid()) and created_at > now() - interval '1 day';
    if used >= 5 then
      raise exception 'daily_session_quota' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists session_quota on public.sessions;
create trigger session_quota before insert on public.sessions
  for each row execute function app.session_quota();

-- ---------------------------------------------------------------------
-- 5. Row Level Security, rewritten (initplan-friendly and correctly scoped)
-- ---------------------------------------------------------------------
drop policy if exists sessions_owner_read   on public.sessions;
drop policy if exists sessions_owner_insert on public.sessions;
drop policy if exists sessions_owner_update on public.sessions;
drop policy if exists sessions_owner_delete on public.sessions;
drop policy if exists messages_session_read on public.messages;
drop policy if exists messages_family_insert on public.messages;
drop policy if exists messages_staff_insert on public.messages;
drop policy if exists analysis_staff_read   on public.message_analysis;
drop policy if exists escalations_owner_read   on public.escalations;
drop policy if exists escalations_owner_insert on public.escalations;
drop policy if exists escalations_staff_update on public.escalations;
drop policy if exists events_owner_insert on public.events;
drop policy if exists events_owner_read   on public.events;
drop policy if exists contacts_owner_insert on public.escalation_contacts;
drop policy if exists contacts_assigned_read on public.escalation_contacts;
drop policy if exists audit_admin_read on public.audit_log;

-- sessions: owner full control; counsellors may read sessions they can triage. Admins: none.
create policy sessions_owner_read on public.sessions for select to authenticated
  using (owner_id = (select auth.uid()));
create policy sessions_owner_insert on public.sessions for insert to authenticated
  with check (owner_id = (select auth.uid()) and consent);
create policy sessions_owner_update on public.sessions for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy sessions_owner_delete on public.sessions for delete to authenticated
  using (owner_id = (select auth.uid()));
create policy sessions_counsellor_triage on public.sessions for select to authenticated
  using (app.counsellor_can_triage_session(id));

-- messages: NOTE every column in a subquery is table-qualified inside the helpers.
create policy messages_owner_read on public.messages for select to authenticated
  using (app.owns_session(session_id));
create policy messages_counsellor_read on public.messages for select to authenticated
  using (app.counsellor_can_triage_session(session_id));
create policy messages_family_insert on public.messages for insert to authenticated
  with check (speaker in ('learner', 'parent') and app.owns_session(session_id));
create policy messages_counsellor_insert on public.messages for insert to authenticated
  with check (speaker = 'counsellor' and app.counsellor_on_session(session_id));

-- message_analysis: service role and admin RPCs only (no policy = deny).

-- escalations
create policy escalations_owner_read on public.escalations for select to authenticated
  using (app.owns_session(session_id));
create policy escalations_counsellor_read on public.escalations for select to authenticated
  using (public.is_staff('counsellor')
         and (counsellor_id = (select auth.uid())
              or (status = 'new' and app.counsellor_may_claim(district))));
create policy escalations_admin_read on public.escalations for select to authenticated
  using (public.is_staff('admin'));
create policy escalations_owner_insert on public.escalations for insert to authenticated
  with check (app.owns_session(session_id));       -- values are normalised by trigger
create policy escalations_counsellor_update on public.escalations for update to authenticated
  using (public.is_staff('counsellor')
         and (counsellor_id = (select auth.uid())
              or (status = 'new' and app.counsellor_may_claim(district))))
  with check (public.is_staff('counsellor') and counsellor_id = (select auth.uid()));
create policy escalations_admin_update on public.escalations for update to authenticated
  using (public.is_staff('admin')) with check (public.is_staff('admin'));

-- events
create policy events_owner_insert on public.events for insert to authenticated
  with check (app.owns_session(session_id));
create policy events_owner_read on public.events for select to authenticated
  using (app.owns_session(session_id));

-- contacts
create policy contacts_owner_insert on public.escalation_contacts for insert to authenticated
  with check (app.owns_escalation(escalation_id));
create policy contacts_counsellor_read on public.escalation_contacts for select to authenticated
  using (app.counsellor_owns_ticket(escalation_id));

-- audit
create policy audit_admin_read on public.audit_log for select to authenticated
  using (public.is_staff('admin'));

-- ---------------------------------------------------------------------
-- 6. Privileges (defence in depth on top of RLS)
-- ---------------------------------------------------------------------
revoke insert, update, delete on public.districts, public.trades, public.providers, public.outcomes,
  public.pathways, public.schemes, public.stories, public.staff_roles from authenticated;
revoke all on public.districts, public.trades, public.providers, public.outcomes,
  public.pathways, public.schemes, public.stories from anon;
grant select on public.districts, public.trades, public.providers, public.outcomes,
  public.pathways, public.schemes, public.stories to anon;

revoke update on public.sessions from authenticated;
grant  update (selected_trade_id, lang) on public.sessions to authenticated;
revoke update on public.escalations from authenticated;
grant  update (status, counsellor_id, resolution_note, family_changed_mind) on public.escalations to authenticated;
revoke update, delete on public.messages, public.events, public.escalation_contacts from authenticated;
revoke all on public.message_analysis from anon, authenticated;
grant  select on public.audit_log to authenticated;      -- rows limited to admins by policy
revoke insert, update, delete on public.audit_log from authenticated;

-- ---------------------------------------------------------------------
-- 7. Server-side RPCs (atomic, ownership-checked)
-- ---------------------------------------------------------------------
-- The AI-voice RPC let families forge "AI" messages. The server now inserts them
-- with the service role instead.
drop function if exists public.insert_ai_message(uuid, text, text);

create or replace function public.create_escalation(
  p_session uuid, p_reason text, p_priority text default 'normal',
  p_slot text default null, p_phone text default null, p_phone_consent boolean default false)
returns bigint
language plpgsql security definer set search_path = ''
as $$
declare v_id bigint; v_lang text; v_district text; v_priority text;
begin
  if not app.owns_session(p_session) then
    raise exception 'session_not_owned' using errcode = '42501';
  end if;
  if p_reason is null or char_length(p_reason) not between 1 and 1000 then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;
  if p_phone is not null then
    if p_phone !~ '^[6-9][0-9]{9}$' then raise exception 'invalid_phone' using errcode = '22023'; end if;
    if not coalesce(p_phone_consent, false) then raise exception 'phone_consent_required' using errcode = '22023'; end if;
  end if;
  v_priority := case when p_priority = 'high' then 'high' else 'normal' end;
  select s.lang, s.district into v_lang, v_district from public.sessions s where s.id = p_session;

  insert into public.escalations (session_id, reason, status, priority, language, district, callback_slot, sla_due_at)
  values (p_session, p_reason, 'new', v_priority, v_lang, v_district,
          left(coalesce(p_slot, '10:00-18:00 Monday-Saturday'), 60),
          now() + case when v_priority = 'high' then interval '4 hours' else interval '24 hours' end)
  returning id into v_id;

  if p_phone is not null then
    insert into public.escalation_contacts (escalation_id, callback_phone, consented, expires_at)
    values (v_id, p_phone, true, now() + interval '30 days');
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'ticket_already_open' using errcode = '23505';
end $$;

-- Safety-critical path: urgent, 1-hour SLA, and an existing open ticket is upgraded instead of duplicated.
create or replace function public.raise_distress(p_session uuid) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare v_id bigint; v_lang text; v_district text;
begin
  if not app.owns_session(p_session) then
    raise exception 'session_not_owned' using errcode = '42501';
  end if;
  select e.id into v_id from public.escalations e
   where e.session_id = p_session and e.status in ('new', 'assigned', 'contacted') limit 1;
  if v_id is not null then
    update public.escalations set priority = 'urgent',
           sla_due_at = least(coalesce(sla_due_at, now() + interval '1 hour'), now() + interval '1 hour')
     where id = v_id;
  else
    select s.lang, s.district into v_lang, v_district from public.sessions s where s.id = p_session;
    insert into public.escalations (session_id, reason, status, priority, language, district, sla_due_at)
    values (p_session, 'Distress signal detected', 'new', 'urgent', v_lang, v_district, now() + interval '1 hour')
    returning id into v_id;
  end if;
  return v_id;
end $$;

revoke execute on function public.create_escalation(uuid, text, text, text, text, boolean) from public, anon;
revoke execute on function public.raise_distress(uuid) from public, anon;
grant  execute on function public.create_escalation(uuid, text, text, text, text, boolean) to authenticated;
grant  execute on function public.raise_distress(uuid) to authenticated;

-- retention purge: server / cron only (was callable by anon)
revoke execute on function public.purge_expired_escalation_contacts() from public, anon, authenticated;
grant  execute on function public.purge_expired_escalation_contacts() to service_role;

-- ---------------------------------------------------------------------
-- 8. Admin aggregates. Admins never read raw chats. Small groups are suppressed.
--    Output shapes match what the dashboard already reads.
-- ---------------------------------------------------------------------
create or replace function app.session_shift()
returns table (session_id uuid, start_sent numeric, end_sent numeric, n bigint)
language sql stable set search_path = ''
as $$
  with pm as (
    select m.session_id, a.sentiment,
           row_number() over (partition by m.session_id order by m.created_at, m.id) as rn,
           count(*)     over (partition by m.session_id)                              as cnt
    from public.messages m
    join public.message_analysis a on a.message_id = m.id
    where m.speaker in ('parent', 'learner')
  )
  select pm.session_id,
         avg(pm.sentiment) filter (where pm.rn <= 2),
         avg(pm.sentiment) filter (where pm.rn > pm.cnt - 2),
         max(pm.cnt)
  from pm group by pm.session_id
$$;

create or replace function public.admin_kpis(
  p_state text default null, p_district text default null, p_trade_id bigint default null)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare r jsonb;
begin
  if not public.is_staff('admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  with s as (
    select id from public.sessions
    where (p_state is null or lower(state) = lower(p_state))
      and (p_district is null or lower(district) = lower(p_district))
      and (p_trade_id is null or selected_trade_id = p_trade_id)
  ),
  tot as (select count(*) as n from s),
  esc as (select count(distinct e.session_id) as n from public.escalations e join s on s.id = e.session_id),
  ev as (select count(distinct v.session_id) filter (where v.type = 'trade_viewed')   as trades_viewed,
                count(distinct v.session_id) filter (where v.type = 'summary_shared') as summary_shared
         from public.events v join s on s.id = v.session_id),
  shift as (select avg(sh.end_sent - sh.start_sent) as v, count(*) as n
            from app.session_shift() sh join s on s.id = sh.session_id where sh.n >= 4)
  select jsonb_build_object(
    'total_sessions',       (select n from tot),
    'escalation_rate',      coalesce(round((select n from esc)::numeric / nullif((select n from tot), 0), 3), 0),
    -- NULL until 10 sessions have 4+ messages. A real number or nothing, never an invented one.
    'avg_sentiment_shift',  case when (select n from shift) >= 10 then round((select v from shift), 3) end,
    'total_summary_shares', (select summary_shared from ev),
    'funnel', jsonb_build_object(
        'sessions',       (select n from tot),
        'trades_viewed',  (select trades_viewed from ev),
        'summary_shared', (select summary_shared from ev),
        'escalated',      (select n from esc)))
  into r;
  return r;
end $$;

-- Resistance index (0-100, higher = more resistance):
--   0.5 * share of sessions starting negative (first two family messages avg < -0.2)
-- + 0.3 * escalation rate
-- + 0.2 * (1 - sentiment shift / 0.6, clamped to 0..1)
-- Groups with fewer than 10 sessions return NULL.
create or replace function public.admin_district_resistance(p_state text default null)
returns table (
  district text, state text, session_count integer, resistance_index numeric,
  share_neg_start numeric, escalation_rate numeric, mean_sentiment numeric)
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_staff('admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  with s as (select id, state, district from public.sessions where p_state is null or lower(state) = lower(p_state)),
  esc as (select distinct session_id from public.escalations),
  agg as (
    select s.district, s.state, count(*)::integer as n_sessions,
           (count(*) filter (where e.session_id is not null))::numeric / count(*) as esc_rate,
           avg((sh.start_sent < -0.2)::integer) as neg_start,
           avg(sh.end_sent - sh.start_sent) filter (where sh.n >= 4) as shift,
           avg(sh.end_sent) as mean_end
    from s
    left join app.session_shift() sh on sh.session_id = s.id
    left join esc e on e.session_id = s.id
    group by s.district, s.state)
  select a.district, a.state, a.n_sessions,
         case when a.n_sessions < 10 then null else
           round(100 * (0.5 * coalesce(a.neg_start, 0) + 0.3 * a.esc_rate
                      + 0.2 * (1 - least(1, greatest(0, coalesce(a.shift, 0) / 0.6)))), 1) end,
         round(a.neg_start, 3), round(a.esc_rate, 3), round(a.mean_end, 3)
  from agg a order by 4 desc nulls last;
end $$;

-- Returns {"income": 12, "status": 9, ...} counted in sessions; {} below k=10.
create or replace function public.admin_objection_breakdown(p_district text default null)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
#variable_conflict use_column
declare r jsonb; n numeric;
begin
  if not public.is_staff('admin') then raise exception 'forbidden' using errcode = '42501'; end if;
  select count(*) into n from public.sessions
   where p_district is null or lower(district) = lower(p_district);
  if n < 10 then return '{}'::jsonb; end if;
  select coalesce(jsonb_object_agg(c, k), '{}'::jsonb) into r from (
    select a.objection_category as c, count(distinct m.session_id) as k
    from public.message_analysis a
    join public.messages m on m.id = a.message_id
    join public.sessions s on s.id = m.session_id
    where a.objection_category is not null and a.objection_category <> 'none'
      and (p_district is null or lower(s.district) = lower(p_district))
    group by a.objection_category) t;
  return r;
end $$;

revoke execute on function public.admin_kpis(text, text, bigint) from public, anon;
revoke execute on function public.admin_district_resistance(text) from public, anon;
revoke execute on function public.admin_objection_breakdown(text) from public, anon;
grant  execute on function public.admin_kpis(text, text, bigint) to authenticated;
grant  execute on function public.admin_district_resistance(text) to authenticated;
grant  execute on function public.admin_objection_breakdown(text) to authenticated;

-- helper only meant to be called from the definer RPCs above
revoke execute on function app.session_shift() from public, anon, authenticated;
