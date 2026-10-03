'use client';

import { ShieldCheck } from 'lucide-react';

interface SourceProps {
  source: string | { name: string; year?: string; verified?: boolean; is_synthetic?: boolean; sample_size?: number; scope?: string; verified_on?: string | null };
  year?: string;
  verified?: boolean;
}

export default function SourceBadge({ source, year = 'Not available', verified = false }: SourceProps) {
  const name = typeof source === 'string' ? source.replace(/_/g, ' ').toUpperCase() : source.name;
  const yr = typeof source === 'object' && source.year ? source.year : year;
  const isVerified = typeof source === 'object' && source.verified !== undefined ? source.verified : verified;
  const isSynthetic = typeof source === 'object' && source.is_synthetic;
  const sampleSize = typeof source === 'object' ? source.sample_size : undefined;

  return (
    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 text-[11px] font-semibold rounded-md border border-blue-200 mt-1 shadow-xs">
      {isVerified && <ShieldCheck size={13} className="text-blue-600" />}
      <span>{isSynthetic ? 'Demo dataset · ' : ''}{name} ({yr}){sampleSize ? ` · n=${sampleSize}` : ''}{!isVerified ? ' · verification pending' : ''}</span>
    </div>
  );
}
