'use client';

import { useState } from 'react';
import { AlertTriangle, MapPin, ShieldAlert, CheckCircle, Info } from 'lucide-react';

interface DistrictMetric {
  district: string;
  state: string;
  session_count: number;
  resistance_index: number | null;
  share_neg_start?: number;
  escalation_rate?: number;
  mean_sentiment?: number;
}

interface DistrictHeatmapProps {
  districts?: DistrictMetric[];
}

export default function DistrictHeatmap({ districts }: DistrictHeatmapProps) {
  const data = districts || [];
  const [selected, setSelected] = useState<DistrictMetric | null>(data.length > 0 ? data[0] : null);

  if (data.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center text-slate-500">
        No data available
      </div>
    );
  }

  const getColorClass = (index: number | null) => {
    if (index === null) return 'bg-slate-100 text-slate-500 border-slate-200';
    if (index >= 65) return 'bg-rose-50 text-rose-700 border-rose-300';
    if (index >= 45) return 'bg-amber-50 text-amber-700 border-amber-300';
    return 'bg-emerald-50 text-emerald-700 border-emerald-300';
  };

  const getPillColor = (index: number | null) => {
    if (index === null) return 'bg-slate-400';
    if (index >= 65) return 'bg-rose-500';
    if (index >= 45) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Visual Resistance Distribution Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {data.map((d) => {
          const isSelected = selected?.district === d.district;
          return (
            <button
              key={d.district}
              onClick={() => setSelected(d)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'ring-2 ring-slate-900 border-transparent shadow-md'
                  : 'hover:border-slate-400'
              } ${getColorClass(d.resistance_index)}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs truncate">{d.district}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${getPillColor(d.resistance_index)}`} />
              </div>
              <div className="text-xl font-black">
                {d.resistance_index !== null ? d.resistance_index.toFixed(1) : 'N/A'}
              </div>
              <div className="text-[10px] opacity-75 truncate">{d.state}</div>
            </button>
          );
        })}
      </div>

      {/* Selected District Details */}
      {selected && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-orange-600" />
              <h4 className="font-bold text-slate-900 text-base">
                {selected.district}, {selected.state}
              </h4>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getColorClass(selected.resistance_index)}`}>
                Resistance Index: {selected.resistance_index !== null ? selected.resistance_index.toFixed(1) : 'Low Sample'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Evaluated across <strong>{selected.session_count}</strong> family counselling sessions.
            </p>
          </div>

          <div className="flex gap-4 text-xs">
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg">
              <span className="text-slate-400 block font-medium">Negative Start Share</span>
              <span className="font-bold text-slate-900 text-sm">
                {selected.share_neg_start !== undefined ? `${Math.round(selected.share_neg_start * 100)}%` : 'N/A'}
              </span>
            </div>
            <div className="bg-white border border-slate-200 px-3 py-2 rounded-lg">
              <span className="text-slate-400 block font-medium">Escalation Rate</span>
              <span className="font-bold text-slate-900 text-sm">
                {selected.escalation_rate !== undefined ? `${Math.round(selected.escalation_rate * 100)}%` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
