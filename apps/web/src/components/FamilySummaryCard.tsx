'use client';

import { Share2, Printer, MapPin, Award, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store';

export default function FamilySummaryCard({ data, loading }: { data?: any, loading?: boolean }) {
  const { language, profile } = useStore();

  const tradeName = profile.selectedTradeName || 'Selected trade';
  const district = profile.district || 'your district';
  const state = profile.state || 'your state';

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden max-w-lg mx-auto p-10 text-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-semibold">Loading verified data...</p>
        </div>
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden max-w-lg mx-auto p-10 text-center">
        <p className="text-slate-600 font-semibold">Data not available for your district</p>
      </div>
    );
  }

  const { outcomes, pathway, providers } = data;

  const shareText = `🏠 Parivar Path: Family Career Summary Card for ${tradeName}
📍 Location: ${district}, ${state}
📊 Placement Rate: ${outcomes?.placement_rate || 'N/A'}%
💰 Starting Salary: ₹${outcomes?.avg_starting_salary || 'N/A'}/month
📈 3-Year Earnings: ₹${outcomes?.avg_mid_career_salary || 'N/A'}/month
🏫 Accredited Centre: ${providers?.[0]?.name || 'Not available'}
Explore verified vocational careers together at Parivar Path!`;

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-xl overflow-hidden max-w-lg mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-orange-600 to-amber-600 p-6 text-white text-center">
        <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
          <span>Official Family Summary</span>
        </div>
        <h2 className="text-2xl font-black mb-1">⚡ {tradeName}</h2>
        <p className="text-white/90 text-sm flex items-center justify-center gap-1">
          <MapPin size={16} /> {district}, {state}
        </p>
      </div>

      <div className="p-5 space-y-5 text-slate-800">
        {/* Section 1: Course */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>📘 1. Course Details</span>
          </h3>
          <p className="text-sm text-slate-700 leading-snug">
            <strong>{data?.trade?.duration || '24'} Months</strong> practical hands-on training (NSQF Level {data?.trade?.nsqf_level || '4'}).
          </p>
        </div>

        {/* Section 3: Verified Earnings */}
        <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200">
          <h3 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp size={16} /> 2. Verified Earnings in {district}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm text-center">
              <div className="text-2xl font-black text-orange-600">{outcomes?.placement_rate != null ? `${outcomes.placement_rate}%` : 'N/A'}</div>
              <div className="text-xs text-slate-500 font-medium">Placement / Job Rate</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm text-center">
              <div className="text-2xl font-black text-orange-600">{outcomes?.avg_starting_salary != null ? `₹${outcomes.avg_starting_salary}` : 'N/A'}</div>
              <div className="text-xs text-slate-500 font-medium">Starting Salary / Month</div>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2.5 font-medium">
            After 3 years experience: <strong>{outcomes?.avg_mid_career_salary != null ? `₹${outcomes.avg_mid_career_salary} / month` : 'N/A'}</strong>
          </p>
          <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-semibold">
            <Award size={13} /> Source: {outcomes?.source || 'Not available'} {outcomes?.cohort_year ? `(${outcomes.cohort_year})` : ''}
          </div>
        </div>

        {/* Section 4: Pathway */}
        {pathway && pathway.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>🚀 3. Career Growth Ladder</span>
            </h3>
            <div className="space-y-2 text-xs">
              {pathway.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-white flex items-center justify-center font-bold text-[10px] ${i === pathway.length - 1 ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                    {i + 1}
                  </span>
                  <span><strong>{p.role}</strong> {p.salary_range ? `(${p.salary_range})` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Nearest Centre & Schemes */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>🏫 4. Nearest Centre & Help</span>
          </h3>
          <p className="text-sm font-bold text-slate-900">{providers?.[0]?.name || 'No verified centre available'}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            NCVT Accredited • Course fee covered under PMKVY / State Scholarship.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col gap-2.5">
        <a 
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-3.5 px-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px]"
        >
          <Share2 size={20} />
          <span>Share with Family on WhatsApp</span>
        </a>
        <button 
          onClick={() => window.print()}
          className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all min-h-[48px]"
        >
          <Printer size={18} />
          <span>Download / Print Card</span>
        </button>
      </div>
    </div>
  );
}

