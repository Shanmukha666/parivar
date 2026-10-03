-- Synthetic judging dataset. Every record is deliberately marked demo/synthetic.
-- Replace with reviewed MSDE/provider/scheme records before production use.

insert into public.districts (state, name) values
  ('Telangana', 'Hyderabad'),
  ('Telangana', 'Karimnagar'),
  ('Telangana', 'Adilabad')
on conflict do nothing;

insert into public.trades (name_en, name_local, sector, nsqf_level, duration_months, entry_qualification, safety_notes, job_roles, description_simple)
select 'Electrician', '{"te":"ఎలక్ట్రీషియన్"}'::jsonb, 'Electrical', 4, 24, 'Class 10 Pass', 'Use insulated tools and follow workshop safety rules.', '["House Wireman","Maintenance Electrician","Solar Technician"]'::jsonb, '{"en":"Hands-on electrical installation and maintenance","te":"విద్యుత్ అమరికలు మరియు నిర్వహణలో ప్రాక్టికల్ శిక్షణ"}'::jsonb
where not exists (select 1 from public.trades where name_en = 'Electrician');

insert into public.pathways (from_trade_id, step_order, step_title, nsqf_level, next_education, typical_role, typical_salary_range)
select t.id, v.step_order, v.step_title, v.nsqf_level, v.next_education, v.typical_role, v.typical_salary_range
from public.trades t
cross join (values
  (1, 'Certified Electrician', 4, 'Apprenticeship or Polytechnic Diploma', 'Maintenance Electrician', 'Demo range: INR 14,000-20,000/month'),
  (2, 'Senior Technician', 5, 'Advanced Diploma or Supervisor training', 'Electrical Supervisor', 'Demo range: INR 22,000-32,000/month')
) as v(step_order, step_title, nsqf_level, next_education, typical_role, typical_salary_range)
where t.name_en = 'Electrician'
  and not exists (select 1 from public.pathways p where p.from_trade_id = t.id and p.step_order = v.step_order);

update public.pathways
set verification_status = 'pending', is_synthetic = true
where from_trade_id = (select id from public.trades where name_en = 'Electrician');

insert into public.providers (name, type, state, district, accreditation, fee_inr)
values
  ('Demo Government ITI Adilabad', 'Government ITI', 'Telangana', 'Adilabad', 'Demo accreditation - verify before use', 1200),
  ('Demo Government ITI Karimnagar', 'Government ITI', 'Telangana', 'Karimnagar', 'Demo accreditation - verify before use', 1200),
  ('Demo Government ITI Hyderabad', 'Government ITI', 'Telangana', 'Hyderabad', 'Demo accreditation - verify before use', 1500)
on conflict do nothing;

update public.providers
set verified = false, is_synthetic = true
where name like 'Demo %';

insert into public.data_sources (publisher, title, document_reference)
select 'Parivar development team', 'Synthetic development fixture', 'DEMO-SYNTHETIC-2025'
where not exists (
  select 1 from public.data_sources where document_reference = 'DEMO-SYNTHETIC-2025'
);

insert into public.outcome_metrics (
  trade_id, state, district, metric_key, metric_value, unit, year,
  sample_size, source_id, verification_status, data_quality, is_synthetic
)
select o.trade_id, o.state, o.district, v.metric_key, v.metric_value, v.unit,
  o.cohort_year, o.sample_size, s.id, 'pending', 'low', true
from public.outcomes o
join public.data_sources s on s.document_reference = 'DEMO-SYNTHETIC-2025'
cross join lateral (values
  ('placement_rate', o.placement_rate, 'percent'),
  ('starting_earnings', o.avg_start_salary_inr, 'INR/month')
) v(metric_key, metric_value, unit)
where o.is_synthetic = true
  and not exists (
    select 1 from public.outcome_metrics m
    where m.trade_id = o.trade_id and m.district = o.district
      and m.metric_key = v.metric_key and m.is_synthetic
  );

insert into public.outcomes (trade_id, state, district, cohort_year, placement_rate, avg_start_salary_inr, salary_3yr_min, salary_3yr_max, sample_size, source, verified_on, verified, is_synthetic, evidence_url, review_status)
select t.id, 'Telangana', d.name,
  2025,
  case d.name when 'Adilabad' then 68.0 when 'Karimnagar' then 73.0 else 79.0 end,
  case d.name when 'Adilabad' then 14500 when 'Karimnagar' then 16000 else 18000 end,
  case d.name when 'Adilabad' then 22000 when 'Karimnagar' then 24000 else 28000 end,
  case d.name when 'Adilabad' then 30000 when 'Karimnagar' then 34000 else 40000 end,
  case d.name when 'Adilabad' then 32 when 'Karimnagar' then 38 else 45 end,
  'Parivar Path synthetic demo dataset',
  current_date,
  false,
  true,
  'https://www.skillindiadigital.gov.in/',
  'pending_data_review'
from public.trades t
cross join public.districts d
where t.name_en = 'Electrician' and d.state = 'Telangana'
  and not exists (select 1 from public.outcomes o where o.trade_id = t.id and o.district = d.name and o.is_synthetic);

insert into public.schemes (name, state, eligibility, benefit, how_to_apply, official_url, verified, is_synthetic, verified_on)
values
  ('Demo skill training support', 'Telangana', '{"income":"income eligibility must be confirmed","education":"Class 10 or equivalent"}'::jsonb, 'Fee support and training assistance - demo only', 'Check the current state portal with a counsellor.', 'https://www.telangana.gov.in/', false, true, current_date)
on conflict do nothing;
