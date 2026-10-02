'use client';

import { useRouter } from 'next/navigation';
import FamilySummaryCard from '../../components/FamilySummaryCard';
import { MessageSquare, RefreshCw, Home, PhoneCall } from 'lucide-react';
import { useStore } from '../../lib/store';

export default function SummaryPage() {
  const router = useRouter();
  const { profile } = useStore();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-lg mb-4 flex items-center justify-between">
        <button 
          onClick={() => router.push('/chat')}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-sm min-h-[48px]"
        >
          <MessageSquare size={18} />
          <span>Resume Chat</span>
        </button>

        <button 
          onClick={() => router.push('/trades')}
          className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3.5 py-2 rounded-xl min-h-[48px]"
        >
          <RefreshCw size={18} />
          <span>Change Trade</span>
        </button>
      </div>

      <div className="w-full max-w-lg mb-6">
        <FamilySummaryCard />
      </div>

      <div className="w-full max-w-lg flex flex-col gap-3">
        <button 
          onClick={() => router.push('/')}
          className="w-full bg-white text-slate-700 border-2 border-slate-200 font-bold text-base py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm min-h-[48px]"
        >
          <Home size={20} />
          <span>Back to Start</span>
        </button>
      </div>
    </div>
  );
}
