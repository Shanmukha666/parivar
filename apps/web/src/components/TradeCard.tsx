import { Trade } from '../lib/types';

export default function TradeCard({ trade, onClick }: { trade: Trade, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full text-left bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all mb-4"
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-3xl">
          {trade.icon}
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">{trade.name}</h3>
          <p className="text-gray-500 text-sm">{trade.duration}</p>
        </div>
      </div>
      <p className="text-gray-600 mb-3 line-clamp-2">{trade.description}</p>
      <div className="bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-medium inline-block">
        💰 Expected: {trade.salary}
      </div>
    </button>
  );
}
