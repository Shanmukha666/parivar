'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchTrades } from '../../lib/api';
import { useStore } from '../../lib/store';
import ProgressDots from '../../components/ProgressDots';
import { Sparkles, ArrowRight, ShieldCheck, Award } from 'lucide-react';

interface TradeItem {
  id: number;
  name_en: string;
  name_local?: Record<string, string>;
  sector: string;
  nsqf_level: number;
  duration_months: number;
  entry_qualification: string;
  description_simple?: Record<string, string>;
  job_roles?: string[];
}

const tradeIcons: Record<string, string> = {
  Electrician: '⚡',
  Plumber: '🔧',
  Welder: '🔥',
  Fitter: '⚙️',
  'Automobile Mechanic': '🚗',
  'Solar Technician': '🌞',
  'CNC Operator': '💻',
  'Beautician & Wellness': '💇',
  'Tailoring & Fashion': '✂️',
  'Data Entry & CSC Operator': '🖥️',
  'HVAC & AC Technician': '❄️',
  'Mobile Phone Repair Tech': '📱',
};

export default function TradesPage() {
  const router = useRouter();
  const { language, profile, setSelectedTrade } = useStore();
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrades() {
      try {
        const interestsStr = (profile.interests || []).join(',');
        const data = await fetchTrades(profile.district, interestsStr, profile.state);
        if (data && data.length > 0) {
          setTrades(data);
        } else {
          throw new Error('No trades returned');
        }
      } catch (e) {
        // Fallback realistic list
        setTrades([
          {
            id: 1,
            name_en: 'Electrician',
            sector: 'Electrical',
            nsqf_level: 4,
            duration_months: 24,
            entry_qualification: 'Class 10 Pass',
            description_simple: {
              en: 'Install and repair domestic & industrial wiring and motors',
              hi: 'बिजली की वायरिंग और मशीनों की मरम्मत करना',
              te: 'విద్యుత్ వైరింగ్ మరియు యంత్రాలను మరమ్మతు చేయడం',
            },
            job_roles: ['House Wireman', 'Industrial Electrician', 'Maintenance Tech'],
          },
          {
            id: 6,
            name_en: 'Solar Technician',
            sector: 'Green Energy',
            nsqf_level: 4,
            duration_months: 12,
            entry_qualification: 'Class 10 Pass',
            description_simple: {
              en: 'Install rooftop solar systems, batteries and inverters',
              hi: 'छत पर सोलर पैनल और इन्वर्टर लगाना',
              te: 'పైకప్పుపై సోలార్ ప్యానెల్స్ మరియు ఇన్వర్టర్ల ఏర్పాటు',
            },
            job_roles: ['Rooftop Installer', 'PV Maintenance Tech'],
          },
          {
            id: 7,
            name_en: 'CNC Operator',
            sector: 'Manufacturing',
            nsqf_level: 4,
            duration_months: 12,
            entry_qualification: 'Class 10 Pass',
            description_simple: {
              en: 'Operate computer-controlled cutting and machining tools',
              hi: 'कंप्यूटर से चलने वाली मशीनों को संचालित करना',
              te: 'కంప్యూటర్ ఆధారిత యంత్రాలను నడపడం',
            },
            job_roles: ['CNC Milling Operator', 'Machinist'],
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadTrades();
  }, [profile.district, profile.state]);

  const handleSelectTrade = (trade: TradeItem) => {
    setSelectedTrade(trade.id, trade.name_en);
    router.push(`/trades/${trade.id}`);
  };

  return (
    <div className="flex flex-col min-h-screen p-6 bg-slate-50 max-w-xl mx-auto">
      <ProgressDots total={3} current={2} />

      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="text-orange-500" size={26} />
        <div>
          <h1 className="text-2xl font-black text-slate-900">Recommended Pathways</h1>
          <p className="text-xs text-slate-500">
            Selected for {profile.district || 'Warangal'} based on {profile.classPassed || 'Class 10 Pass'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 flex-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 bg-slate-200 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pb-6">
          {trades.map((trade) => {
            const icon = tradeIcons[trade.name_en] || '⚡';
            const localName = trade.name_local?.[language] || '';
            const desc = trade.description_simple?.[language] || trade.description_simple?.en || '';

            return (
              <div
                key={trade.id}
                onClick={() => handleSelectTrade(trade)}
                className="bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-orange-500 cursor-pointer shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-orange-50 rounded-xl group-hover:scale-110 transition-transform">
                      {icon}
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 group-hover:text-orange-600 transition-colors">
                        {trade.name_en} {localName && <span className="text-sm font-semibold text-slate-500">({localName})</span>}
                      </h2>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span>{trade.duration_months} Months</span>
                        <span>•</span>
                        <span>NSQF Level {trade.nsqf_level}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">High Demand</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-orange-500 group-hover:text-white transition-all">
                    <ArrowRight size={18} />
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-2">{desc}</p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    Typical Starting: <strong className="text-orange-600">₹15,000 - ₹20,000/mo</strong>
                  </span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <ShieldCheck size={14} /> 78% Placement
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
