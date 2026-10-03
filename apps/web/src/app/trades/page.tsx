'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchTrades } from '../../lib/api';
import { useStore } from '../../lib/store';
import ProgressDots from '../../components/ProgressDots';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { EmptyState } from '../../components/ui/EmptyState';

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
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function loadTrades() {
      try {
        setLoadError(false);
        const interestsStr = (profile.interests || []).join(',');
        const data = await fetchTrades(profile.district, interestsStr, profile.state);
        if (data && data.length > 0) {
          setTrades(data);
        } else {
          setTrades([]);
        }
      } catch (e) {
        setTrades([]);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    loadTrades();
  }, [profile.district, profile.state, profile.interests]);

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
            Selected for {profile.district || 'Adilabad'} based on {profile.classPassed || 'Class 10 Pass'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <LoadingSpinner message="Finding verified pathways..." />
        </div>
      ) : loadError ? (
        <ErrorMessage 
          title="Data Unavailable" 
          message="Verified trade data is currently unavailable."
          onRetry={() => window.location.reload()} 
        />
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pb-6">
          {trades.length === 0 ? (
            <EmptyState 
              title="No Pathways Found" 
              description="Verified trade data is unavailable for this profile." 
              icon={<ShieldCheck size={48} />}
            />
          ) : (
            trades.map((trade) => {
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
                    <span className="font-semibold text-slate-500">Select to view verified local outcomes</span>
                    <span className="text-slate-500 font-bold flex items-center gap-1">
                      <ShieldCheck size={14} /> Source shown on detail
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

