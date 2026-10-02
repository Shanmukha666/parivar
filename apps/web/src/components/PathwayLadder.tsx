'use client';

interface LevelItem {
  title: string;
  duration?: string;
  salary?: string;
  nsqf_level?: number;
}

export default function PathwayLadder({ levels }: { levels: LevelItem[] }) {
  return (
    <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-orange-200">
      {levels.map((lvl, idx) => (
        <div key={idx} className="relative flex items-start gap-3 pl-1">
          <div className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center shadow-sm flex-shrink-0 z-10 mt-0.5">
            {idx + 1}
          </div>
          <div className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs">
            <h4 className="font-bold text-slate-900 text-sm">{lvl.title}</h4>
            {lvl.duration && <p className="text-slate-600 mt-0.5 font-medium">{lvl.duration}</p>}
            {lvl.salary && <p className="text-orange-700 font-bold mt-1">Expected: {lvl.salary}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
