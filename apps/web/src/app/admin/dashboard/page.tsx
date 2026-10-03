'use client';

import { useEffect, useState } from 'react';
import { fetchAdminMetrics } from '../../../lib/api';

const concerns = [
  ['income_potential', 'Income'],
  ['job_security', 'Job security'],
  ['social_perception_status', 'Social perception'],
  ['safety', 'Safety'],
  ['further_education', 'Further education'],
  ['career_progression', 'Career progression'],
  ['training_quality', 'Training quality'],
  ['migration_location', 'Migration / location'],
  ['family_affordability', 'Family affordability'],
  ['gender_family_concerns', 'Gender / family'],
  ['recognition_of_qualification', 'Qualification recognition'],
  ['other_unknown', 'Other'],
];

function Distribution({ title, values }: { title: string; values?: Record<string, number> }) {
  const entries = Object.entries(values || {});
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">{title}</h2>
      {entries.length ? (
        <div className="mt-4 space-y-3">
          {entries.sort((a, b) => b[1] - a[1]).map(([label, count]) => (
            <div key={label} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-700">{label.replaceAll('_', ' ')}</span>
              <span className="font-bold text-slate-900">{count}</span>
            </div>
          ))}
        </div>
      ) : <p className="mt-4 text-sm text-slate-500">Insufficient data</p>}
    </section>
  );
}

export default function AdminDashboard() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetchAdminMetrics({
      state: filters.state || undefined,
      district: filters.district || undefined,
      language: filters.language || undefined,
      trade_id: filters.trade_id ? Number(filters.trade_id) : undefined,
      provider_id: filters.provider_id ? Number(filters.provider_id) : undefined,
      concern: filters.concern || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
    }).then((data) => {
      if (active) { setMetrics(data); setError(''); }
    }).catch(() => {
      if (active) { setMetrics(null); setError('Unable to load aggregate dashboard data.'); }
    });
    return () => { active = false; };
  }, [filters]);

  const update = (key: string, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const kpis = metrics?.kpis;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6">
      <header className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-700">SIH 26241 administrator view</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">Where and why families need support</h1>
        <p className="mt-2 text-sm text-slate-600">Aggregate counselling data only. No names, phone numbers, transcripts, or household-level records are shown.</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Counselling volume', kpis?.counselling_volume ?? 'Insufficient data'],
          ['Unresolved concerns', kpis?.unresolved_concerns ?? 'Insufficient data'],
          ['Escalation rate', kpis?.escalation_rate_label || 'Insufficient data'],
          ['Concern state change', metrics?.concern_state_change?.label || 'Insufficient data'],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <input type="date" aria-label="Start date" value={filters.start_date || ''} onChange={(e) => update('start_date', e.target.value)} className="border rounded-xl p-3" />
          <input type="date" aria-label="End date" value={filters.end_date || ''} onChange={(e) => update('end_date', e.target.value)} className="border rounded-xl p-3" />
          <input placeholder="State" aria-label="State" value={filters.state || ''} onChange={(e) => update('state', e.target.value)} className="border rounded-xl p-3" />
          <input placeholder="District" aria-label="District" value={filters.district || ''} onChange={(e) => update('district', e.target.value)} className="border rounded-xl p-3" />
          <select aria-label="Language" value={filters.language || ''} onChange={(e) => update('language', e.target.value)} className="border rounded-xl p-3">
            <option value="">All languages</option><option value="en">English</option><option value="hi">Hindi</option><option value="te">Telugu</option><option value="ta">Tamil</option>
          </select>
          <input placeholder="Trade ID" aria-label="Trade ID" inputMode="numeric" value={filters.trade_id || ''} onChange={(e) => update('trade_id', e.target.value)} className="border rounded-xl p-3" />
          <input placeholder="Provider ID" aria-label="Provider ID" inputMode="numeric" value={filters.provider_id || ''} onChange={(e) => update('provider_id', e.target.value)} className="border rounded-xl p-3" />
          <select aria-label="Concern" value={filters.concern || ''} onChange={(e) => update('concern', e.target.value)} className="border rounded-xl p-3">
            <option value="">All concerns</option>{concerns.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </section>

      {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4">{error}</div>}
      {metrics?.insufficient_data && <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4">Insufficient data for the selected filters.</div>}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Distribution title="WHY? Concern distribution" values={metrics?.concern_distribution} />
        <Distribution title="Unresolved concerns by category" values={metrics?.unresolved_concerns_by_category} />
        <Distribution title="WHERE? State / district" values={metrics?.geographic_distribution} />
        <Distribution title="Trade distribution" values={metrics?.trade_distribution} />
        <Distribution title="Language distribution" values={metrics?.language_distribution} />
        <Distribution title="Training provider distribution" values={metrics?.provider_distribution} />
      </section>
    </main>
  );
}
