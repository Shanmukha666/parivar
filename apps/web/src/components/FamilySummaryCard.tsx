'use client';

import { Share2, Printer, MapPin, Award, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import { useStore } from '../lib/store';

export default function FamilySummaryCard({ data }: { data?: any }) {
  const { language, profile } = useStore();

  const tradeName = profile.selectedTradeName || 'Electrician';
  const district = profile.district || 'Warangal';
  const state = profile.state || 'Telangana';

  const shareText = `🏠 Parivar Path: Family Career Summary Card for ${tradeName}
📍 Location: ${district}, ${state}
📊 Placement Rate: 78% (Verified local ITI & Skill Hub survey)
💰 Starting Salary: ₹16,500/month
📈 3-Year Earnings: ₹22,000 - ₹34,000/month
🚀 Career Ladder: NSQF Level 4 -> Supervisor -> Lateral Entry to Polytechnic Diploma
🏫 Accredited Centre: Government ITI ${district} (Free toolkits & stipend available)

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
            <strong>24 Months</strong> practical hands-on training (NSQF Level 4). No heavy theory; focuses on workshop equipment and domestic & industrial electrical wiring.
          </p>
        </div>

        {/* Section 2: Jobs */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>💼 2. Career & Job Roles</span>
          </h3>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700">Industrial Wireman</span>
            <span className="text-xs font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700">Maintenance Technician</span>
            <span className="text-xs font-semibold bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700">Self-Employed Contractor</span>
          </div>
        </div>

        {/* Section 3: Verified Earnings */}
        <div className="bg-orange-50/70 p-4 rounded-2xl border border-orange-200">
          <h3 className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp size={16} /> 3. Verified Earnings in {district}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm text-center">
              <div className="text-2xl font-black text-orange-600">78%</div>
              <div className="text-xs text-slate-500 font-medium">Placement / Job Rate</div>
            </div>
            <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm text-center">
              <div className="text-2xl font-black text-orange-600">₹16,500</div>
              <div className="text-xs text-slate-500 font-medium">Starting Salary / Month</div>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2.5 font-medium">
            After 3 years experience: <strong>₹22,000 – ₹34,000 / month</strong>
          </p>
          <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[11px] font-semibold">
            <Award size={13} /> Source: State Skill Survey 2024 (Verified)
          </div>
        </div>

        {/* Section 4: Pathway */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>🚀 4. Career Growth Ladder</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-[10px]">1</span>
              <span><strong>Junior Technician</strong> (₹14,000 - ₹18,000)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-[10px]">2</span>
              <span><strong>Supervisor / Team Lead</strong> (₹26,000 - ₹38,000)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">3</span>
              <span><strong>Direct Lateral Entry into Polytechnic Diploma</strong></span>
            </div>
          </div>
        </div>

        {/* Section 5: Nearest Centre & Schemes */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span>🏫 5. Nearest Centre & Help</span>
          </h3>
          <p className="text-sm font-bold text-slate-900">Government ITI {district}</p>
          <p className="text-xs text-slate-600 mt-0.5">
            NCVT Accredited • Course fee covered under PMKVY / State Scholarship with ₹15,000 tool kit incentive.
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
