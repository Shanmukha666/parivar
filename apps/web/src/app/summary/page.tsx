'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import FamilySummaryCard from '../../components/FamilySummaryCard';
import { MessageSquare, RefreshCw, Home, PhoneCall } from 'lucide-react';
import { useStore } from '../../lib/store';
import { fetchTradeDetail, fetchTradeOutcomes, fetchTradePathway, fetchProviders } from '../../lib/api';

export default function SummaryPage() {
  const router = useRouter();
  const { profile } = useStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!profile.selectedTradeId) {
        setLoading(false);
        return;
      }
      try {
        const id = profile.selectedTradeId;
        const dist = profile.district;
        const [trade, outcomes, pathway, providers] = await Promise.all([
          fetchTradeDetail(id),
          fetchTradeOutcomes(id, dist),
          fetchTradePathway(id),
          fetchProviders(dist)
        ]);
        setData({ trade, outcomes, pathway, providers });
      } catch (e) {
        console.error('Failed to load summary data', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile.selectedTradeId, profile.district]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-lg mb-4 flex items-center justify-between">
        <button 
          onClick={() => router.push('/chat')}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm min-h-[48px]"
          aria-label="Resume Chat"
        >
          <MessageSquare size={18} />
          <span>Resume Chat</span>
        </button>

        <button 
          onClick={() => router.push('/trades')}
          className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3.5 py-2 rounded-xl min-h-[48px]"
          aria-label="Change Trade"
        >
          <RefreshCw size={18} />
          <span>Change Trade</span>
        </button>
      </div>

      <div className="w-full max-w-lg mb-6">
        <FamilySummaryCard data={data} loading={loading} />
      </div>

      <div className="w-full max-w-lg flex flex-col gap-3">
        <button 
          onClick={() => router.push('/')}
          className="w-full bg-white text-slate-700 border-2 border-slate-200 font-bold text-base py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm min-h-[48px]"
          aria-label="Back to Start"
        >
          <Home size={20} />
          <span>Back to Start</span>
        </button>
      </div>
    </div>
  );
}

