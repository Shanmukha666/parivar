-- Complete the family -> queue -> assignment -> contact -> resolution -> close workflow.
alter table if exists public.escalations add column if not exists concern_category text;
alter table if exists public.escalations add column if not exists accepted_at timestamptz;
alter table if exists public.escalations add column if not exists contacted_at timestamptz;
alter table if exists public.escalations add column if not exists closed_at timestamptz;
alter table if exists public.escalations drop constraint if exists escalations_language_check;
alter table if exists public.escalations add constraint escalations_language_check
  check (language in ('en', 'hi', 'te', 'ta'));

create index if not exists escalations_counsellor_status_idx
  on public.escalations(counsellor_id, status, created_at);
create index if not exists escalations_priority_status_idx
  on public.escalations(priority, status, created_at);

drop policy if exists escalations_counsellor_queue_read on public.escalations;
create policy escalations_counsellor_queue_read on public.escalations
  for select to authenticated using (
    public.is_staff('admin')
    or (
      public.is_staff('counsellor')
      and (status = 'new' or counsellor_id = auth.uid())
    )
  );

drop policy if exists escalations_staff_update on public.escalations;
create policy escalations_staff_update on public.escalations
  for update to authenticated
  using (
    public.is_staff('admin')
    or (
      public.is_staff('counsellor')
      and (counsellor_id = auth.uid() or status = 'new')
    )
  )
  with check (
    public.is_staff('admin')
    or counsellor_id = auth.uid()
  );

drop policy if exists contacts_assigned_read on public.escalation_contacts;
create policy contacts_assigned_read on public.escalation_contacts
  for select to authenticated using (
    escalation_id in (
      select id from public.escalations
      where counsellor_id = auth.uid() and status = 'contacted'
    )
    or public.is_staff('admin')
  );
