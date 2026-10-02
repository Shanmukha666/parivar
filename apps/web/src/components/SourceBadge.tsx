'use client';

import { ShieldCheck } from 'lucide-react';

interface SourceProps {
  source: string | { name: string; year?: string; verified?: boolean };
  year?: string;
  verified?: boolean;
}

export default function SourceBadge({ source, year = '2024', verified = true }: SourceProps) {
  const name = typeof source === 'string' ? source.replace(/_/g, ' ').toUpperCase() : source.name;
  const yr = typeof source === 'object' && source.year ? source.year : year;
  const isVerified = typeof source === 'object' && source.verified !== undefined ? source.verified : verified;

  return (
    <div className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-800 text-[11px] font-semibold rounded-md border border-blue-200 mt-1 shadow-xs">
      {isVerified && <ShieldCheck size={13} className="text-blue-600" />}
      <span>{name} ({yr})</span>
    </div>
  );
}
