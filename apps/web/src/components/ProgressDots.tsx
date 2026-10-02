export default function ProgressDots({ total, current }: { total: number, current: number }) {
  return (
    <div className="flex justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div 
          key={i} 
          className={`h-2.5 rounded-full transition-all ${
            i === current ? 'w-8 bg-orange-500' : 
            i < current ? 'w-2.5 bg-orange-300' : 'w-2.5 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}
