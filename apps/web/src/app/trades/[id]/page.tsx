'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PathwayLadder from '../../../components/PathwayLadder';
import { ArrowLeft, MessageCircle, TrendingUp, Award, MapPin, Building, ShieldCheck } from 'lucide-react';
import { fetchTradeDetail, fetchTradeOutcomes, fetchTradePathway, fetchProviders, patchSession } from '../../../lib/api';
import { useStore } from '../../../lib/store';

export default function TradeDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { language, profile, setSelectedTrade, sessionId } = useStore();
  const tradeId = parseInt(params.id, 10) || 1;

  const [trade, setTrade] = useState<any>(null);
  const [outcomes, setOutcomes] = useState<any>(null);
  const [pathway, setPathway] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [tr, out, pw, prov] = await Promise.all([
          fetchTradeDetail(tradeId).catch(() => null),
          fetchTradeOutcomes(tradeId, profile.district, profile.state).catch(() => null),
          fetchTradePathway(tradeId).catch(() => null),
          fetchProviders(profile.district, profile.state).catch(() => [])
        ]);

        if (tr) {
          setTrade(tr);
          setSelectedTrade(tr.id, tr.name_en);
        } else {
          throw new Error('Trade data is unavailable');
        }

        // Call patchSession if session exists
        if (sessionId) {
          try {
            await patchSession(sessionId, { selected_trade_id: tradeId });
          } catch(e) {
            console.error('Failed to patch session', e);
          }
        }

        setOutcomes(out);
        setPathway(pw);
        setProviders(prov);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tradeId]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 max-w-xl mx-auto">
      {/* Sticky Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 p-6 pt-6 pb-8 text-white relative rounded-b-3xl shadow-md">
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white transition-colors mb-4"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-4xl p-2.5 bg-white/10 backdrop-blur-sm rounded-2xl">⚡</div>
          <div>
            <h1 className="text-2xl font-black">{trade?.name_en || 'Electrician'}</h1>
            <p className="text-white/90 text-xs mt-0.5">
              {trade?.duration_months || 'Not available'} Months • NSQF Level {trade?.nsqf_level || 'Not available'} • {profile.district || 'Adilabad'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 flex-1 space-y-5">
        {/* Verified Local Outcomes Card */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <TrendingUp size={16} className="text-orange-600" />
              <span>Local Outcomes ({profile.district || 'Adilabad'})</span>
            </h2>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
              {outcomes?.is_synthetic ? 'Demo dataset' : outcomes?.verified ? 'Verified' : 'Verification pending'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-100 text-center">
              <div className="text-2xl font-black text-orange-600">{outcomes?.placement_rate != null ? `${outcomes.placement_rate}%` : 'Not available'}</div>
              <div className="text-[11px] text-slate-500 font-semibold">Placement Rate</div>
            </div>
            <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-100 text-center">
              <div className="text-2xl font-black text-orange-600">
                {outcomes?.avg_start_salary_inr != null ? `₹${outcomes.avg_start_salary_inr.toLocaleString()}/mo` : 'Not available'}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold">Starting Salary</div>
            </div>
          </div>

          <div className="text-xs text-slate-600 pt-1">
            After 3 years experience: <strong>{outcomes?.salary_3yr_min != null && outcomes?.salary_3yr_max != null ? `₹${outcomes.salary_3yr_min.toLocaleString()} – ₹${outcomes.salary_3yr_max.toLocaleString()} / month` : 'Not available'}</strong>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-1.5">
            <Award size={13} className="text-blue-500 flex-shrink-0" />
            <span>Scope: {outcomes?.scope_label || 'Verified data unavailable'} ({outcomes?.cohort_year || 'n/a'} batch, {outcomes?.sample_size || 'n/a'} learners)</span>
          </div>
        </section>

        {/* NSQF Progression Pathway Ladder */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="font-bold text-sm text-slate-900">Career Progression & Further Education</h2>
          <p className="text-xs text-slate-500">
            Vocational training offers a step-by-step career ladder with lateral entry options to higher degrees:
          </p>
          <PathwayLadder
            levels={pathway?.steps?.length ? pathway.steps.map((s: any) => ({
                title: `${s.title} (Level ${s.nsqf_level})`,
                duration: s.typical_role || 'Technician',
                salary: s.typical_salary_range,
              })) : []}
          />
        </section>

        {/* Nearest Training Providers */}
        <section className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h2 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
            <Building size={16} className="text-slate-600" />
            <span>Nearest Accredited Centres</span>
          </h2>
          <div className="space-y-2">
            {providers.slice(0, 2).map((p: any, idx: number) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{p.name}</div>
                <div className="text-slate-500 mt-0.5">
                  Type: {p.type} • Fee: {p.fee_inr != null ? `₹${p.fee_inr}` : 'Not available'}
                </div>
              </div>
            ))}
            {providers.length === 0 && <p className="text-sm text-slate-500">No verified centre data is available for this area.</p>}
          </div>
        </section>

        <section className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
          <div className="font-bold flex items-center gap-1.5 text-emerald-800"><ShieldCheck size={16} /> Eligible Schemes</div>
          <p className="mt-1">Scheme eligibility will appear here only when an official or clearly labelled demo record is available.</p>
        </section>
      </div>

      {/* Sticky Bottom Discussion Button */}
      <div className="p-4 bg-white border-t border-slate-200 sticky bottom-0 shadow-lg">
        <button
          onClick={() => router.push('/chat')}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-base py-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-md min-h-[52px] transition-all"
        >
          <MessageCircle size={22} />
          <span>Discuss with Family (AI Counsellor)</span>
        </button>
      </div>
    </div>
  );
}
